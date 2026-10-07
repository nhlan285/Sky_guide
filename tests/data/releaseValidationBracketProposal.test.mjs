import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { buildReleaseValidationBracketProposal,verifyReleaseValidationBracketHooks } from '../sql/build-release-validation-bracket-proposal.mjs'
import { prepareRuntimeJournalPrivilegeProposal } from '../../src/server/runtimeJournalPrivilegePlan.ts'
import { runtimeJournalPrivilegeBaseline } from '../../src/server/runtimeJournalPrivilegeBaseline.ts'
import { buildReleaseValidationBracketRehearsal,verifyReleaseValidationBracketReceipt } from '../sql/build-release-validation-bracket-rehearsal.mjs'

test('bracket review keeps exact original global checks; cannot claim/reuse success inside a write or across transactions',()=>{
 const p=buildReleaseValidationBracketProposal(),fn=new Map(p.functions.map(f=>[f.name,f]))
 const core=fn.get('validate_release_epoch').sql
 assert.ok(core.includes(p.originalChecks))
 assert.ok(core.includes('clock.write_depth=0 and exists'))
 assert.ok(core.includes('w.transaction_id=tx and w.epoch=clock.epoch'))
 assert.ok(core.includes('if clock.write_depth=0 then\n  insert into sky_private.release_validation_witness'))
 assert.ok(core.indexOf(p.originalChecks)<core.indexOf('insert into sky_private.release_validation_witness'))
 assert.equal(fn.get('validate_release_metadata').definer,false)
 assert.equal(fn.get('validate_release_metadata').args,'')
 assert.equal(fn.get('validate_release_epoch').args,'p_catalog_version text')
 for(const name of ['enter_release_validation_statement','leave_release_validation_statement']){
  const f=fn.get(name);assert.equal(f.args,'');assert.equal(f.result,'trigger');assert.equal(f.definer,true)
  assert.ok(f.sql.includes('perform sky_private.lock_sync_commit_control();'))
  assert.ok(f.sql.includes('epoch=epoch+1'));assert.ok(f.sql.includes("tg_level<>'STATEMENT'"))
  assert.ok(f.sql.includes('clock.writer_xid is distinct from tx'))
 }
 assert.ok(fn.get('enter_release_validation_statement').sql.includes('write_depth=write_depth+1'))
 assert.ok(fn.get('leave_release_validation_statement').sql.includes('write_depth=write_depth-1'))
 assert.ok(fn.get('leave_release_validation_statement').sql.includes('clock.write_depth<=0'))
 for(const f of fn.values())assert.match(f.sql,/set search_path=''/)
 assert.doesNotMatch(core,/set_config|current_query|pg_stat_|execute |exception when/i)
 // These are local source/metadata invariants, not native locking/ACL/cost proof.
})

test('native fixture preparation covers mid-write calls,canonical later changes,UPSERT/rollback and25 creator ACL denials',async()=>{
 const p=await buildReleaseValidationBracketRehearsal(),owner=p.files['release-validation-bracket-owner-fixture.sql'],denial=p.files['release-validation-bracket-creator-denial-fixture.sql']
 assert.equal(p.negativeChecks,7);assert.equal(p.positiveChecks,5);assert.equal(p.deniedChecks,25)
 for(const sql of [owner,denial]){assert.ok(sql.includes('begin isolation level read committed read write;'));assert.ok(sql.endsWith('rollback;\n'));assert.doesNotMatch(sql,/\bcreate (?:table|function|trigger|role)\b|commit;/i)}
 assert.ok(owner.includes('owner_revision=owner_revision+1+coalesce(length(sky_private.validate_release_epoch('))
 assert.ok(owner.includes('Wrong rejection owner'));assert.ok(owner.includes('Failed subtransaction leaked clock/witness'))
 assert.ok(owner.includes('Explicit savepoint leaked clock/witness/data'))
 assert.ok(owner.indexOf("select set_config('sky_guide.bracket_before_frame'")<owner.indexOf('savepoint bracket_boundary;'))
 assert.ok(owner.includes('on conflict(catalog_version,id) do update'))
 assert.ok(denial.includes('with admin false,inherit false,set true granted by'))
 assert.ok(denial.includes('Creator membership baseline changed'))
 assert.equal((denial.match(/exception when insufficient_privilege/g)||[]).length,25)
 assert.doesNotMatch(denial,/password|create role|grant .*to (?:anon|authenticated|service_role)/i)
 const receipt={negative_checks:7,positive_checks:5,release:globalThis.structuredClone(p.release),clock:{singleton:1,epoch:100,write_depth:0,writer_xid:null},witness:{catalog_version:p.version,transaction_id:'1000',epoch:100},transaction_id:'1000'}
 assert.deepEqual(verifyReleaseValidationBracketReceipt(receipt,p),{negativeChecks:7,positiveChecks:5})
 for(const change of [r=>r.negative_checks--,r=>r.release.release_lookup.pop(),r=>r.clock.write_depth=1,r=>r.clock.writer_xid='1000',r=>r.witness.transaction_id='999',r=>r.witness.epoch--]){
  const bad=globalThis.structuredClone(receipt);change(bad);assert.throws(()=>verifyReleaseValidationBracketReceipt(bad,p))
 }
 // Synthetic verifier corruption checks never become actual native receipts.
})

test('foreign helper triggers cannot disappear from source-pinned bracket metadata',()=>{
 const p=buildReleaseValidationBracketProposal(),extra={...p.hooks.find(h=>h.name==='release_validation_write_enter'),table:'release_validation_clock',functionSchema:'public'}
 const actual=[...globalThis.structuredClone(p.hooks),extra]
 // The former namespace filter hid an extra allowlisted-name trigger entirely.
 assert.deepEqual(actual.filter(h=>h.functionSchema==='sky_private'),p.hooks)
 assert.throws(()=>verifyReleaseValidationBracketHooks(actual,p),/Private write bracket coverage changed/)
 const changed=globalThis.structuredClone(p.hooks);changed[0].functionSchema='public'
 assert.throws(()=>verifyReleaseValidationBracketHooks(changed,p),/Private write bracket coverage changed/)
 assert.deepEqual(verifyReleaseValidationBracketHooks(p.hooks.toReversed(),p),{hooks:168})
 const checker=p.files['release-validation-bracket-after-check.sql']
 assert.ok(checker.includes("'functionSchema',fn.nspname"))
 assert.doesNotMatch(checker,/and fn\.nspname='sky_private'/)
})

test('complete review guards old83 metadata plus exact2 owners/3 definers/168 hooks; grants one helper only',()=>{
 const p=buildReleaseValidationBracketProposal(),{files}=p
 assert.equal(files['release-validation-bracket-before-check.sql'],prepareRuntimeJournalPrivilegeProposal().roleCheck+'\n')
 assert.deepEqual(p.counts,{tables:85,functions:40,triggers:323,definers:3})
 assert.equal(p.tables.length,83);assert.equal(p.hooks.length,168)
 for(const table of p.tables){
  assert.equal(p.hooks.filter(h=>h.table===table&&h.type===30).length,1)
  assert.equal(p.hooks.filter(h=>h.table===table&&h.type===28).length,1)
 }
 assert.equal(p.constraints.length,8);assert.equal(p.indexes.length,2);assert.equal(p.columns.length,7)
 const after=files['release-validation-bracket-after-check.sql'],up=files['release-validation-bracket-up.sql'],down=files['release-validation-bracket-down.sql']
 for(const marker of ['Installed physical columns changed','Installed CHECK/FK/UNIQUE definitions changed','Journal CHECK/FK/UNIQUE definitions changed','Runtime policy definitions changed','Runtime column ACL changed','Runtime memberships require scoped rollback/review','Validation definer allowlist changed','Internal validation indexes require source review','Private write bracket coverage changed','Runtime internal column access','Validation helper nonowner ACL changed'])assert.ok(after.includes(marker),marker)
 assert.match(after,/p\.prosecdef and p\.proname not in\('enter_release_validation_statement','leave_release_validation_statement','validate_release_epoch'\)/)
 assert.ok(up.includes("grant execute on function sky_private.validate_release_epoch(text) to sky_guide_sync_writer;"))
 assert.equal((up.match(/\bgrant execute on function/g)||[]).length,1)
 assert.doesNotMatch(up,/\b(?:create role|password|grant select|grant all|alter default privileges|with grant option|disable trigger|commit;|rollback;)\b/i)
 assert.doesNotMatch(down,/cascade|delete from|truncate |drop schema|drop role|delete.*schema_migrations|commit;|rollback;/i)
 assert.ok(up.endsWith(p.emptyAfterGuard))
 assert.ok(up.includes('Clock is not an empty rehearsal baseline'))
 assert.ok(down.includes('cardinality(m_versions) not between 16 and 17'))
 assert.ok(down.includes("m_names[17] is distinct from 'restore_private_release_validation_brackets'"))
 assert.ok(down.includes('drop table sky_private.release_validation_witness;'))
 assert.ok(down.includes('drop table sky_private.release_validation_clock;'))
 assert.ok(down.includes(p.originalChecks))
 assert.equal(runtimeJournalPrivilegeBaseline.functions.find(f=>f.name==='validate_release_metadata').bodyMd5,p.oldBodyMd5)
 assert.equal(readFileSync(new URL('../../supabase/proposals/release_validation_bracket_up.sql',import.meta.url),'utf8'),up)
 assert.equal(readFileSync(new URL('../../supabase/proposals/release_validation_bracket_down.sql',import.meta.url),'utf8'),down)
})

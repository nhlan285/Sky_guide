import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync,readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { URL } from 'node:url'
import { runtimeJournalTablePrivileges,runtimeJournalFunctions,prepareRuntimeJournalPrivilegeProposal,assertRuntimeJournalPrivilegeCatalog } from '../../src/server/runtimeJournalPrivilegePlan.ts'
import { runtimeJournalPrivilegeBaseline,journalTriggerDefinitions,journalSchemaSha256 } from '../../src/server/runtimeJournalPrivilegeBaseline.ts'
import { prepareRuntimePrivilegeProposal } from '../../src/server/runtimePrivilegePlan.ts'
import { runtimePrivilegeBaseline } from '../../src/server/runtimePrivilegeBaseline.ts'
import { nativePrivilegeTriggers } from '../fixtures/runtimePrivilegeTriggers.mjs'
import { buildRuntimeJournalPrivilegeProposal } from '../sql/build-runtime-journal-privilege-proposal.mjs'
import { buildSyncCommitAdapterRehearsal } from '../sql/build-sync-commit-adapter-rehearsal.mjs'
import { verifySyncCommitAdapterRehearsal } from '../sql/verify-sync-commit-adapter-rehearsal.mjs'

const clone=globalThis.structuredClone,hash=(s,algorithm='sha256')=>createHash(algorithm).update(s).digest('hex')
const up=readFileSync(new URL('../../supabase/proposals/sync_commit_journal_up.sql',import.meta.url),'utf8')
function bodies() {
 const m=new Map()
 for(const n of readdirSync(new URL('../../supabase/migrations/',import.meta.url)).sort()) {
  const sql=readFileSync(new URL('../../supabase/migrations/'+n,import.meta.url),'utf8')
  for(const f of sql.matchAll(/create(?: or replace)? function sky_private\.([a-z_0-9]+)\([\s\S]*?\bas \$\$([\s\S]*?)\$\$;/gi))m.set(f[1],f[2])
 }
 for(const f of up.matchAll(/create function sky_private\.([a-z_0-9]+)\([\s\S]*?\bas \$\$([\s\S]*?)\$\$;/gi))m.set(f[1],f[2])
 return m
}
let transcript
const prepared=async()=>transcript??=await buildSyncCommitAdapterRehearsal()

test('old79-owner grant/rollback remain byte-identical; separate83-owner journal excludes generated/control/history writes',()=>{
 const old=prepareRuntimePrivilegeProposal(),p=prepareRuntimeJournalPrivilegeProposal(),by=new Map(p.tables.map(t=>[t.table,t]))
 assert.equal(old.tables.length,79);assert.equal(old.helpers.length,5)
 assert.equal(hash(old.grant),'a287cb55b2e778efeacd17710f1a837728e1760f4474d6a88cb7b3ac30d81bcf')
 assert.equal(hash(old.rollback),'49735785bf0715ced419058f2dd61ad9f434708e0ddb5e1ce3d7db3655c11749')
 assert.equal(p.tables.length,83);assert.equal(p.helpers.length,10);assert.equal(p.policies.length,201)
 assert.equal((p.grant.match(/create policy /g)||[]).length,201)
 assert.deepEqual(by.get('sync_commit_control').insert,[]);assert.deepEqual(by.get('sync_commit_control').update,['active_intent_id'])
 assert.ok(!by.get('sync_commit_intent').insert.includes('target_revision'))
 for(const t of ['sync_commit_intent','sync_commit_applied','sync_commit_receipt']) {
  assert.deepEqual(by.get(t).update,[]);assert.equal(by.get(t).delete,false)
 }
 assert.equal(by.get('sync_commit_control').delete,false)
 p.tables[0].insert.push('unexpected');assert.ok(!runtimeJournalTablePrivileges()[0].insert.includes('unexpected'))
 assert.doesNotMatch(p.grant,/to (?:public|anon|authenticated|service_role)\b|password|with grant option|grant all|on all tables|on all functions|alter default privileges|security definer|grant \w+ to/i)
 assert.doesNotMatch(p.rollback,/delete from|truncate |drop table|drop schema|cascade|pg_terminate_backend/i)
})

test('pinned proposed37 functions/155 trigger fingerprints cover complete invoker helper closure; qualification removes receipt variable ambiguity',()=>{
 assert.equal(hash(up),journalSchemaSha256);assert.equal(Buffer.byteLength(up),19248)
 const funcs=bodies(),baseline=runtimeJournalPrivilegeBaseline
 assert.equal(funcs.size,37);assert.equal(baseline.functions.length,37);assert.equal(baseline.triggers.length,155)
 for(const f of baseline.functions)assert.equal(hash(funcs.get(f.name),'md5'),f.bodyMd5,f.name)
 const reachable=new Set(baseline.triggers.map(t=>t.function)),helpers=new Set(runtimeJournalFunctions.map(f=>f.split('(')[0]))
 for(const n of helpers)reachable.add(n)
 let changed=true
 while(changed){changed=false;for(const n of [...reachable])for(const m of funcs.get(n).matchAll(/sky_private\.([a-z_0-9]+)\s*\(/g))if(funcs.has(m[1])&&!reachable.has(m[1])){reachable.add(m[1]);changed=true}}
 for(const n of reachable)if(baseline.functions.find(f=>f.name===n).result!=='trigger')assert.ok(helpers.has(n),n)
 assert.ok(helpers.has('lock_sync_commit_control'))
 const receipt=funcs.get('validate_sync_commit_receipt')
 assert.doesNotMatch(receipt,/\bwhere revision=/)
 assert.equal((receipt.match(/where a\.revision=i\.target_revision/g)||[]).length,3)
 // Static body/shape proof only: engine parsing, trigger formatting, ACL/RLS
 // execution remain NOT RUN and may reject this predicted metadata.
})

test('expected83-owner catalog guard rejects future objects/security/body/trigger/physical generated-column drift',()=>{
 const b=runtimeJournalPrivilegeBaseline,funcs=bodies(),catalog={tables:clone(b.tables),functions:b.functions.map(f=>({...f,body:funcs.get(f.name),security_definer:false})),
  triggers:[...nativePrivilegeTriggers(),...journalTriggerDefinitions],policies:[]}
 assert.doesNotThrow(()=>assertRuntimeJournalPrivilegeCatalog(catalog))
 for(const change of [c=>c.tables.pop(),c=>c.tables[0].columns.push('extra'),c=>c.tables.find(t=>t.name==='sync_commit_intent').columns.reverse(),
  c=>c.functions.at(-1).body+='changed',c=>c.functions.at(-1).security_definer=true,c=>c.triggers.at(-1).definition+='changed',
  c=>c.policies.push({name:'unexpected'}),c=>c.tables.push({name:'future',columns:['id'],rls:true})]) {
  const bad=clone(catalog);change(bad);assert.throws(()=>assertRuntimeJournalPrivilegeCatalog(bad))
 }
 assert.throws(()=>assertRuntimeJournalPrivilegeCatalog({tables:clone(runtimePrivilegeBaseline.tables),functions:[],triggers:[],policies:[]}))
})

test('review grant/preflight/rollback guard are bounded and conditional on exact definitions/role ACL/policies',()=>{
 const p=prepareRuntimeJournalPrivilegeProposal(),packageFiles=buildRuntimeJournalPrivilegeProposal()
 assert.equal(packageFiles.tables,83);assert.equal(packageFiles.policies,201)
 for(const text of Object.values(packageFiles.files))assert.ok(Buffer.byteLength(text)<=200000)
 const deny=packageFiles.files['runtime-journal-denial-fixture.sql']
 assert.ok(deny.includes('select 8 as denied_checks;'));assert.ok(deny.endsWith('rollback;\n'))
 assert.doesNotMatch(deny,/truncate|create role|grant |commit;/i)
 assert.ok(p.preflight.includes('Private helper definitions changed'))
 assert.ok(p.preflight.includes('Journal physical column definitions changed'))
 assert.ok(p.preflight.includes('pg_get_expr(d.adbin,d.adrelid)'))
 assert.ok(p.roleCheck.includes('Runtime policy definitions changed'))
 assert.ok(p.roleCheck.includes('is distinct from'))
 assert.ok(p.roleCheck.includes('Unexpected nonowner/grant-option ACL'))
 assert.ok(p.roleCheck.includes('has_column_privilege'))
 assert.ok(p.roleCheck.includes('not rolbypassrls'))
 assert.ok(p.roleCheck.includes('Private trigger definitions changed'))
 assert.ok(p.rollback.indexOf('Runtime policy definitions changed')<p.rollback.indexOf('drop policy '))
 assert.ok(p.rollback.includes('Runtime memberships require scoped rollback'))
})

test('actual v2 kernel transcript retains bounded lowering/claim/token/finalizer/receipt, no substituted legacy CAS',async()=>{
 const r=await prepared()
 assert.equal(r.callbacks,39);assert.equal(r.queryChecks,978);assert.equal(r.negativeChecks,6)
 assert.equal(r.rows.length,6);assert.ok(Buffer.byteLength(r.sql)<3000000)
 assert.ok(r.sql.startsWith('begin isolation level read committed read write;'));assert.ok(r.sql.endsWith('rollback;\n'))
 assert.ok(r.sql.includes('with __sg_rows as materialized (select id,format_version,source_id,expected_revision'))
 assert.equal((r.sql.match(/select sky_private\.apply_sync_commit_cas\(/g)||[]).length,5)
 assert.equal((r.sql.match(/select sky_private\.activate_sync_commit_intent\(/g)||[]).length,6)
 assert.equal((r.sql.match(/select sky_private\.settle_sync_commit_intent\(/g)||[]).length,6)
 assert.doesNotMatch(r.sql,/apply_sync_metadata_cas|create (?:table|role|function)|\bgrant /i)
 assert.ok(r.sql.includes('Original COMMIT boundaries are NOT reproduced'))
 const role=await buildSyncCommitAdapterRehearsal({roles:true})
 assert.equal(role.queryChecks,r.queryChecks);assert.deepEqual(role.rows,r.rows)
 assert.equal((role.sql.match(/set local role sky_guide_sync_reader;/g)||[]).length,5)
 assert.equal((role.sql.match(/set local role sky_guide_sync_writer;/g)||[]).length,34)
 assert.ok(role.sql.includes('reset role;'))
})

test('prepared native-output verifier checks whole intents/witness/receipts and rejects incomplete evidence (synthetic only)',async()=>{
 const r=await prepared(),actual={phases:5,callbacks:r.callbacks,query_checks:r.queryChecks,negative_checks:r.negativeChecks,revision:5,intent:r.rows,
  control:[{singleton:1,active_intent_id:null}],applied:r.rows.slice(0,5).map(r=>({intent_id:r.id,revision:r.target_revision,state_digest:r.state_digest})),
  receipts:r.rows.map((r,n)=>({intent_id:r.id,resolution:n<5?'committed':'not_committed'}))}
 await verifySyncCommitAdapterRehearsal(actual)
 for(const change of [a=>a.callbacks--,a=>a.applied.pop(),a=>a.intent[2].next_failures++,a=>a.receipts[5].resolution='committed',a=>a.control[0].active_intent_id=r.rows[5].id]) {
  const bad=clone(actual);change(bad);await assert.rejects(()=>verifySyncCommitAdapterRehearsal(bad))
 }
})

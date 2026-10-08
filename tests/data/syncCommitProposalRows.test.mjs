import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { prepareSyncCommitProposalRow,commitProposalColumns } from '../../src/server/syncCommitProposalRows.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { decodeTables } from '../fixtures/postgresSyncStore.mjs'
import { buildSyncCommitProposalRehearsal } from '../sql/build-sync-commit-proposal-rehearsal.mjs'
import { verifySyncCommitProposalRehearsal } from '../sql/verify-sync-commit-proposal-rehearsal.mjs'

const clone=globalThis.structuredClone,id='12345678-1234-4123-8123-123456789abc'
let sequence
const data=async()=>sequence??=await postgresSyncSequence()
const global=p=>p.initial.sync_acceptance.find(a=>a.revision===p.initial.sync_generation[0].current_acceptance_revision)??null
const prepare=async(p,context=global(p))=>prepareSyncCommitProposalRow(p.sourceId,await decodeTables(p.initial,p.sourceId),p.next,id,context)

test('typed proposal retains each full5-phase own source health and independently owned global acceptance',async()=>{
 const {phases}=await data()
 for(const p of phases) {
  const row=await prepare(p),h=p.tables.sync_generation[0],s=p.tables.sync_source_state.find(s=>s.source_id===p.sourceId)
  const a=p.tables.sync_acceptance.find(a=>a.revision===h.current_acceptance_revision),own=p.tables.sync_acceptance.find(a=>a.revision===s.last_success_revision)
  assert.deepEqual(Object.keys(row),[...commitProposalColumns.sync_commit_intent])
  assert.equal(row.next_failures,s.failures);assert.equal(row.next_health,s.health);assert.equal(row.next_retry_at,s.next_retry_at)
  assert.equal(row.next_success_at,own?.promoted_at??null);assert.equal(row.next_valid_until,own?.valid_until??null)
  for(const field of Object.keys(row).filter(k=>k.startsWith('global_')))assert.equal(row[field],a?.[field.slice(7)]??null,field)
  assert.equal(row.format_version,2);assert.equal(row.expected_revision,p.expected);assert.equal(row.id,id)
 }
})

test('failure global validity is mandatory pinned metadata, never substituted from own source freshness',async()=>{
 const {phases}=await data(),p=clone(phases[2]),context=clone(global(p))
 await assert.rejects(()=>prepare(p,null))
 context.valid_until='2026-10-08T00:00:00Z'
 const row=await prepare(p,context)
 assert.equal(row.next_valid_until,null);assert.equal(row.global_valid_until,context.valid_until)
 const bad=clone(context);bad.content_hash='0'.repeat(64);await assert.rejects(()=>prepare(p,bad))
 const badNext=clone(phases[3]);badNext.next.failures+=1;await assert.rejects(()=>prepare(badNext))
})

test('proposal input bytes and nullability fail closed; detached rows contain no whole candidate/private corpus',async()=>{
 const {phases}=await data(),p=clone(phases[0]),r=await prepare(p)
 p.next.approval.reviewerRef='mutated';assert.notEqual(r.global_reviewer_ref,'mutated')
 p.next.approval.reviewerRef='x'.repeat(32768);await assert.rejects(()=>prepare(p))
 const keys=Object.keys(r);assert.ok(!keys.includes('candidate'));assert.ok(!keys.includes('raw'));assert.ok(!keys.includes('files'))
})

test('prepared rehearsal is bounded DML only, original token precedes writer, missing ACK/race proof stays NOT RUN',async()=>{
 const r=await buildSyncCommitProposalRehearsal()
 assert.equal(r.rows.length,6);assert.ok(r.queryChecks>200);assert.ok(r.negativeChecks>=17)
 assert.ok(r.sql.startsWith('begin;'));assert.ok(r.sql.endsWith('rollback;'));assert.ok(!/create (table|function)|grant |password/i.test(r.sql))
 // Only prepared negative controls retain the old metadata helper (missing
 // marker / mismatched full state); normal5 writers use the journal finalizer.
 assert.equal((r.sql.match(/select sky_private.apply_sync_commit_cas\(/g)??[]).length,7)
 assert.equal((r.sql.match(/select sky_private.apply_sync_metadata_cas\(/g)??[]).length,5)
 for(const row of r.rows.slice(0,5)) {
  const token=r.sql.indexOf(`select sky_private.require_sync_commit_intent('${row.id}'::uuid,'${row.state_digest}')`)
  const apply=r.sql.indexOf(`select sky_private.apply_sync_commit_cas('${row.id}'::uuid,'${row.state_digest}')`)
  assert.ok(token>=0&&apply>token)
 }
 assert.ok(r.sql.includes("'not_committed'"));assert.ok(r.sql.includes('next_failures=next_failures+1'))
})

test('review package remains outside migrations, owner-only invoker design and conservative forensic rollback',()=>{
 const up=readFileSync(new URL('../../supabase/proposals/sync_commit_journal_up.sql',import.meta.url),'utf8'),down=readFileSync(new URL('../../supabase/proposals/sync_commit_journal_down.sql',import.meta.url),'utf8')
 assert.equal((up.match(/create table sky_private\./g)??[]).length,4)
 assert.ok(!/security definer|create policy|\bgrant\b|create extension/i.test(up.replace(/^--.*$/gm,'')))
 assert.ok(up.includes('global_source_id is not null and global_source_id=source_id')) // NULL CHECK cannot allow missing promoted global tuple.
 assert.ok(up.includes('s.failures is distinct from i.next_failures'));assert.ok(up.includes('s.next_retry_at is distinct from i.next_retry_at'))
 assert.ok(up.indexOf('from sky_private.sync_generation where singleton=1 for update')<up.indexOf('from sky_private.sync_commit_control where singleton=1 for update'))
 assert.ok(down.includes('Refuse rollback with pending/forensic history'));assert.ok(!/\b(delete|truncate|cascade)\b/i.test(down.replace(/^--.*$/gm,'')))
 // Structural review checks only, NOT PostgreSQL parsing/ACL/RLS/trigger acceptance.
})

test('native-result verifier rejects incomplete or changed source/global/witness receipts (synthetic validation only)',async()=>{
 const r=await buildSyncCommitProposalRehearsal(),actual={phases:5,query_checks:r.queryChecks,negative_checks:r.negativeChecks,revision:5,
  intent:r.rows.map(r=>({...r,target_revision:r.expected_revision+1})),control:[{singleton:1,active_intent_id:null}],
  applied:r.rows.slice(0,5).map(r=>({intent_id:r.id,revision:r.expected_revision+1,state_digest:r.state_digest})),
  receipts:r.rows.map((r,n)=>({intent_id:r.id,resolution:n<5?'committed':'not_committed'}))}
 await verifySyncCommitProposalRehearsal(actual)
 for(const change of [a=>a.intent[2].next_failures++,a=>a.intent[2].global_valid_until='2026-10-08T00:00:00Z',a=>a.applied.pop(),a=>a.control[0].active_intent_id=id,a=>a.receipts[5].resolution='committed',a=>a.intent[0].extra='private',a=>a.negative_checks=0]){
  const bad=clone(actual);change(bad);await assert.rejects(()=>verifySyncCommitProposalRehearsal(bad))
 }
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSyncCommitAdapterRehearsal } from '../sql/build-sync-commit-adapter-rehearsal.mjs'
import { buildReleaseValidationBracketAdapterConcurrency,verifyReleaseValidationBracketAdapterConcurrency } from '../sql/build-release-validation-bracket-adapter-concurrency.mjs'

test('competing adapter preparation preserves both complete callback transcripts and adds no durable/credential authority',async()=>{
 const original=await buildSyncCommitAdapterRehearsal(),p=await buildReleaseValidationBracketAdapterConcurrency()
 const body=original.sql.slice(original.sql.indexOf('insert into sky_private.source_registry'),original.sql.lastIndexOf(') as rows;\nrollback;\n'))
 for(const sql of [p.a,p.b]){
  assert.ok(sql.includes(body),'Original adapter SQL changed')
  assert.ok(sql.startsWith('begin isolation level read committed read write;'))
  assert.ok(sql.endsWith('rollback;\n'));assert.ok(sql.includes("statement_timeout='30s'"))
  assert.doesNotMatch(sql,/\bcreate |\bgrant |\bcommit;|\bset role |\bpassword\b/i)
  assert.equal((sql.match(/-- Adapter callback /g)||[]).length,39)
  assert.equal((sql.match(/ as rows;/g)||[]).length,1)
 }
 assert.ok(p.a.indexOf('perform sky_private.lock_sync_commit_control();')<p.a.indexOf('pg_catalog.pg_sleep(8)'))
 assert.ok(p.b.includes('Adapter A rollback leaked clock/witness'))
 assert.ok(p.b.includes("'after_rollback_witness'"))
 assert.ok(p.observer.includes('pg_blocking_pids(b.pid) @>array[a.pid]'))
 assert.deepEqual(p.versions,['fixture-release','fixture-release-next'])
 assert.equal(p.callbacks,39);assert.equal(p.queryChecks,978);assert.equal(p.negativeChecks,6)
})

test('full adapter concurrent verifier rejects altered journal, session, witness and rollback receipts',async()=>{
 const p=await buildSyncCommitAdapterRehearsal()
 const empty={singleton:1,epoch:0,write_depth:0,writer_xid:null}
 const adapter=(pid,tx)=>({phases:5,callbacks:39,query_checks:978,negative_checks:6,revision:5,
  intent:p.rows,control:[{singleton:1,active_intent_id:null}],
  applied:p.rows.slice(0,5).map(r=>({intent_id:r.id,revision:r.target_revision,state_digest:r.state_digest})),
  receipts:p.rows.map((r,n)=>({intent_id:r.id,resolution:n<5?'committed':'not_committed'})),
  concurrency:{pid,tx,clock:{...empty,epoch:200},witness:[
   {catalog_version:'fixture-release',transaction_id:tx,epoch:80},
   {catalog_version:'fixture-release-next',transaction_id:tx,epoch:198}]}})
 const a=adapter(100,'101'),b=adapter(110,'102')
 Object.assign(b.concurrency,{a_pid:100,wait_ms:8000,before_clock:empty,before_witness:[],after_rollback_clock:empty,after_rollback_witness:[]})
 const observer={a_pid:100,b_pid:110,observer_pid:120,blocking_pids:[100],wait_type:'Lock',clock:empty}
 const good=await verifyReleaseValidationBracketAdapterConcurrency(a,b,observer)
 assert.equal(good.sessions,3);assert.equal(good.adapterRuns,2);assert.equal(good.queryChecks,978)
 for(const mutate of [
  r=>r.a.receipts[0].resolution='not_committed',r=>r.b.intent[0].state_digest='0'.repeat(64),
  r=>r.b.query_checks--,r=>r.a.concurrency.witness.pop(),
  r=>r.b.concurrency.pid=100,r=>r.observer.observer_pid=110,r=>r.b.concurrency.tx='101',
  r=>r.b.concurrency.witness[0].transaction_id='101',r=>r.a.concurrency.witness[0].epoch=202,
  r=>r.a.concurrency.clock.write_depth=1,r=>r.a.concurrency.clock.writer_xid='101',
  r=>r.b.concurrency.wait_ms=0,r=>r.observer.blocking_pids=[],r=>r.observer.wait_type='Timeout',
  r=>r.b.concurrency.after_rollback_clock.epoch=2,r=>r.b.concurrency.after_rollback_witness.push({catalog_version:'leaked'}),
  r=>r.a.concurrency.extra='unreviewed',r=>r.b.extra='unreviewed']){
  const bad=globalThis.structuredClone({a,b,observer});mutate(bad)
  await assert.rejects(()=>verifyReleaseValidationBracketAdapterConcurrency(bad.a,bad.b,bad.observer))
 }
 // Synthetic receipts exercise verification only; native concurrency is NOT RUN.
})

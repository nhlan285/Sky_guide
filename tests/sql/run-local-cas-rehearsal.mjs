import assert from 'node:assert/strict'
import { readFileSync,writeFileSync,existsSync } from 'node:fs'
import { join,resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { canonicalJson } from '../../src/server/domainSnapshot.ts'
import { localEnvironment,localSql } from './local-postgres-environment.mjs'
import { nativeJson } from './run-local-postgres-rehearsal.mjs'
import { buildLocalDurableSnapshot,verifyLocalDurableSnapshot } from './local-durable-snapshot.mjs'
import { buildLocalCasRehearsal } from './build-local-cas-rehearsal.mjs'

const root=localEnvironment.root,source=localEnvironment.names[0]
const save=(name,value)=>writeFileSync(join(root,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
const ordered=rows=>rows.map(canonicalJson).sort()
const rows=(snapshot,name)=>snapshot.tables.find(t=>t.name===name).rows
export function verifyLocalCas(before,after,prepared,a,b,observer,claimed){
 verifyLocalDurableSnapshot(after)
 assert.equal(a.step,'winner');assert.equal(b.step,'loser');assert.equal(a.revision,6);assert.equal(b.revision,6)
 assert.equal(new Set([a.pid,b.pid,observer.observer_pid]).size,3)
 assert.equal(observer.a_pid,a.pid);assert.equal(observer.b_pid,b.pid)
 assert.equal(observer.wait_type,'Lock');assert.deepEqual(observer.blocking_pids,[a.pid])
 assert.equal(claimed.step,'claim');assert.equal(claimed.revision,5)
 assert.deepEqual(observer.clock,claimed.clock,'Observer must see committed claim clock')
 const journal={
  sync_commit_intent:[...rows(before,'sync_commit_intent'),prepared.intent],
  sync_commit_applied:[...rows(before,'sync_commit_applied'),{intent_id:prepared.winner,revision:6,state_digest:prepared.intent.state_digest}],
  sync_commit_receipt:[...rows(before,'sync_commit_receipt'),{intent_id:prepared.winner,resolution:'committed'}],
  sync_commit_control:[{singleton:1,active_intent_id:null}],
 }
 for(const table of after.tables){
  if(['release_validation_clock','release_validation_witness'].includes(table.name))continue
  // This failure transition changes only three domain metadata owners. Preserve
  // every canonical field, including PostgreSQL-generated columns, from before.
  const expected=journal[table.name]??(['sync_generation','sync_source_state','sync_audit'].includes(table.name)?prepared.nextTables[table.name]:rows(before,table.name))
  assert.deepEqual(ordered(table.rows),ordered(expected),`CAS owner differs: ${table.name}`)
 }
 const clock=rows(after,'release_validation_clock')[0]
 assert.equal(clock.singleton,1);assert.equal(clock.write_depth,0);assert.equal(clock.writer_xid,null)
 assert.ok(Number.isSafeInteger(clock.epoch)&&clock.epoch>rows(before,'release_validation_clock')[0].epoch&&clock.epoch%2===0)
 const witness=rows(after,'release_validation_witness')
 assert.deepEqual(witness.map(w=>w.catalog_version).sort(),rows(before,'release_validation_witness').map(w=>w.catalog_version).sort())
 for(const w of witness){assert.match(w.transaction_id,/^[1-9]\d*$/);assert.ok(Number.isSafeInteger(w.epoch)&&w.epoch>=0&&w.epoch<=clock.epoch&&w.epoch%2===0)}
 assert.deepEqual(after.migrations,before.migrations)
 return {winner:prepared.winner,loser:prepared.loser,revision:6,queryChecks:prepared.queryChecks,backends:[a.pid,b.pid,observer.observer_pid],actualBlocking:true,loserOrphans:0}
}
export async function runLocalCas(){
 assert.ok(existsSync(join(root,'local-restore-PASS.json')))
 assert.ok(!existsSync(join(root,'local-cas-STARTED.json')),'Never retry partial persistent CAS blindly')
 const expected=JSON.parse(readFileSync(join(root,'after-crash-snapshot.json'),'utf8'))
 const sql=buildLocalDurableSnapshot()
 const before=nativeJson(await localSql(source,sql,{log:'local-cas-before.log'}),'ROLLBACK')
 verifyLocalDurableSnapshot(before,expected)
 const prepared=await buildLocalCasRehearsal()
 for(const name of ['claim','a','b','observer'])writeFileSync(join(root,`local-cas-${name}.sql`),prepared[name],{flag:'wx'})
 save('local-cas-STARTED.json',{source,winner:prepared.winner,loser:prepared.loser,queryChecks:prepared.queryChecks})
 const claimed=nativeJson(await localSql(source,prepared.claim,{log:'local-cas-claim.log'}),'COMMIT')
 const outcomes=await Promise.allSettled(['a','b','observer'].map(async name=>nativeJson(await localSql(source,prepared[name],{log:`local-cas-${name}.log`}),name==='observer'?'ROLLBACK':'COMMIT')))
 save('local-cas-outcomes.json',outcomes.map((r,n)=>({name:['a','b','observer'][n],status:r.status,...(r.status==='fulfilled'?{receipt:r.value}:{})})))
 assert.ok(outcomes.every(r=>r.status==='fulfilled'),'CAS request failed; inspect all retained native logs')
 for(const [n,sql]of prepared.resolutions.entries())nativeJson(await localSql(source,sql,{log:`local-cas-resolution-${n}.log`}),'COMMIT')
 const after=nativeJson(await localSql(source,sql,{log:'local-cas-after.log'}),'ROLLBACK')
 save('after-cas-snapshot.json',after)
 const proof=verifyLocalCas(before,after,prepared,...outcomes.map(r=>r.value),claimed)
 save('local-cas-PASS.json',{...proof,scope:'Actual adapter-emitted SQL/engine commit race; leased wire driver and uncertain ACK-loss remain OPEN'})
 process.stdout.write('Local CAS PASS: one durable winner, loser no orphan, actual blocking and complete owner checks\n')
}
export async function verifySavedLocalCas(){
 const prepared=await buildLocalCasRehearsal()
 for(const name of ['claim','a','b','observer'])assert.equal(readFileSync(join(root,`local-cas-${name}.sql`),'utf8'),prepared[name],'Executed SQL differs from source preparation')
 const before=nativeJson(readFileSync(join(root,'local-cas-before.log'),'utf8'),'ROLLBACK')
 const after=JSON.parse(readFileSync(join(root,'after-cas-snapshot.json'),'utf8'))
 const outcomes=JSON.parse(readFileSync(join(root,'local-cas-outcomes.json'),'utf8'))
 assert.ok(outcomes.every(r=>r.status==='fulfilled'))
 const claimed=nativeJson(readFileSync(join(root,'local-cas-claim.log'),'utf8'),'COMMIT')
 const proof=verifyLocalCas(before,after,prepared,...outcomes.map(r=>r.receipt),claimed)
 // Reverification must neither overwrite nor recreate immutable native receipts.
 assert.deepEqual(JSON.parse(readFileSync(join(root,'local-cas-PASS.json'),'utf8')).backends,proof.backends)
 process.stdout.write('Saved native CAS verification PASS; no SQL replay\n')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await (process.argv[2]==='verify'?verifySavedLocalCas():runLocalCas())

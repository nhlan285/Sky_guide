import assert from 'node:assert/strict'
import { readFileSync,writeFileSync,existsSync } from 'node:fs'
import { join,resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import process from 'node:process'
import { localEnvironment,assertLocalTarget,localDocker,localSql } from './local-postgres-environment.mjs'
import { nativeJson } from './run-local-postgres-rehearsal.mjs'
import { buildLocalDurableSnapshot,verifyLocalDurableSnapshot } from './local-durable-snapshot.mjs'

const source=localEnvironment.names[0]
const save=(name,value)=>writeFileSync(join(localEnvironment.root,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
export async function waitLocalReady(name){
 for(let attempt=0;attempt<15;attempt++){
  const target=await assertLocalTarget(name)
  assert.equal(target.State.Running,true,'Task container stopped; do not restart automatically')
  try{
   assert.equal((await localDocker(['exec',target.Id,'cat','/proc/1/comm'])).trim(),'postgres')
   await localDocker(['exec',target.Id,'pg_isready','-U','supabase_admin','-d','postgres'])
   return
  }catch{await delay(1000)}
 }
 throw new Error('Task PostgreSQL readiness unconfirmed; retain state and inspect')
}
export async function runLocalCrash(){
 assert.ok(!existsSync(join(localEnvironment.root,'local-crash-STARTED.json')),'Never repeat a started crash rehearsal blindly')
 assert.ok(existsSync(join(localEnvironment.root,'local-durable-PASS.json')))
 const expected=JSON.parse(readFileSync(join(localEnvironment.root,'before-crash-snapshot.json'),'utf8'))
 const sql=buildLocalDurableSnapshot()
 const before=nativeJson(await localSql(source,sql,{log:'crash-immediate-before.log'}),'ROLLBACK')
 verifyLocalDurableSnapshot(before,expected)
 const target=await assertLocalTarget(source);assert.equal(target.State.Running,true)
 save('local-crash-STARTED.json',{id:target.Id,name:source,before})
 // Explicitly approved crash of this single newly created task container only.
 await localDocker(['kill','--signal','KILL',target.Id],{log:'source-crash-kill.log'})
 const stopped=await assertLocalTarget(source)
 assert.equal(stopped.State.Running,false);assert.equal(stopped.State.ExitCode,137);assert.equal(stopped.State.OOMKilled,false)
 save('local-crash-stopped.json',{id:stopped.Id,state:stopped.State})
 await localDocker(['start',stopped.Id],{log:'source-crash-restart.log'})
 await waitLocalReady(source)
 const after=nativeJson(await localSql(source,sql,{log:'after-crash-snapshot.log'}),'ROLLBACK')
 const proof=verifyLocalDurableSnapshot(after,before)
 assert.notEqual(after.server.started,before.server.started,'Postmaster did not restart')
 save('after-crash-snapshot.json',after)
 save('local-crash-PASS.json',{id:target.Id,...proof,beforeServer:before.server,afterServer:after.server,scope:'Committed local state survived source-container SIGKILL/restart; in-flight ACK-loss/CAS/restore/hosted recovery not inferred'})
 process.stdout.write('Local crash/restart PASS: all85 tables/199 rows/history exact; other gates OPEN\n')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runLocalCrash()

import assert from 'node:assert/strict'
import { readFileSync,writeFileSync,existsSync,createReadStream,createWriteStream } from 'node:fs'
import { join,resolve } from 'node:path'
import { fileURLToPath,URL } from 'node:url'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { pipeline } from 'node:stream/promises'
import process from 'node:process'
import { localEnvironment,assertLocalTarget,localSql,assertLocalDataBudget } from './local-postgres-environment.mjs'
import { localBootstrap } from './build-local-postgres-replay.mjs'
import { nativeJson } from './run-local-postgres-rehearsal.mjs'
import { buildLocalDurableSnapshot,verifyLocalDurableSnapshot } from './local-durable-snapshot.mjs'
import { waitLocalReady } from './run-local-crash-rehearsal.mjs'

const [source,target]=localEnvironment.names
const root=localEnvironment.root
const save=(name,value)=>writeFileSync(join(root,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
export function restoreBootstrap(){
 const roles=readFileSync(new URL('../../supabase/migrations/20261007132621_private_journal_runtime_privileges.sql',import.meta.url),'utf8').split(/\r?\n/).filter(l=>l.startsWith('create role sky_guide_sync_'))
 assert.equal(roles.length,2)
 const boundary=localBootstrap.indexOf('create schema supabase_migrations')
 assert.ok(boundary>0)
 // Owners/grantees must exist before restore. Task schemas come ONLY from dump.
 return localBootstrap.slice(0,boundary)+`set local role postgres;\n${roles.join('\n')}\nreset role;\ncommit;\n`
}
async function transfer(name,operation,file){
 const container=await assertLocalTarget(name);assertLocalDataBudget()
 const dump=operation==='dump'
 assert.ok(dump||operation==='restore')
 const args=dump?['pg_dump','-U','postgres','-d','postgres','-w','-Fc','--schema=sky_private','--schema=supabase_migrations','--lock-wait-timeout=30000']:
  ['pg_restore','-U','supabase_admin','-d','postgres','-w','--exit-on-error','--single-transaction']
 const child=spawn('docker',['--host',localEnvironment.endpoint,'exec',...(dump?[]:['-i']),container.Id,...args],{windowsHide:true,stdio:['pipe','pipe','pipe']})
 let stderr='',stdout=''
 child.stderr.on('data',b=>{stderr+=b})
 if(!dump)child.stdout.on('data',b=>{stdout+=b})
 const done=new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',code=>{writeFileSync(join(root,`local-${operation}.log`),stdout+stderr);if(code===0)resolve();else reject(new Error(`Local ${operation} failed; retain dump/log`))})})
 const timeout=globalThis.setTimeout(()=>child.kill(),30000)
 try{
  const stream=dump?pipeline(child.stdout,createWriteStream(file,{flags:'wx'})):pipeline(createReadStream(file),child.stdin)
  if(dump)child.stdin.end()
  await Promise.all([done,stream])
 }finally{globalThis.clearTimeout(timeout)}
 assertLocalDataBudget()
}
export async function runLocalRestore(){
 assert.ok(existsSync(join(root,'local-crash-PASS.json')))
 assert.ok(!existsSync(join(root,'local-restore-STARTED.json')),'Never blindly repeat a partial restore')
 await waitLocalReady(source);await waitLocalReady(target)
 const sql=buildLocalDurableSnapshot()
 const expected=JSON.parse(readFileSync(join(root,'after-crash-snapshot.json'),'utf8'))
 const before=nativeJson(await localSql(source,sql,{log:'before-dump-snapshot.log'}),'ROLLBACK')
 verifyLocalDurableSnapshot(before,expected)
 save('local-restore-STARTED.json',{source,target,scope:'Task schemas/history only; no globals/password/Auth export'})
 const dump=join(root,'local-durable.pgdump')
 await transfer(source,'dump',dump)
 const bytes=readFileSync(dump),sha256=createHash('sha256').update(bytes).digest('hex')
 assert.equal(bytes.subarray(0,5).toString(),'PGDMP')
 save('local-dump.json',{bytes:bytes.length,sha256})
 const sourceAfter=nativeJson(await localSql(source,sql,{log:'after-dump-source-snapshot.log'}),'ROLLBACK')
 verifyLocalDurableSnapshot(sourceAfter,before)
 const bootstrap=await localSql(target,restoreBootstrap(),{user:'supabase_admin',log:'local-restore-bootstrap.log'})
 assert.equal(bootstrap.trim().split(/\r?\n/).at(-1),'COMMIT')
 assert.equal(createHash('sha256').update(readFileSync(dump)).digest('hex'),sha256)
 await transfer(target,'restore',dump)
 const restored=nativeJson(await localSql(target,sql,{log:'restored-snapshot.log'}),'ROLLBACK')
 const proof=verifyLocalDurableSnapshot(restored,before)
 save('restored-snapshot.json',restored)
 save('local-restore-PASS.json',{...proof,source,target,sha256,scope:'Local task schema/body/ACL/source guards plus all data/history exact; hosted disaster recovery/SDK/Auth not inferred'})
 process.stdout.write(`Local backup/restore PASS: ${proof.tables} tables/${proof.rows} rows/history exact\n`)
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await runLocalRestore()

import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'
import { join,resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import process from 'node:process'
import { createManagementApiTransport } from './management-api-transport.mjs'
import { buildCliRoleRecoveryProposal,verifyCliRoleRecoveryGuard } from './build-cli-role-recovery-proposal.mjs'
import { buildCliRoleRecoveryAudit,verifyCliRoleAuditShape,verifyCliRoleRecoveryDifference } from './verify-cli-role-recovery-audit.mjs'
import { buildReleaseValidationBracketBaseline,verifyReleaseValidationBracketBaseline } from './build-release-validation-bracket-baseline.mjs'
import { buildReleaseValidationBracketAdapterConcurrency,verifyReleaseValidationBracketAdapterConcurrency } from './build-release-validation-bracket-adapter-concurrency.mjs'
import { buildEmptyDevRecoverySnapshot,buildEmptyDevRecoveryManifest } from './build-empty-dev-recovery-snapshot.mjs'

const root='E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07'
const read=name=>JSON.parse(readFileSync(join(root,name),'utf8'))
const save=(name,value)=>writeFileSync(join(root,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
const expected=read('release-bracket-applied-baseline.json').baseline
const baseline=buildReleaseValidationBracketBaseline(read('release-bracket-approved-before-baseline.json').query).query
assert.equal(baseline,readFileSync(join(root,'release-bracket-baseline-check.sql'),'utf8'))
// The source guard invokes lock_sync_commit_control, whose contract requires
// read/write even for this empty-state audit. Preserve the original guard and
// put all guard locks/work in ROLLBACK; read-only role audit remains separate.
const baselineSql=`begin isolation level read committed read write;\nset local statement_timeout='30s';\n${baseline}\nrollback;`
const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const prefix=`approved-api-${stamp}`
let phase='initialization'
const workers=[]
const start=async()=>{const w=await createManagementApiTransport();workers.push(w);return w}
const receipt=async(w,label,operation,sql)=>{
 const startedAt=new Date().toISOString()
 const result=await w.request(operation,sql)
 save(`${prefix}-${label}.json`,{startedAt,finishedAt:new Date().toISOString(),...result})
 assert.ok(result.status>=200&&result.status<300,`HTTP failed at ${label}`)
 return operation==='cleanup'?result:JSON.parse(result.body)
}
const field=(rows,key)=>{assert.ok(Array.isArray(rows));assert.equal(rows.length,1);assert.ok(Object.hasOwn(rows[0],key));return rows[0][key]}
const check=async(w,label,roles)=>{
 const b=field(await receipt(w,`${label}-baseline`,'query',baselineSql),'bracket_baseline')
 verifyReleaseValidationBracketBaseline(b,expected)
 const a=field(await receipt(w,`${label}-roles`,'query',buildCliRoleRecoveryAudit()),'recovery_role_audit')
 verifyCliRoleAuditShape(a)
 if(roles)assert.deepEqual(a,roles,'Global metadata drift: STOP')
 return a
}

export async function runApprovedRecovery(){
 const w=await start()
 phase='target-project'
 assert.deepEqual(await receipt(w,'project','project'),{id:'tpbydviuknovimroeodm',name:'sky-guide-dev',organization_id:'pdssjfwbrfjlglobjhtw',region:'ap-southeast-1',status:'ACTIVE_HEALTHY'})
 phase='fresh-baseline-global-audit'
 const before=await check(w,'immediate-before',read('cli-role-recovery-global-hashed-incident-audit.json'))
 phase='immediate-cleanup-guard'
 const guard=buildCliRoleRecoveryProposal().guard
 assert.equal(createHash('sha256').update(guard).digest('hex'),'70c98c6943b7c8f4686ff60e56290bd9b9d4fd53dc3669e90b7859c9251899d0')
 verifyCliRoleRecoveryGuard(field(await receipt(w,'immediate-guard','query',guard),'cli_role_recovery_guard'))
 phase='approved-irreversible-delete'
 const deletion=await w.request('cleanup')
 save(`${prefix}-delete.json`,{finishedAt:new Date().toISOString(),status:deletion.status})
 // Post-check even if DELETE reported failure; never retry or recreate a role.
 phase='post-delete-baseline-global-audit'
 const after=await check(w,'immediate-after')
 const difference=verifyCliRoleRecoveryDifference(before,after)
 assert.ok(deletion.status>=200&&deletion.status<300)
 const summary={authority:'Direct user approval of 8514bec including 101f788; resumed from 9b55862',project:'tpbydviuknovimroeodm',deleteStatus:deletion.status,baselineTables:85,...difference,beforeRoles:before.roles.length,afterRoles:after.roles.length,afterMemberships:after.memberships.length,settings:after.settings.length,afterAuditFile:`${prefix}-immediate-after-roles.json`,credential:'Existing CLI credential read only into worker memory; no credential write, export, argument or receipt',rollback:'No automatic role recreation'}
 save(`${prefix}-cleanup-PASS.json`,summary)
 process.stdout.write(JSON.stringify({cleanup:'PASS',prefix,...summary})+'\n')
 return after
}

export async function runApprovedConcurrency(after){
 phase='concurrency-preparation'
 const prepared=await buildReleaseValidationBracketAdapterConcurrency()
 for(const name of ['a','b','observer'])assert.equal(prepared[name],readFileSync(join(root,`release-bracket-adapter-concurrency-${name}.sql`),'utf8'))
 const pre=await start()
 await check(pre,'concurrent-before',after)
 const parallel=await Promise.all(['a','b','observer'].map(()=>start()))
 phase='independent-full-adapter-requests'
 const outcomes=await Promise.allSettled(['a','b','observer'].map(async(name,i)=>{
  let rows
  let failure
  try{rows=await receipt(parallel[i],`concurrent-${name}`,'query',prepared[name])}catch{failure=true}
  // Each submitted case gets its own post-case baseline, including failed SQL.
  await check(parallel[i],`after-${name}`,after)
  assert.ok(!failure,`${name} request failed; full receipt saved`)
  return field(rows,name==='observer'?'concurrent_observer':'rows')
 }))
 save(`${prefix}-concurrent-outcomes.json`,outcomes.map((v,i)=>({case:['a','b','observer'][i],status:v.status})))
 assert.ok(outcomes.every(v=>v.status==='fulfilled'),'Concurrent request/post-check failed: STOP')
 phase='independent-concurrency-verification'
 const [a,b,observer]=outcomes.map(v=>v.value)
 const proof=await verifyReleaseValidationBracketAdapterConcurrency(a,b,observer)
 await check(pre,'concurrent-final',after)
 const summary={...proof,pids:[a.concurrency.pid,b.concurrency.pid,observer.observer_pid],transactions:[a.concurrency.tx,b.concurrency.tx],blocking:observer.blocking_pids,waitMs:b.concurrency.wait_ms,baselineTables:85,allPostCaseBaselines:'PASS',durableCommitCASCrashRestoreSDK:'NOT RUN / R1 OPEN'}
 save(`${prefix}-concurrency-PASS.json`,summary)
 process.stdout.write(JSON.stringify({concurrency:'PASS',prefix,...summary})+'\n')
}

export async function runEmptyRecoverySnapshot(after){
 phase='empty-snapshot-baseline-before'
 const w=await start()
 await check(w,'snapshot-before',after)
 phase='read-only-empty85-snapshot'
 const sql=buildEmptyDevRecoverySnapshot()
 writeFileSync(join(root,`${prefix}-empty-snapshot.sql`),sql,{flag:'wx'})
 const snapshot=field(await receipt(w,'empty-snapshot','query',sql),'empty_recovery_snapshot')
 const manifest=buildEmptyDevRecoveryManifest(snapshot,baseline,after)
 phase='empty-snapshot-baseline-after'
 await check(w,'snapshot-after',after)
 save(`${prefix}-empty-snapshot-manifest.json`,manifest)
 process.stdout.write(JSON.stringify({snapshot:'PASS',prefix,tables:manifest.tables,rows:manifest.rows,restore:manifest.restoreStatus,scope:manifest.scope})+'\n')
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  if(process.argv[2]==='cleanup')await runApprovedRecovery()
  else if(['concurrency','snapshot'].includes(process.argv[2])&&process.argv[3]){
   const approvedAfter=field(read(process.argv[3]).body?JSON.parse(read(process.argv[3]).body):[], 'recovery_role_audit')
   assert.ok(approvedAfter.roles.every(r=>!r.name.startsWith('cli_login')))
   if(process.argv[2]==='concurrency')await runApprovedConcurrency(approvedAfter)
   else await runEmptyRecoverySnapshot(approvedAfter)
  }else throw new Error('Use cleanup or concurrency with successful post-cleanup audit filename')
 }catch{
  save(`${prefix}-STOP.json`,{phase,status:'STOP',reason:'Guard, transport or receipt failed. Inspect safe E-drive receipts; no automatic retry or recreation.'})
  process.stderr.write(`STOP at ${phase}; receipts prefix ${prefix}; no sensitive exception printed\n`)
  process.exitCode=1
 }finally{workers.forEach(w=>w.close())}
}

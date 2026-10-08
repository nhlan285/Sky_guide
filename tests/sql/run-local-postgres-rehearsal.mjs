import assert from 'node:assert/strict'
import { readFileSync,writeFileSync,existsSync } from 'node:fs'
import { join,resolve } from 'node:path'
import { fileURLToPath,URL } from 'node:url'
import { createHash } from 'node:crypto'
import process from 'node:process'
import { localEnvironment,assertLocalTarget,localSql,localDocker,assertLocalDataBudget } from './local-postgres-environment.mjs'
import { buildLocalPostgresReplay } from './build-local-postgres-replay.mjs'
import { buildReleaseValidationBracketBaseline,verifyReleaseValidationBracketBaseline } from './build-release-validation-bracket-baseline.mjs'
import { buildLocalDurableAdapter,verifyLocalDurableBoundary } from './build-local-durable-adapter.mjs'
import { verifySyncCommitAdapterRehearsal } from './verify-sync-commit-adapter-rehearsal.mjs'

const source=localEnvironment.names[0]
const approvedRoot='E:/SkyGuideAssets/research/postgres-rehearsal-2026-10-07'
const save=(name,value)=>writeFileSync(join(localEnvironment.root,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'})
const digest=value=>createHash('sha256').update(value).digest('hex')
export function nativeJson(stdout,terminal){
 const lines=stdout.trim().split(/\r?\n/).filter(Boolean)
 assert.equal(lines.at(-1),terminal,'Native transaction terminal acknowledgement missing')
 const rows=lines.filter(l=>l.startsWith('{')).map(l=>JSON.parse(l))
 assert.equal(rows.length,1,'Expected exactly one native JSON receipt')
 return rows[0]
}
export function verifyLocalHistory(actual,prepared=buildLocalPostgresReplay()){
 assert.deepEqual(Object.keys(actual),['migrations'])
 assert.equal(actual.migrations.length,prepared.migrations.length)
 for(const [n,row] of actual.migrations.entries()){
  const expected=prepared.migrations[n]
  assert.equal(row.version,expected.version);assert.equal(row.name,expected.name.slice(15,-4))
  assert.deepEqual(row.statements,[readFileSync(new URL(`../../supabase/migrations/${expected.name}`,import.meta.url),'utf8')])
 }
 return {migrations:16,sourceBytesExact:true}
}
const historySql=`begin isolation level repeatable read read only;
set local statement_timeout='30s';
select jsonb_build_object('migrations',(select jsonb_agg(to_jsonb(r) order by version) from supabase_migrations.schema_migrations r));
commit;`
function baselineSql(){
 const original=JSON.parse(readFileSync(join(approvedRoot,'release-bracket-approved-before-baseline.json'),'utf8')).query
 const query=buildReleaseValidationBracketBaseline(original).query
 assert.equal(query,readFileSync(join(approvedRoot,'release-bracket-baseline-check.sql'),'utf8'),'Reviewed source guard differs: STOP')
 return `begin isolation level read committed read write;\nset local statement_timeout='30s';\n${query}\nrollback;\n`
}
async function preflight(name){
 const target=await assertLocalTarget(name);assertLocalDataBudget()
 assert.equal((await localDocker(['exec',target.Id,'cat','/proc/1/comm'])).trim(),'postgres','Initialization entrypoint still active; observe readiness before retry')
 await localDocker(['exec',target.Id,'pg_isready','-U','supabase_admin','-d','postgres'])
 assert.equal(readFileSync(join(localEnvironment.root,name,'PG_VERSION'),'utf8').trim(),'17','Native E data mount/version missing')
 const raw=await localSql(name,`begin read only;set local statement_timeout='30s';
select jsonb_build_object('actor',current_user,'version',current_setting('server_version_num'),'dataDirectory',current_setting('data_directory'),'superuser',(select rolsuper from pg_roles where rolname=current_user));commit;`,{user:'supabase_admin',log:`${name}-preflight.log`})
 assert.deepEqual(nativeJson(raw,'COMMIT'),{actor:'supabase_admin',version:'170011',dataDirectory:'/var/lib/postgresql/data',superuser:true})
}
export async function initializeLocalSource(){
 assert.ok(!existsSync(join(localEnvironment.root,'local-initialization-PASS.json')),'Initialization already recorded; never replay blindly')
 // Each target's native version and exact E data mount precede schema mutations.
 for(const name of localEnvironment.names)await preflight(name)
 const prepared=buildLocalPostgresReplay()
 const raw=await localSql(source,prepared.bootstrap,{user:'supabase_admin',log:'local-bootstrap.log'})
 assert.equal(raw.trim().split(/\r?\n/).at(-1),'COMMIT')
 for(const migration of prepared.migrations){
  const output=await localSql(source,migration.sql,{log:`local-migration-${migration.version}.log`})
  assert.equal(output.trim().split(/\r?\n/).at(-1),'COMMIT')
  save(`local-migration-${migration.version}.json`,{name:migration.name,sha256:migration.sha256,terminal:'COMMIT'})
 }
 const history=nativeJson(await localSql(source,historySql,{log:'local-history.log'}),'COMMIT')
 verifyLocalHistory(history,prepared)
 const guard=baselineSql()
 const baseline=nativeJson(await localSql(source,guard,{log:'local-initial-baseline.log'}),'ROLLBACK')
 verifyReleaseValidationBracketBaseline(baseline)
 save('local-initialization-PASS.json',{scope:'Local source schema/history only; hosted/SDK/Auth acceptance OPEN',source,migrations:prepared.migrations.map(({name,sha256})=>({name,sha256})),guardSha256:digest(guard),baseline})
}
export async function runLocalDurableAdapter(){
 const initialized=JSON.parse(readFileSync(join(localEnvironment.root,'local-initialization-PASS.json'),'utf8'))
 assert.equal(initialized.source,source)
 assert.ok(!existsSync(join(localEnvironment.root,'local-durable-STARTED.json')),'Never restart a partial durable run; preserve transcripts and inspect state')
 const guard=baselineSql();assert.equal(digest(guard),initialized.guardSha256)
 const baseline=nativeJson(await localSql(source,guard,{log:'local-durable-before-baseline.log'}),'ROLLBACK')
 verifyReleaseValidationBracketBaseline(baseline,initialized.baseline)
 verifyLocalHistory(nativeJson(await localSql(source,historySql,{log:'local-durable-before-history.log'}),'COMMIT'))
 const prepared=await buildLocalDurableAdapter()
 save('local-durable-STARTED.json',{source,scope:prepared.scope,callbacks:39,queryChecks:978,negativeChecks:6})
 const seed=await localSql(source,prepared.seed,{log:'local-durable-seed.log'})
 assert.equal(seed.trim().split(/\r?\n/).at(-1),'COMMIT')
 const receipts=[]
 for(const callback of prepared.callbacks){
  const stdout=await localSql(source,callback.sql,{log:`local-durable-callback-${callback.index}.log`})
  const receipt=verifyLocalDurableBoundary(stdout,callback)
  assert.ok(!receipts.some(r=>r.pid===receipt.pid),'Separate native callback reused a recorded backend: STOP')
  save(`local-durable-callback-${callback.index}.json`,receipt);receipts.push(receipt)
 }
 const final=nativeJson(await localSql(source,prepared.final,{log:'local-durable-final.log'}),'COMMIT')
 const proof=await verifySyncCommitAdapterRehearsal(final)
 verifyLocalHistory(nativeJson(await localSql(source,historySql,{log:'local-durable-after-history.log'}),'COMMIT'))
 save('local-durable-PASS.json',{scope:prepared.scope,...proof,source,receipts,final,hostedState:'Untouched',wireACKLossCASCrashRestoreSDK:'OPEN'})
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const mode=process.argv[2]
 assert.ok(['initialize','durable'].includes(mode),'Use initialize or durable on existing guarded local targets; no automatic Docker setup/repair')
 try{await (mode==='initialize'?initializeLocalSource():runLocalDurableAdapter());process.stdout.write(`Local ${mode} PASS; other R1 acceptance gates remain OPEN\n`)}
 catch{process.stderr.write(`Local ${mode} STOP; inspect retained E transcripts. No retry/recreation/cleanup\n`);process.exitCode=1}
}

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync,readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL } from 'node:url'
import { runtimeTablePrivileges,runtimeFunctions,prepareRuntimePrivilegeProposal,assertRuntimePrivilegeCatalog } from '../../src/server/runtimePrivilegePlan.ts'
import { runtimePrivilegeBaseline } from '../../src/server/runtimePrivilegeBaseline.ts'
import { nativePrivilegeTriggers } from '../fixtures/runtimePrivilegeTriggers.mjs'
import { createPostgresSyncStore } from '../../src/server/postgresSyncStore.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { scriptedDatabase,storeOptions,contract } from '../fixtures/postgresSyncStore.mjs'

function migrationFunctions() {
 const functions=new Map()
 for(const name of readdirSync(new URL('../../supabase/migrations/',import.meta.url)).sort()) {
  const sql=readFileSync(new URL('../../supabase/migrations/'+name,import.meta.url),'utf8')
  for(const m of sql.matchAll(/create(?: or replace)? function sky_private\.([a-z_0-9]+)\([\s\S]*?\bas \$\$([\s\S]*?)\$\$;/gi)) functions.set(m[1],m[2])
 }
 return functions
}

test('explicit79 owners deny root/history delete, control insert, immutable update except4 lock-only columns',()=>{
 const tables=runtimeTablePrivileges(),by=new Map(tables.map(t=>[t.table,t]))
 assert.equal(tables.length,79);assert.equal(tables.filter(t=>t.insert.length).length,78)
 assert.equal(tables.filter(t=>t.delete).length,23);assert.deepEqual(by.get('sync_generation').insert,[])
 assert.equal(tables.filter(t=>t.update.length&&!t.lockOnly).length,9)
 assert.deepEqual(tables.filter(t=>t.lockOnly).map(t=>t.table).sort(),['acquisition_option','field_provenance_field','public_release','sync_acceptance'])
 for(const table of ['item','spirit','season','item_k15','domain_identity','source_registry','provenance','source_crosswalk','alias','tombstone','sync_acceptance','sync_audit','public_release','release_projection','acceptance_graph'])
  assert.equal(by.get(table).delete,false,table)
 for(const table of ['release_projection','acceptance_graph','sync_audit','source_registry','source_crosswalk','alias','tombstone']) assert.deepEqual(by.get(table).update,[])
 assert.deepEqual(by.get('public_release').update,['catalog_version']);assert.deepEqual(by.get('sync_acceptance').update,['revision'])
 tables[0].insert.push('unapproved');assert.ok(!runtimeTablePrivileges()[0].insert.includes('unapproved'))
})

test('proposal grants scoped column writes/RLS, no passwords/platform/future/default privileges; rollback revokes columns',()=>{
 const p=prepareRuntimePrivilegeProposal()
 assert.equal((p.grant.match(/create role /g)||[]).length,2)
 assert.equal((p.grant.match(/nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls/g)||[]).length,2)
 for(const t of p.tables) {
  assert.ok(p.grant.includes(`grant select on sky_private.${t.table} to sky_guide_sync_reader,sky_guide_sync_writer;`))
  if(t.lockOnly) assert.ok(p.grant.includes(`create policy sky_guide_runtime_update on sky_private.${t.table} for update to sky_guide_sync_writer using(true) with check(false);`))
  if(t.insert.length) assert.ok(p.rollback.includes(`revoke insert(${t.insert.join(',')}) on sky_private.${t.table} from sky_guide_sync_writer;`))
  if(t.update.length) assert.ok(p.rollback.includes(`revoke update(${t.update.join(',')}) on sky_private.${t.table} from sky_guide_sync_writer;`))
 }
 assert.equal((p.grant.match(/grant execute on function/g)||[]).length,5)
 assert.ok(!p.grant.includes('grant execute on function sky_private.instant_order_key'))
 assert.doesNotMatch(p.grant,/to (?:public|anon|authenticated|service_role)\b|password|with grant option|grant all|on all tables|on all functions|alter default privileges|security definer|set role|\bcascade\b/i)
 assert.doesNotMatch(p.rollback,/delete from|truncate|drop table|drop schema|cascade|pg_terminate_backend/i)
 assert.ok(p.preflight.includes('md5(pg_get_triggerdef(t.oid))'));assert.ok(p.preflight.includes('Private helper definitions changed'))
 assert.ok(p.preflight.includes('Private nonowner ACL baseline changed'));assert.ok(p.preflight.includes('unnest(col.attacl) acl'))
 assert.ok(p.rollback.includes('Runtime memberships require scoped rollback'))
})

test('pinned27 body hashes match last local migrations; only5 reachable invoker helpers get EXECUTE',()=>{
 const functions=migrationFunctions()
 assert.equal(functions.size,27);assert.equal(runtimePrivilegeBaseline.triggers.length,143)
 for(const f of runtimePrivilegeBaseline.functions) assert.equal(createHash('md5').update(functions.get(f.name)).digest('hex'),f.bodyMd5,f.name)
 const functionNames=new Set(functions.keys()),helpers=new Set(runtimeFunctions.map(s=>s.split('(')[0]))
 const reachable=new Set(['apply_sync_metadata_cas','valid_partial_time','valid_time_range','iso_instant'])
 for(const t of runtimePrivilegeBaseline.triggers) reachable.add(t.function)
 let changed=true
 while(changed) {changed=false;for(const name of [...reachable]) for(const m of functions.get(name).matchAll(/sky_private\.([a-z_0-9]+)\s*\(/g))
  if(functionNames.has(m[1])&&!reachable.has(m[1])) {reachable.add(m[1]);changed=true}}
 for(const name of reachable) {
  const f=runtimePrivilegeBaseline.functions.find(f=>f.name===name)
  if(f.result!=='trigger') assert.ok(helpers.has(name),name)
 }
 assert.ok(!reachable.has('instant_order_key'))
})

test('real5-phase Store SQL is covered by column/DML manifest without blanket table write grants',async()=>{
 const {phases}=await postgresSyncSequence(),by=new Map(runtimeTablePrivileges().map(t=>[t.table,t]))
 let writes=0,cas=0
 for(const phase of phases) {
  const db=scriptedDatabase(phase.initial,{nextTables:phase.tables}),store=createPostgresSyncStore(db,contract,storeOptions)
  assert.equal(await store.compareAndSwap(phase.sourceId,phase.expected,phase.next),true)
  for(const {text} of db.transactions[0].queries) {
   const insert=/^insert into sky_private\.([a-z_0-9]+)\(([^)]+)\)/.exec(text)
   if(insert) {
    const p=by.get(insert[1]);assert.ok(p,insert[1]);for(const c of insert[2].split(',')) assert.ok(p.insert.includes(c),`${insert[1]}.${c}`)
    const assigns=text.includes('do update set ')?text.split('do update set ')[1].split(','):[]
    for(const a of assigns) assert.ok(p.update.includes(a.split('=')[0]),a)
    writes++;continue
   }
   const update=/^update sky_private\.([a-z_0-9]+) set (\w+)=/.exec(text)
   if(update) {assert.ok(by.get(update[1]).update.includes(update[2]));writes++;continue}
   const del=/^delete from sky_private\.([a-z_0-9]+) /.exec(text)
   if(del) {assert.equal(by.get(del[1]).delete,true,del[1]);writes++;continue}
   if(text.startsWith('select sky_private.apply_sync_metadata_cas(')) {cas++;continue}
   assert.ok(text.startsWith('select ')||text.startsWith('set constraints '),text)
  }
 }
 assert.equal(cas,5);assert.ok(writes>100)
})

test('catalog guard rejects unexpected columns/table count/RLS/policies/helper/body/security/trigger drift',()=>{
 const empty={tables:[],functions:[],triggers:[],policies:[]}
 assert.throws(()=>assertRuntimePrivilegeCatalog(empty),/catalog drift/)
 const functions=migrationFunctions(),catalog={tables:globalThis.structuredClone(runtimePrivilegeBaseline.tables),
  functions:runtimePrivilegeBaseline.functions.map(f=>({...f,body:functions.get(f.name),security_definer:false})),triggers:nativePrivilegeTriggers(),policies:[]}
 assert.doesNotThrow(()=>assertRuntimePrivilegeCatalog(catalog))
 for(const mutate of [c=>c.tables.pop(),c=>c.tables[0].columns.push('extra'),c=>c.tables[0].rls=false,c=>c.policies.push({name:'public'}),
  c=>c.functions.pop(),c=>c.functions[0].security_definer=true,c=>c.functions[0].args+=' changed',c=>c.functions[0].body+=' changed',
  c=>c.triggers.pop(),c=>c.triggers[0].definition+=' changed',c=>c.triggers[0].function='unknown',c=>c.tables.push({name:'future_owner',rls:true,columns:['id']})]) {
  const c=globalThis.structuredClone(catalog);mutate(c);assert.throws(()=>assertRuntimePrivilegeCatalog(c))
 }
 catalog.triggers.reverse();catalog.tables.reverse();catalog.functions.reverse()
 assert.doesNotThrow(()=>assertRuntimePrivilegeCatalog(catalog))
})

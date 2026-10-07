import { createHash } from 'node:crypto'
import { privateSyncColumns } from './postgresSyncRows.ts'
import { catalogColumns } from './catalogRows.ts'
import { runtimePrivilegeBaseline } from './runtimePrivilegeBaseline.ts'

type Table=keyof typeof privateSyncColumns
export interface RuntimeTablePrivilege {
  table:Table;insert:readonly string[];update:readonly string[];delete:boolean;lockOnly:boolean
}
export interface RuntimePrivilegeCatalog {
  tables:{name:string;columns:string[];rls:boolean}[]
  functions:{name:string;args:string;result:string;security_definer:boolean;body:string}[]
  triggers:{table:string;name:string;function:string;definition:string}[]
  policies:unknown[]
}
export const runtimeRoles={reader:'sky_guide_sync_reader',writer:'sky_guide_sync_writer'} as const
const rootKeys={provenance:['id'],domain_identity:['kind','id'],item:['id'],spirit:['id'],season:['id'],item_k15:['id'],provenance_order:['provenance_id']} as const
const deleteOwners=new Set<Table>(['identity_provenance','payload_provenance','acquisition_cost','acquisition_provenance','acquisition_source_offer','acquisition_option',
  'item_translation','item_source_key','item_season','item_spirit','item_asset','item_rule','spirit_translation','spirit_season','spirit_tree',
  'season_translation','season_item','season_spirit','season_realm','season_map','season_article','field_provenance','field_provenance_field'])
const lockColumns={public_release:'catalog_version',sync_acceptance:'revision',acquisition_option:'option_id',field_provenance_field:'field'} as const
export const runtimeFunctions=[
  'iso_instant(text)','valid_partial_time(boolean,text,text,text,text)',
  'valid_time_range(boolean,text,text,boolean,text,text)','graph_edges(bigint)',
  'apply_sync_metadata_cas(text,bigint,text,bigint,text,text)',
] as const
const fail=():never=>{throw new Error('Runtime privilege proposal or catalog drift invalid')}
const quote=(v:string)=>"'"+v.replaceAll("'","''")+"'"
const md5=(v:string)=>createHash('md5').update(v).digest('hex') // Drift fingerprint, not authentication.
const order=(a:string,b:string)=>a<b?-1:a>b?1:0

// Explicit current table universe; grants never include future schema objects.
export function runtimeTablePrivileges():RuntimeTablePrivilege[] {
  return (Object.keys(privateSyncColumns) as Table[]).map(table=>{
    let update:readonly string[]=[]
    if(Object.hasOwn(rootKeys,table)) {
      const keys:readonly string[]=rootKeys[table as keyof typeof rootKeys]
      update=privateSyncColumns[table].filter(c=>!keys.includes(c))
    }else if(table==='sync_generation'||table==='sync_source_state') update=privateSyncColumns[table].slice(1)
    const lockOnly=Object.hasOwn(lockColumns,table)
    if(lockOnly) update=[lockColumns[table as keyof typeof lockColumns]]
    return {table,insert:table==='sync_generation'?[]:[...privateSyncColumns[table]],update:[...update],delete:deleteOwners.has(table),lockOnly}
  })
}

export function assertRuntimePrivilegeCatalog(catalog:RuntimePrivilegeCatalog):void {
  const tables=runtimeTablePrivileges(),fingerprints=runtimePrivilegeBaseline.functions
  if(!catalog||catalog.tables.length!==tables.length||catalog.policies.length||catalog.functions.length!==fingerprints.length) return fail()
  for(const p of tables) {
    const found=catalog.tables.filter(t=>t.name===p.table),expected=runtimePrivilegeBaseline.tables.find(t=>t.name===p.table)?.columns
    if(found.length!==1||found[0].rls!==true||JSON.stringify(found[0].columns)!==JSON.stringify(expected)) return fail()
  }
  for(const expected of fingerprints) {
    const found=catalog.functions.filter(f=>f.name===expected.name)
    if(found.length!==1||found[0].args!==expected.args||found[0].result!==expected.result||found[0].security_definer
      ||md5(found[0].body)!==expected.bodyMd5) return fail()
  }
  const sorted=catalog.triggers.map(t=>({table:t.table,name:t.name,function:t.function,definitionMd5:md5(t.definition)})).sort((a,b)=>order(`${a.table}/${a.name}`,`${b.table}/${b.name}`))
  if(JSON.stringify(sorted)!==JSON.stringify([...runtimePrivilegeBaseline.triggers].sort((a,b)=>order(`${a.table}/${a.name}`,`${b.table}/${b.name}`)))) return fail()
}

// Pure proposal generator uses pinned reviewed fingerprints, never a freshly
// auto-approved catalog. Output is never executed by this module.
export function prepareRuntimePrivilegeProposal() {
  const tables=runtimeTablePrivileges(),fingerprints=runtimePrivilegeBaseline.functions,reader=runtimeRoles.reader,writer=runtimeRoles.writer,roles=`${reader},${writer}`
  const expectedTables=[...runtimePrivilegeBaseline.tables].sort((a,b)=>order(a.name,b.name))
  const preflight=`do $runtime_preflight$ begin
if exists(select 1 from pg_roles where rolname in(${quote(reader)},${quote(writer)})) then raise exception 'Runtime role baseline is not empty';end if;
if exists(select 1 from pg_policies where schemaname='sky_private') then raise exception 'Private RLS policy baseline changed';end if;
if exists(select 1 from pg_namespace n cross join lateral unnest(coalesce(n.nspacl,acldefault('n',n.nspowner))) acl cross join lateral aclexplode(array[acl]) a where n.nspname='sky_private' and a.grantee<>n.nspowner)
or exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral unnest(coalesce(c.relacl,acldefault('r',c.relowner))) acl cross join lateral aclexplode(array[acl]) a where n.nspname='sky_private' and c.relkind='r' and a.grantee<>c.relowner)
or exists(select 1 from pg_attribute col join pg_class c on c.oid=col.attrelid join pg_namespace n on n.oid=c.relnamespace cross join lateral unnest(col.attacl) acl cross join lateral aclexplode(array[acl]) a where n.nspname='sky_private' and c.relkind='r' and col.attnum>0 and not col.attisdropped and a.grantee<>c.relowner)
or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral unnest(coalesce(p.proacl,acldefault('f',p.proowner))) acl cross join lateral aclexplode(array[acl]) a where n.nspname='sky_private' and a.grantee<>p.proowner) then raise exception 'Private nonowner ACL baseline changed';end if;
if (select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'columns',(select jsonb_agg(a.attname order by a.attnum) from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped)) order by c.relname collate pg_catalog."C")
from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='sky_private' and c.relkind='r') is distinct from ${quote(JSON.stringify(expectedTables))}::jsonb then raise exception 'Private table catalog changed';end if;
if (select jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'result',pg_get_function_result(p.oid),'bodyMd5',md5(p.prosrc)) order by p.proname collate pg_catalog."C")
from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='sky_private' and not p.prosecdef) is distinct from ${quote(JSON.stringify([...fingerprints].sort((a,b)=>order(a.name,b.name))))}::jsonb
or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='sky_private' and p.prosecdef) then raise exception 'Private helper definitions changed';end if;
if (select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'function',p.proname,'definitionMd5',md5(pg_get_triggerdef(t.oid))) order by c.relname collate pg_catalog."C",t.tgname collate pg_catalog."C")
from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='sky_private' and not t.tgisinternal)
is distinct from ${quote(JSON.stringify([...runtimePrivilegeBaseline.triggers].sort((a,b)=>order(`${a.table}/${a.name}`,`${b.table}/${b.name}`))))}::jsonb then raise exception 'Private trigger definitions changed';end if;
end $runtime_preflight$;`
  const grant=[`-- REVIEW PROPOSAL ONLY: requires scoped dev runtime-role authorization. No credentials.
begin;`,preflight,`create role ${reader} nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;`,
    `create role ${writer} nologin noinherit nosuperuser nocreatedb nocreaterole noreplication nobypassrls;`,
    `do $database$ begin execute format('grant connect on database %I to ${roles}',current_database());end $database$;`,
    `grant usage on schema sky_private to ${roles};`]
  const rollback=[`-- Stop runtime and verify unchanged proposal baseline first; do not execute blindly.
begin;`,
    `do $members$ begin if exists(select 1 from pg_auth_members m join pg_roles r on r.oid=m.roleid join pg_roles member_role on member_role.oid=m.member where r.rolname in(${quote(reader)},${quote(writer)}) and member_role.rolname<>current_user) then raise exception 'Runtime memberships require scoped rollback';end if;end $members$;`]
  for(const p of tables) {
    const table=`sky_private.${p.table}`
    grant.push(`grant select on ${table} to ${roles};`,`create policy sky_guide_runtime_select on ${table} for select to ${roles} using(true);`)
    rollback.push(`drop policy sky_guide_runtime_select on ${table};`)
    if(p.insert.length) {
      grant.push(`grant insert(${p.insert.join(',')}) on ${table} to ${writer};`,`create policy sky_guide_runtime_insert on ${table} for insert to ${writer} with check(true);`)
      rollback.push(`drop policy sky_guide_runtime_insert on ${table};`,`revoke insert(${p.insert.join(',')}) on ${table} from ${writer};`)
    }
    if(p.update.length) {
      grant.push(`grant update(${p.update.join(',')}) on ${table} to ${writer};`,`create policy sky_guide_runtime_update on ${table} for update to ${writer} using(true) with check(${p.lockOnly?'false':'true'});`)
      rollback.push(`drop policy sky_guide_runtime_update on ${table};`,`revoke update(${p.update.join(',')}) on ${table} from ${writer};`)
    }
    if(p.delete) {
      grant.push(`grant delete on ${table} to ${writer};`,`create policy sky_guide_runtime_delete on ${table} for delete to ${writer} using(true);`)
      rollback.push(`drop policy sky_guide_runtime_delete on ${table};`)
    }
    rollback.push(`revoke all on ${table} from ${roles};`)
  }
  for(const helper of runtimeFunctions) {
    grant.push(`grant execute on function sky_private.${helper} to ${writer};`)
    rollback.push(`revoke execute on function sky_private.${helper} from ${writer};`)
  }
  grant.push('commit;')
  rollback.push(`revoke usage on schema sky_private from ${roles};`,
    `do $database$ begin execute format('revoke connect on database %I from ${roles}',current_database());end $database$;`,
    `drop role ${reader};`,`drop role ${writer};`,'commit;')
  // Fail closed when this module's static universe diverges from canonical roots.
  if(Object.keys(rootKeys).some(t=>!Object.hasOwn(catalogColumns,t))) return fail()
  return {tables,helpers:[...runtimeFunctions],preflight,grant:grant.join('\n')+'\n',rollback:rollback.join('\n')+'\n'}
}

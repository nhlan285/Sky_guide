import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

// Additional before/after comparison only. Never adopts provider catalog data as
// an app source baseline; whole source85 and the approved recovery guard are required.
export function buildCliRoleRecoveryAudit(){return `begin isolation level read committed read only;
set local statement_timeout='30s';
select jsonb_build_object(
 'actor',jsonb_build_object('current_user',current_user,'session_user',session_user,'server_version_num',current_setting('server_version_num')),
 'roles',coalesce((select jsonb_agg(jsonb_build_object('oid',r.oid::bigint,'name',r.rolname,'login',r.rolcanlogin,'super',r.rolsuper,'inherit',r.rolinherit,'createrole',r.rolcreaterole,'createdb',r.rolcreatedb,'replication',r.rolreplication,'bypassrls',r.rolbypassrls,'connection_limit',r.rolconnlimit,'valid_until',r.rolvaliduntil,'config_hash',case when r.rolconfig is null then null else encode(pg_catalog.sha256(pg_catalog.convert_to(array_to_json(r.rolconfig)::text,'UTF8')),'hex') end,'config_keys',coalesce((select jsonb_agg(split_part(v,'=',1) order by n) from unnest(r.rolconfig) with ordinality c(v,n)),'[]'::jsonb)) order by r.rolname collate pg_catalog."C") from pg_roles r),'[]'::jsonb),
 'memberships',coalesce((select jsonb_agg(jsonb_build_object('role',p.rolname,'member',m.rolname,'grantor',g.rolname,'admin',a.admin_option,'inherit',a.inherit_option,'set',a.set_option) order by p.rolname collate pg_catalog."C",m.rolname collate pg_catalog."C",g.rolname collate pg_catalog."C") from pg_auth_members a join pg_roles p on p.oid=a.roleid join pg_roles m on m.oid=a.member join pg_roles g on g.oid=a.grantor),'[]'::jsonb),
 'settings',coalesce((select jsonb_agg(jsonb_build_object('database_oid',s.setdatabase::bigint,'role_oid',s.setrole::bigint,'role_name',r.rolname,'config_hash',encode(pg_catalog.sha256(pg_catalog.convert_to(array_to_json(s.setconfig)::text,'UTF8')),'hex'),'config_keys',coalesce((select jsonb_agg(split_part(v,'=',1) order by n) from unnest(s.setconfig) with ordinality c(v,n)),'[]'::jsonb)) order by s.setdatabase,s.setrole) from pg_db_role_setting s left join pg_roles r on r.oid=s.setrole),'[]'::jsonb),
 'cli_dependencies',coalesce((select jsonb_agg(jsonb_build_object('database_oid',s.dbid::bigint,'class_oid',s.classid::bigint,'object_oid',s.objid::bigint,'subobject',s.objsubid,'type',s.deptype) order by s.dbid,s.classid,s.objid,s.objsubid,s.deptype) from pg_shdepend s join pg_roles r on r.oid=s.refobjid where s.refclassid='pg_authid'::regclass and starts_with(r.rolname,'cli_login')),'[]'::jsonb),
 'active_cli_sessions',(select count(*) from pg_stat_activity where starts_with(usename,'cli_login'))
) as recovery_role_audit;
rollback;
`}

const keys=(value,expected)=>assert.deepEqual(Object.keys(value).sort(),expected.toSorted())
const ordered=rows=>rows.toSorted((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))
export function verifyCliRoleAuditShape(actual){
 keys(actual,['actor','roles','memberships','settings','cli_dependencies','active_cli_sessions'])
 assert.deepEqual(actual.actor,{current_user:'postgres',session_user:'postgres',server_version_num:'170011'})
 assert.ok(Array.isArray(actual.roles)&&actual.roles.length>=4)
 assert.equal(new Set(actual.roles.map(r=>r.oid)).size,actual.roles.length)
 assert.equal(new Set(actual.roles.map(r=>r.name)).size,actual.roles.length)
 const names=new Set(actual.roles.map(r=>r.name)),ids=new Set(actual.roles.map(r=>r.oid))
 for(const name of ['postgres','supabase_admin','sky_guide_sync_reader','sky_guide_sync_writer'])assert.ok(names.has(name))
 for(const r of actual.roles){
  keys(r,['oid','name','login','super','inherit','createrole','createdb','replication','bypassrls','connection_limit','valid_until','config_hash','config_keys'])
  assert.ok(Number.isInteger(r.oid)&&r.oid>0&&r.oid<=0xffffffff);assert.equal(typeof r.name,'string')
  for(const key of ['login','super','inherit','createrole','createdb','replication','bypassrls'])assert.equal(typeof r[key],'boolean')
  assert.ok(Number.isInteger(r.connection_limit)&&r.connection_limit>=-1)
  assert.ok(r.valid_until===null||typeof r.valid_until==='string')
  assert.ok(r.config_hash===null||typeof r.config_hash==='string'&&/^[0-9a-f]{64}$/.test(r.config_hash));assert.ok(Array.isArray(r.config_keys)&&r.config_keys.every(v=>typeof v==='string'))
  if(r.config_hash===null)assert.deepEqual(r.config_keys,[])
 }
 assert.ok(Array.isArray(actual.memberships));assert.equal(new Set(actual.memberships.map(r=>`${r.role}\0${r.member}\0${r.grantor}`)).size,actual.memberships.length)
 for(const m of actual.memberships){
  keys(m,['role','member','grantor','admin','inherit','set'])
  for(const field of ['role','member','grantor'])assert.ok(names.has(m[field]))
  for(const field of ['admin','inherit','set'])assert.equal(typeof m[field],'boolean')
 }
 assert.ok(Array.isArray(actual.settings));assert.equal(new Set(actual.settings.map(s=>`${s.database_oid}/${s.role_oid}`)).size,actual.settings.length)
 for(const s of actual.settings){
  keys(s,['database_oid','role_oid','role_name','config_hash','config_keys'])
  assert.ok(Number.isInteger(s.database_oid)&&s.database_oid>=0)
  assert.ok(s.role_oid===0&&s.role_name===null||ids.has(s.role_oid)&&actual.roles.find(r=>r.oid===s.role_oid).name===s.role_name)
  assert.match(s.config_hash,/^[0-9a-f]{64}$/);assert.ok(Array.isArray(s.config_keys)&&s.config_keys.every(v=>typeof v==='string'))
 }
 assert.deepEqual(actual.cli_dependencies,[]);assert.equal(actual.active_cli_sessions,0)
 return {roles:actual.roles.length,memberships:actual.memberships.length}
}

export function verifyCliRoleRecoveryDifference(before,after){
 verifyCliRoleAuditShape(before);verifyCliRoleAuditShape(after)
 const cli=before.roles.filter(r=>r.name.startsWith('cli_login'))
 assert.equal(cli.length,1)
 assert.deepEqual(cli[0],{oid:cli[0].oid,name:'cli_login_postgres',login:true,super:false,inherit:false,createrole:false,createdb:false,replication:false,bypassrls:false,connection_limit:-1,valid_until:'2026-10-08T05:55:41.50054+00:00',config_hash:null,config_keys:[]})
 const related=m=>['role','member','grantor'].some(field=>m[field]==='cli_login_postgres')
 assert.deepEqual(before.memberships.filter(related),[{role:'postgres',member:'cli_login_postgres',grantor:'supabase_admin',admin:false,inherit:false,set:true}])
 assert.ok(before.settings.every(s=>s.role_oid!==cli[0].oid))
 assert.ok(after.roles.every(r=>!r.name.startsWith('cli_login')))
 assert.deepEqual(ordered(after.roles),ordered(before.roles.filter(r=>r.name!=='cli_login_postgres')),'Other role attributes changed: STOP')
 assert.deepEqual(ordered(after.memberships),ordered(before.memberships.filter(m=>!related(m))),'Other role memberships changed: STOP')
 assert.deepEqual(ordered(after.settings),ordered(before.settings),'Other role settings changed: STOP')
 return {removedRoles:1,removedMemberships:1,otherRolesUnchanged:true,scope:'global role metadata comparison only; source85/guard/native DELETE still required'}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw new Error('Provide E-drive audit SQL output path')
 writeFileSync(process.argv[2],buildCliRoleRecoveryAudit())
 process.stdout.write('PREPARED read-only global-role audit; no credential access or cleanup\n')
}

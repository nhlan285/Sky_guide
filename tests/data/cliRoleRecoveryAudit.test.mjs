import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCliRoleRecoveryAudit,verifyCliRoleRecoveryDifference } from '../sql/verify-cli-role-recovery-audit.mjs'

test('global recovery audit compares all other role attributes, grantors and settings without secret columns',()=>{
 const sql=buildCliRoleRecoveryAudit()
 assert.ok(sql.startsWith('begin isolation level read committed read only;'))
 assert.ok(sql.endsWith('rollback;\n'));assert.ok(sql.includes("statement_timeout='30s'"))
 assert.doesNotMatch(sql,/rolpassword|\b(?:create|drop|alter|grant|revoke|commit)\b/i)
 for(const oid of ['r.oid','s.setdatabase','s.setrole','s.dbid','s.classid','s.objid'])assert.ok(sql.includes(oid+'::bigint'))
 assert.ok(sql.includes('pg_catalog.sha256'));assert.doesNotMatch(sql,/'config',r\.rolconfig|'config',s\.setconfig/)
 const role=(name,oid)=>({name,oid,login:false,super:false,inherit:false,createrole:false,createdb:false,replication:false,bypassrls:false,connection_limit:-1,valid_until:null,config_hash:null,config_keys:[]})
 const cli={...role('cli_login_postgres',100),login:true,valid_until:'2026-10-08T05:55:41.50054+00:00'}
 const unchanged={role:'sky_guide_sync_writer',member:'postgres',grantor:'supabase_admin',admin:true,inherit:false,set:false}
 const before={actor:{current_user:'postgres',session_user:'postgres',server_version_num:'170011'},
  roles:[role('postgres',11),role('supabase_admin',10),role('sky_guide_sync_reader',12),role('sky_guide_sync_writer',13),cli],
  memberships:[unchanged,{role:'postgres',member:'cli_login_postgres',grantor:'supabase_admin',admin:false,inherit:false,set:true}],
  settings:[{database_oid:0,role_oid:11,role_name:'postgres',config_hash:'a'.repeat(64),config_keys:['search_path']}],cli_dependencies:[],active_cli_sessions:0}
 const after=globalThis.structuredClone(before);after.roles.pop();after.memberships.pop()
 assert.equal(verifyCliRoleRecoveryDifference(before,after).otherRolesUnchanged,true)
 assert.equal(verifyCliRoleRecoveryDifference(before,{...after,roles:after.roles.toReversed()}).removedRoles,1)
 for(const mutate of [
  r=>r.after.roles[0].super=true,r=>r.after.roles[1].oid=999,r=>r.after.roles.pop(),
  r=>r.after.roles.push(role('cli_login_readonly',101)),r=>r.after.memberships[0].set=true,
  r=>r.after.memberships[0].grantor='postgres',r=>r.after.memberships.pop(),
  r=>r.after.settings[0].config_hash='b'.repeat(64),r=>r.after.settings[0].config_keys=['other_setting'],r=>r.after.active_cli_sessions=1,
  r=>r.before.roles[4].valid_until=null,r=>r.before.roles[4].config_hash='b'.repeat(64),
  r=>r.before.memberships[1].admin=true,r=>r.before.cli_dependencies.push({type:'o'}),
  r=>r.after.roles[0].password='must-not-accept',r=>r.after.roles[0].config_keys=['unknown_setting'],r=>r.after.roles.push(r.after.roles[0])]){
  const bad=globalThis.structuredClone({before,after});mutate(bad)
  assert.throws(()=>verifyCliRoleRecoveryDifference(bad.before,bad.after))
 }
 // No native DELETE or initial pre-CLI principal baseline is established here.
})

import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { resolve,join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

// REVIEW ONLY. No credential access, HTTP request or role mutation in this builder.
// This guard describes the observed CLI side effect, not an accepted app baseline.
export function buildCliRoleRecoveryProposal(){
 const guard=`begin isolation level read committed read only;
set local statement_timeout='30s';
do $guard$ declare role_oid oid;begin
 if current_user<>'postgres' or session_user<>'postgres' or current_setting('server_version_num')<>'170011' then raise exception 'Recovery executor/version changed: STOP';end if;
 if (select count(*) from pg_roles where starts_with(rolname,'cli_login'))<>1 then raise exception 'Managed CLI role set changed: STOP';end if;
 select oid into role_oid from pg_roles where rolname='cli_login_postgres' and rolcanlogin and not rolsuper and not rolinherit and not rolcreaterole and not rolcreatedb and not rolbypassrls
  and rolvaliduntil='2026-10-08T05:55:41.50054+00:00'::timestamptz and rolvaliduntil<=clock_timestamp();
 if role_oid is null then raise exception 'Observed CLI role attributes/expiry changed: STOP';end if;
 if (select count(*) from pg_auth_members where roleid=role_oid or member=role_oid or grantor=role_oid)<>1
  or not exists(select 1 from pg_auth_members a join pg_roles p on p.oid=a.roleid join pg_roles g on g.oid=a.grantor
   where a.member=role_oid and p.rolname='postgres' and g.rolname='supabase_admin' and g.oid=10 and g.rolsuper and not a.admin_option and not a.inherit_option and a.set_option)
 then raise exception 'Observed CLI memberships changed: STOP';end if;
 if exists(select 1 from pg_stat_activity where starts_with(usename,'cli_login')) then raise exception 'CLI backend still active: STOP';end if;
 if exists(select 1 from pg_db_role_setting where setrole=role_oid) then raise exception 'CLI role settings exist: STOP';end if;
 if exists(select 1 from pg_shdepend where refclassid='pg_authid'::regclass and refobjid=role_oid) then raise exception 'CLI role owns/depends on shared objects: STOP';end if;
end;$guard$;
select jsonb_build_object('guard','PASS','role','cli_login_postgres','expired',true,'sessions',0,'dependencies',0) as cli_role_recovery_guard;
rollback;
`
 const request={status:'PROPOSED / NOT APPROVED / NOT RUN',projectRef:'tpbydviuknovimroeodm',projectName:'sky-guide-dev',organizationId:'pdssjfwbrfjlglobjhtw',method:'DELETE',
  url:'https://api.supabase.com/v1/projects/tpbydviuknovimroeodm/cli/login-role',allowedPresentRoles:['cli_login_postgres'],
  before:['Verify exact target/account/$0 development boundary','Run whole source85 empty baseline and compare installation receipt','Run recovery guard immediately before DELETE','Capture all role attributes/memberships/settings without password fields'],
  after:['Require no cli_login roles/memberships','Compare all other role attributes/memberships/settings exactly','Run whole source85 empty baseline and compare installation receipt'],
  credentialPolicy:'Separate approval required: existing CLI account token used only in process memory for this fixed Management API host/project; no token in chat/log/Git/arguments/files or new credentials',
  rollback:'Removal of an expired unused managed login role is irreversible. No automatic remint/recreation or privilege grant. On failed DELETE/post-check stop, preserve evidence and review; no schema down.',
  concurrentFollowup:'Separate approval required for direct Management API POST database/query using the same in-memory account credential, avoiding the CLI db-config login-role mint; exact prepared A/B/observer SQL +30s/ROLLBACK/baselines unchanged. Missing overlap keeps gate OPEN.'}
 return {guard,request}
}

export function verifyCliRoleRecoveryGuard(actual){
 assert.deepEqual(actual,{guard:'PASS',role:'cli_login_postgres',expired:true,sessions:0,dependencies:0})
 return {readyForReview:true,cleanupRun:false}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw new Error('Provide E-drive review directory')
 const p=buildCliRoleRecoveryProposal()
 writeFileSync(join(process.argv[2],'cli-role-recovery-guard.sql'),p.guard)
 writeFileSync(join(process.argv[2],'cli-role-recovery-request.json'),JSON.stringify(p.request,null,2)+'\n')
 process.stdout.write('Prepared guarded Management API cleanup proposal; NO credential access/HTTP/role mutation\n')
}

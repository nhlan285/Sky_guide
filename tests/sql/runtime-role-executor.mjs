// SQL preparation only. Creator variant requires explicit scoped authorization:
// temporary SET membership for the EXISTING migration actor under outer ROLLBACK.
// No login, credential, new principal or durable membership is created.
export function runtimeRoleExecutor(mode='superuser') {
 if(!['superuser','creator'].includes(mode))throw new Error('Unknown role rehearsal executor')
 if(mode==='superuser')return "do $role_executor$ begin if not exists(select 1 from pg_roles where rolname=current_user and rolsuper) then raise exception 'Role rehearsal requires an authorized superuser executor; no membership edits permitted by this package';end if;end;$role_executor$;"
 return `-- ADDITIONAL APPROVAL REQUIRED: current creator transient SET edges, rolled back with ALL fixture data.
do $role_executor$ declare actor text:=current_user;begin
 if not exists(select 1 from pg_roles where rolname=actor and rolcreaterole and not rolsuper) then raise exception 'Creator rehearsal requires the approved non-superuser migration actor';end if;
 if (select count(*) from pg_auth_members m join pg_roles parent on parent.oid=m.roleid join pg_roles member_role on member_role.oid=m.member join pg_roles grantor on grantor.oid=m.grantor
  where parent.rolname in('sky_guide_sync_reader','sky_guide_sync_writer') and member_role.rolname=actor and m.grantor=10 and grantor.rolsuper and m.admin_option and not m.inherit_option and not m.set_option)<>2
 or exists(select 1 from pg_auth_members m join pg_roles parent on parent.oid=m.roleid join pg_roles member_role on member_role.oid=m.member join pg_roles grantor on grantor.oid=m.grantor
  where (parent.rolname in('sky_guide_sync_reader','sky_guide_sync_writer') or member_role.rolname in('sky_guide_sync_reader','sky_guide_sync_writer'))
  and not(parent.rolname in('sky_guide_sync_reader','sky_guide_sync_writer') and member_role.rolname=actor and m.grantor=10 and grantor.rolsuper and m.admin_option and not m.inherit_option and not m.set_option)) then raise exception 'Creator membership baseline changed';end if;
 execute format('grant sky_guide_sync_reader,sky_guide_sync_writer to %I with admin false,inherit false,set true granted by %I',actor,actor);
end;$role_executor$;`
}

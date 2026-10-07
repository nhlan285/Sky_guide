import { runtimeFunctions,runtimeTablePrivileges,preparePrivilegeProposal,assertPrivilegeCatalog } from './runtimePrivilegePlan.ts'
import type { RuntimePrivilegeCatalog,RuntimeTablePrivilege } from './runtimePrivilegePlan.ts'
import { runtimeJournalPrivilegeBaseline,runtimeJournalColumnBaseline } from './runtimeJournalPrivilegeBaseline.ts'
import { commitProposalColumns } from './syncCommitProposalRows.ts'

export const runtimeJournalFunctions=[...runtimeFunctions,'lock_sync_commit_control()',
 'activate_sync_commit_intent(uuid)','require_sync_commit_intent(uuid,text)','apply_sync_commit_cas(uuid,text)','settle_sync_commit_intent(uuid,text)'] as const
export function runtimeJournalTablePrivileges():RuntimeTablePrivilege[] {
 return [...runtimeTablePrivileges(),
  {table:'sync_commit_intent',insert:[...commitProposalColumns.sync_commit_intent],update:[],delete:false,lockOnly:false},
  {table:'sync_commit_control',insert:[],update:['active_intent_id'],delete:false,lockOnly:false},
  {table:'sync_commit_applied',insert:[...commitProposalColumns.sync_commit_applied],update:[],delete:false,lockOnly:false},
  {table:'sync_commit_receipt',insert:[...commitProposalColumns.sync_commit_receipt],update:[],delete:false,lockOnly:false},
 ]
}
export function assertRuntimeJournalPrivilegeCatalog(catalog:RuntimePrivilegeCatalog):void {
 assertPrivilegeCatalog(catalog,runtimeJournalTablePrivileges(),runtimeJournalPrivilegeBaseline)
}
export function prepareRuntimeJournalPrivilegeProposal() {
 const p=preparePrivilegeProposal(runtimeJournalTablePrivileges(),runtimeJournalPrivilegeBaseline,runtimeJournalFunctions)
 const reader='sky_guide_sync_reader',writer='sky_guide_sync_writer',quote=(s:string)=>"'"+s.replaceAll("'","''")+"'"
 const columnPreflight=`do $runtime_journal_columns$ begin
if (select jsonb_agg(jsonb_build_object('table',c.relname,'position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'generated',a.attgenerated,'defaultExpression',pg_get_expr(d.adbin,d.adrelid)) order by c.relname collate pg_catalog."C",a.attnum)
from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
where n.nspname='sky_private' and c.relname in('sync_commit_intent','sync_commit_control','sync_commit_applied','sync_commit_receipt') and a.attnum>0 and not a.attisdropped)
is distinct from ${quote(JSON.stringify(runtimeJournalColumnBaseline))}::jsonb then raise exception 'Journal physical column definitions changed';end if;
end;$runtime_journal_columns$;`
 const policies:{tablename:string;policyname:string;permissive:string;roles:string[];cmd:string;qual:string|null;with_check:string|null}[]=[]
 for(const t of p.tables) {
  policies.push({tablename:t.table,policyname:'sky_guide_runtime_select',permissive:'PERMISSIVE',roles:[reader,writer],cmd:'SELECT',qual:'true',with_check:null})
  for(const [cmd,cols] of [['INSERT',t.insert],['UPDATE',t.update]] as const)if(cols.length)policies.push({tablename:t.table,policyname:`sky_guide_runtime_${cmd.toLowerCase()}`,permissive:'PERMISSIVE',roles:[writer],cmd,qual:cmd==='UPDATE'?'true':null,with_check:t.lockOnly&&cmd==='UPDATE'?'false':'true'})
  if(t.delete)policies.push({tablename:t.table,policyname:'sky_guide_runtime_delete',permissive:'PERMISSIVE',roles:[writer],cmd:'DELETE',qual:'true',with_check:null})
 }
 const sorted=policies.sort((a,b)=>`${a.tablename}/${a.policyname}`<`${b.tablename}/${b.policyname}`?-1:1)
 const tables=p.tables.map(t=>({...t,columns:runtimeJournalPrivilegeBaseline.tables.find(b=>b.name===t.table)!.columns}))
 const signatures=runtimeJournalPrivilegeBaseline.functions.map(f=>`${f.name}(${f.args?f.args.split(', ').map(a=>a.slice(a.indexOf(' ')+1)).join(','):''})`)
 const roleCheck=`do $runtime_journal_acl$ declare v_role text;v_table jsonb;v_col text;v_priv text;v_func text;v_expected boolean;begin
foreach v_role in array array[${quote(reader)},${quote(writer)}] loop
 if not exists(select 1 from pg_roles where rolname=v_role and not rolcanlogin and not rolinherit and not rolsuper and not rolcreatedb and not rolcreaterole and not rolreplication and not rolbypassrls) then raise exception 'Runtime role attributes changed';end if;
 if has_schema_privilege(v_role,'sky_private','USAGE') is distinct from true or has_schema_privilege(v_role,'sky_private','CREATE') is distinct from false then raise exception 'Runtime schema ACL changed';end if;
 for v_table in select value from jsonb_array_elements(${quote(JSON.stringify(tables))}::jsonb) loop
  if has_table_privilege(v_role,'sky_private.'||(v_table->>'table'),'SELECT') is distinct from true then raise exception 'Runtime SELECT changed';end if;
  foreach v_priv in array array['INSERT','UPDATE','TRUNCATE','REFERENCES','TRIGGER'] loop
   if has_table_privilege(v_role,'sky_private.'||(v_table->>'table'),v_priv) is distinct from false then raise exception 'Unexpected blanket table write';end if;
  end loop;
  if has_table_privilege(v_role,'sky_private.'||(v_table->>'table'),'DELETE') is distinct from (v_role=${quote(writer)} and (v_table->>'delete')::boolean) then raise exception 'Runtime DELETE changed';end if;
  for v_col in select value from jsonb_array_elements_text(v_table->'columns') loop
   foreach v_priv in array array['INSERT','UPDATE','REFERENCES'] loop
    v_expected:=v_role=${quote(writer)} and case v_priv when 'INSERT' then (v_table->'insert') ? v_col when 'UPDATE' then (v_table->'update') ? v_col else false end;
    if has_column_privilege(v_role,'sky_private.'||(v_table->>'table'),v_col,v_priv) is distinct from v_expected then raise exception 'Runtime column ACL changed';end if;
   end loop;
  end loop;
 end loop;
 foreach v_func in array array[${signatures.map(quote).join(',')}] loop
  v_expected:=v_role=${quote(writer)} and v_func=any(array[${p.helpers.map(quote).join(',')}]);
  if has_function_privilege(v_role,'sky_private.'||v_func,'EXECUTE') is distinct from v_expected then raise exception 'Runtime helper ACL changed';end if;
 end loop;
end loop;
if exists(select 1 from pg_namespace n join pg_roles r on r.oid=n.nspowner where n.nspname='sky_private' and r.rolname in(${quote(reader)},${quote(writer)}))
or exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner where n.nspname='sky_private' and r.rolname in(${quote(reader)},${quote(writer)}))
or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='sky_private' and r.rolname in(${quote(reader)},${quote(writer)})) then raise exception 'Runtime role became owner';end if;
if exists(select 1 from pg_namespace n cross join lateral unnest(coalesce(n.nspacl,acldefault('n',n.nspowner))) acl cross join lateral aclexplode(array[acl]) a left join pg_roles r on r.oid=a.grantee where n.nspname='sky_private' and a.grantee<>n.nspowner and (r.rolname is null or r.rolname not in(${quote(reader)},${quote(writer)}) or a.is_grantable))
or exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral unnest(coalesce(c.relacl,acldefault('r',c.relowner))) acl cross join lateral aclexplode(array[acl]) a left join pg_roles r on r.oid=a.grantee where n.nspname='sky_private' and c.relkind='r' and a.grantee<>c.relowner and (r.rolname is null or r.rolname not in(${quote(reader)},${quote(writer)}) or a.is_grantable))
or exists(select 1 from pg_attribute col join pg_class c on c.oid=col.attrelid join pg_namespace n on n.oid=c.relnamespace cross join lateral unnest(col.attacl) acl cross join lateral aclexplode(array[acl]) a left join pg_roles r on r.oid=a.grantee where n.nspname='sky_private' and c.relkind='r' and col.attnum>0 and not col.attisdropped and a.grantee<>c.relowner and (r.rolname is null or r.rolname not in(${quote(reader)},${quote(writer)}) or a.is_grantable))
or exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral unnest(coalesce(p.proacl,acldefault('f',p.proowner))) acl cross join lateral aclexplode(array[acl]) a left join pg_roles r on r.oid=a.grantee where n.nspname='sky_private' and a.grantee<>p.proowner and (r.rolname is null or r.rolname not in(${quote(reader)},${quote(writer)}) or a.is_grantable)) then raise exception 'Unexpected nonowner/grant-option ACL';end if;
if (select jsonb_agg(jsonb_build_object('tablename',p.tablename,'policyname',p.policyname,'permissive',p.permissive,'roles',(select jsonb_agg(r.value::text order by r.value::text collate pg_catalog."C") from unnest(p.roles) as r(value)),'cmd',p.cmd,'qual',p.qual,'with_check',p.with_check) order by p.tablename collate pg_catalog."C",p.policyname collate pg_catalog."C") from pg_policies p where p.schemaname='sky_private') is distinct from ${quote(JSON.stringify(sorted))}::jsonb then raise exception 'Runtime policy definitions changed';end if;
end;$runtime_journal_acl$;`
 // Stop consumers first. Refuse rollback if policy/ACL/role assumptions drift.
 const marker='if (select jsonb_agg(jsonb_build_object',start=p.preflight.indexOf(marker),end=p.preflight.lastIndexOf('end $runtime_preflight$;')
 if(start<0||end<start)throw new Error('Missing pinned definition preflight')
 const definitionCheck=`do $runtime_journal_definitions$ begin\n${p.preflight.slice(start,end)}end;$runtime_journal_definitions$;`
 return {...p,preflight:p.preflight+'\n'+columnPreflight,grant:p.grant.replace(p.preflight,p.preflight+'\n'+columnPreflight).replace('-- REVIEW PROPOSAL ONLY: requires scoped dev runtime-role authorization. No credentials.',
  '-- REVIEW PROPOSAL ONLY: proposed83-owner v2 journal schema must first pass native preflight; requires refreshed scoped dev authorization. NOT APPLIED/NOT NATIVE VERIFIED. No credentials.'),
  rollback:p.rollback.replace('begin;','begin;\n'+definitionCheck+'\n'+columnPreflight+'\n'+roleCheck),roleCheck:definitionCheck+'\n'+columnPreflight+'\n'+roleCheck,policies:sorted}
}

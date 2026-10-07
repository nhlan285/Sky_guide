import { readFileSync,readdirSync,writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL,fileURLToPath } from 'node:url'
import { resolve,join } from 'node:path'
import { Buffer } from 'node:buffer'
import process from 'node:process'
import { runtimeJournalPrivilegeBaseline } from '../../src/server/runtimeJournalPrivilegeBaseline.ts'
import { prepareRuntimeJournalPrivilegeProposal } from '../../src/server/runtimeJournalPrivilegePlan.ts'
import { expectedFunctionSettings } from '../../src/server/runtimeJournalStructure.ts'

// REVIEW PREPARATION ONLY. Does not execute SQL or adopt fetched metadata.
const sha=s=>createHash('sha256').update(s).digest('hex'),md5=s=>createHash('md5').update(s).digest('hex')
const q=s=>"'"+s.replaceAll("'","''")+"'",json=v=>q(JSON.stringify(v))+'::jsonb'
const oldBodyMd5='b2ecccd2deae57f41a2debe3cf806529'
const internal=['release_validation_clock','release_validation_witness']
const helperNames=['enter_release_validation_statement','leave_release_validation_statement','validate_release_epoch']
const hookNames=['release_validation_write_enter','release_validation_write_leave','validation_cache_no_truncate']
const replaceOnce=(s,a,b)=>{if(s.split(a).length!==2)throw new Error('Unexpected checker source occurrence: '+a.slice(0,70));return s.replace(a,b)}
export function buildReleaseValidationBracketProposal(){
 const tables=runtimeJournalPrivilegeBaseline.tables.map(t=>t.name)
 if(tables.length!==83||runtimeJournalPrivilegeBaseline.functions.length!==37)throw new Error('Expected historical83 review base')
 const history=readdirSync(new URL('../../supabase/migrations/',import.meta.url)).filter(n=>/^\d{14}_/.test(n)&&n.slice(0,14)<='20261007161625').sort()
 const versions=history.map(n=>n.slice(0,14)),migrationNames=history.map(n=>n.slice(15,-4))
 if(versions.length!==15)throw new Error('Expected fifteen retained original migrations')
 const original=readFileSync(new URL('../../supabase/migrations/20261006180131_private_release_metadata.sql',import.meta.url),'utf8')
  .match(/create function sky_private\.validate_release_metadata\(\)[\s\S]*?\$\$;/i)?.[0]
 const originalBody=original?.match(/as \$\$([\s\S]*?)\$\$;/i)?.[1]
 if(!originalBody||md5(originalBody)!==oldBodyMd5)throw new Error('Original full validator changed')
 const checks=originalBody.slice(originalBody.indexOf('  if (select count(*)'),originalBody.lastIndexOf('  return null;'))
 if(!checks.startsWith('  if (select count(*)')||!checks.includes('into invalid_owner;'))throw new Error('Full source predicate extraction failed')
 const names=xs=>xs.map(q).join(',')
 const emptyGuard=(after=false,restoring=false)=>`do $validation_empty$ declare t text;n bigint;m_versions text[];m_names text[];begin
 if current_user<>'postgres' or current_setting('session_replication_role')<>'origin' then raise exception 'Approved postgres/origin required';end if;
 perform sky_private.lock_sync_commit_control();
 if exists(select 1 from sky_private.sync_generation where singleton<>1 or revision<>0 or current_acceptance_revision is not null or last_promoted_at is not null)
 or exists(select 1 from sky_private.sync_commit_control where singleton<>1 or active_intent_id is not null) then raise exception 'Nonempty generation/control';end if;
 foreach t in array array[${names([...tables,...(after?internal:[])])}] loop
  execute format('select count(*) from sky_private.%I',t) into n;
  if n<>(case when t in('sync_generation','sync_commit_control'${after?",'release_validation_clock'":''}) then 1 else 0 end) then raise exception 'Nonempty private owner %',t;end if;
 end loop;
${after?"if exists(select 1 from sky_private.release_validation_clock where singleton<>1 or epoch<>0 or write_depth<>0 or writer_xid is not null) then raise exception 'Clock is not an empty rehearsal baseline';end if;":''}
 select array_agg(version order by version),array_agg(name order by version) into m_versions,m_names from supabase_migrations.schema_migrations;
 if m_versions[1:15] is distinct from array[${names(versions)}] or m_names[1:15] is distinct from array[${names(migrationNames)}] then raise exception 'Original migration history changed';end if;
 -- The tool may record its own migration before or after executing supplied SQL.
 if cardinality(m_versions) not between ${restoring?'16 and 17':'15 and 16'}
 or (cardinality(m_versions)>=16 and m_names[16] is distinct from 'private_release_validation_brackets')
${restoring?"or (cardinality(m_versions)=17 and m_names[17] is distinct from 'restore_private_release_validation_brackets')":''}
 then raise exception 'Unexpected extra migration history';end if;
end;$validation_empty$;\n`
 const triggerGuard=(when)=>`if tg_table_schema<>'sky_private' or tg_level<>'STATEMENT' or tg_when<>${q(when)} or tg_op not in('INSERT','UPDATE','DELETE') or tg_table_name not in(${names(tables)}) then raise exception 'Unsupported private write trigger context';end if;`
 const enter=`create function sky_private.enter_release_validation_statement() returns trigger
language plpgsql security definer set search_path='' as $$
declare clock sky_private.release_validation_clock%rowtype;tx pg_catalog.xid8;
begin
 ${triggerGuard('BEFORE')}
 if current_setting('session_replication_role')<>'origin' then raise exception 'Origin enforcement required';end if;
 perform sky_private.lock_sync_commit_control();
 select * into clock from sky_private.release_validation_clock where singleton=1 for update;
 if not found then raise exception 'Missing validation clock';end if;
 tx:=pg_catalog.pg_current_xact_id();
 if clock.write_depth>0 and clock.writer_xid is distinct from tx then raise exception 'Validation write owner changed';end if;
 update sky_private.release_validation_clock set epoch=epoch+1,write_depth=write_depth+1,writer_xid=tx where singleton=1;
 return null;
end;$$;\n`
 const leave=`create function sky_private.leave_release_validation_statement() returns trigger
language plpgsql security definer set search_path='' as $$
declare clock sky_private.release_validation_clock%rowtype;tx pg_catalog.xid8;
begin
 ${triggerGuard('AFTER')}
 if current_setting('session_replication_role')<>'origin' then raise exception 'Origin enforcement required';end if;
 perform sky_private.lock_sync_commit_control();
 select * into clock from sky_private.release_validation_clock where singleton=1 for update;
 if not found then raise exception 'Missing validation clock';end if;
 tx:=pg_catalog.pg_current_xact_id();
 if clock.write_depth<=0 or clock.writer_xid is distinct from tx then raise exception 'Unbalanced validation write bracket';end if;
 update sky_private.release_validation_clock set epoch=epoch+1,write_depth=write_depth-1,writer_xid=(case when write_depth=1 then null else tx end) where singleton=1;
 return null;
end;$$;\n`
 const validate=`create function sky_private.validate_release_epoch(p_catalog_version text) returns void
language plpgsql security definer set search_path='' as $$
declare version text:=p_catalog_version;header sky_private.public_release%rowtype;invalid_order boolean;invalid_owner boolean;
 clock sky_private.release_validation_clock%rowtype;tx pg_catalog.xid8;
begin
 if current_setting('session_replication_role')<>'origin' then raise exception 'Origin enforcement required';end if;
 perform sky_private.lock_sync_commit_control();
 select * into clock from sky_private.release_validation_clock where singleton=1 for update;
 if not found then raise exception 'Missing validation clock';end if;
 tx:=pg_catalog.pg_current_xact_id();
 if clock.write_depth>0 and clock.writer_xid is distinct from tx then raise exception 'Validation write owner changed';end if;
 select * into header from sky_private.public_release where catalog_version=version for update;
 if not found then return;end if;
 -- Never reuse OR record a witness during an open write, even from a direct helper call.
 if clock.write_depth=0 and exists(select 1 from sky_private.release_validation_witness w where w.catalog_version=version and w.transaction_id=tx and w.epoch=clock.epoch) then return;end if;
${checks}
 if clock.write_depth=0 then
  insert into sky_private.release_validation_witness(catalog_version,transaction_id,epoch) values(version,tx,clock.epoch)
  on conflict(catalog_version) do update set transaction_id=excluded.transaction_id,epoch=excluded.epoch;
 end if;
 return;
end;$$;\n`
 const wrapper=`create or replace function sky_private.validate_release_metadata() returns trigger
language plpgsql security invoker set search_path='' as $$
declare version text;
begin
 if tg_op='UPDATE' and old.catalog_version<>new.catalog_version then raise exception 'Release owner cannot move' using errcode='23514';end if;
 version:=case when tg_op='DELETE' then old.catalog_version else new.catalog_version end;
 perform sky_private.validate_release_epoch(version);
 return null;
end;$$;\n`
 const functions=[enter,leave,validate,wrapper].map(sql=>{
  const m=sql.match(/create(?: or replace)? function sky_private\.([a-z_]+)\(([^)]*)\) returns (\w+)\s+language plpgsql security (definer|invoker) set search_path='' as \$\$([\s\S]*?)\$\$;/)
  if(!m)throw new Error('Function source cannot be pinned')
  return {name:m[1],args:m[2],result:m[3],definer:m[4]==='definer',bodyMd5:md5(m[5]),sql}
 })
 const wrapperMd5=functions.at(-1).bodyMd5
 const before=prepareRuntimeJournalPrivilegeProposal().roleCheck+'\n'
 let filtered=replaceOnce(before,oldBodyMd5,wrapperMd5)
 filtered=replaceOnce(filtered,"where n.nspname='sky_private' and c.relkind='r') is distinct from",`where n.nspname='sky_private' and c.relkind='r' and c.relname not in(${names(internal)})) is distinct from`)
 filtered=replaceOnce(filtered,"where n.nspname='sky_private' and p.prosecdef)",`where n.nspname='sky_private' and p.prosecdef and p.proname not in(${names(helperNames)}))`)
 filtered=replaceOnce(filtered,"where n.nspname='sky_private' and not t.tgisinternal)",`where n.nspname='sky_private' and not t.tgisinternal and t.tgname not in(${names(hookNames)}))`)
 filtered=replaceOnce(filtered,json(expectedFunctionSettings(runtimeJournalPrivilegeBaseline.functions.map(f=>f.name))),json(expectedFunctionSettings([...runtimeJournalPrivilegeBaseline.functions.map(f=>f.name),...helperNames])))
 const columns=[
  ['release_validation_clock','singleton','integer',true],['release_validation_clock','epoch','bigint',true],['release_validation_clock','write_depth','integer',true],['release_validation_clock','writer_xid','xid8',false],
  ['release_validation_witness','catalog_version','text',true],['release_validation_witness','transaction_id','xid8',true],['release_validation_witness','epoch','bigint',true],
 ].map(([table,name,type,notNull],i,a)=>({table,position:a.slice(0,i+1).filter(r=>r[0]===table).length,name,type,notNull,generated:'',defaultExpression:null}))
 const constraints=[
  ['release_validation_clock','release_validation_clock_pkey','p','PRIMARY KEY (singleton)'],
  ['release_validation_clock','validation_clock_singleton','c','CHECK ((singleton = 1))'],
  ['release_validation_clock','validation_clock_epoch','c','CHECK ((epoch >= 0))'],
  ['release_validation_clock','validation_clock_depth','c','CHECK ((write_depth >= 0))'],
  ['release_validation_clock','validation_clock_owner','c','CHECK (((write_depth = 0) = (writer_xid IS NULL)))'],
  ['release_validation_witness','release_validation_witness_pkey','p','PRIMARY KEY (catalog_version)'],
  ['release_validation_witness','validation_witness_epoch','c','CHECK ((epoch >= 0))'],
  ['release_validation_witness','validation_witness_release','f','FOREIGN KEY (catalog_version) REFERENCES sky_private.public_release(catalog_version) ON UPDATE RESTRICT ON DELETE RESTRICT'],
 ].map(([table,name,type,definition])=>({table,name,type,definition,validated:true,deferrable:false,deferred:false})).sort((a,b)=>`${a.table}/${a.name}`<`${b.table}/${b.name}`?-1:1)
 const hooks=[...tables.flatMap(table=>[
  {table,name:hookNames[0],function:helperNames[0],type:30},
  {table,name:hookNames[1],function:helperNames[1],type:28},
 ]),...internal.map(table=>({table,name:hookNames[2],function:'guard_evidence_truncate',type:34}))]
  .map(h=>({...h,enabled:'O',deferrable:false,deferred:false,args:0,argBytes:'',columns:'',condition:null,oldTransition:null,newTransition:null,constraint:false}))
  .sort((a,b)=>`${a.table}/${a.name}`<`${b.table}/${b.name}`?-1:1)
 const indexes=internal.map(table=>({table,name:table+'_pkey',definition:`CREATE UNIQUE INDEX ${table}_pkey ON sky_private.${table} USING btree (${table==='release_validation_clock'?'singleton':'catalog_version'})`,valid:true,ready:true,live:true,unique:true,primary:true,immediate:true,replicaIdentity:false}))
 const newFunctions=functions.slice(0,3).map(({name,args,result,definer,bodyMd5})=>({name,args,result,definer,bodyMd5,owner:'postgres'})).sort((a,b)=>a.name<b.name?-1:1)
 const extra=`do $validation_catalog$ declare role_name text;table_name text;column_name text;priv text;fn text;begin
 if (select jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'result',pg_get_function_result(p.oid),'definer',p.prosecdef,'bodyMd5',md5(p.prosrc),'owner',r.rolname) order by p.proname collate pg_catalog."C") from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='sky_private' and p.proname in(${names(helperNames)})) is distinct from ${json(newFunctions)} then raise exception 'Validation definer allowlist changed';end if;
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_roles r on r.oid=p.proowner where n.nspname='sky_private' and p.proname='validate_release_metadata' and r.rolname<>'postgres') then raise exception 'Wrapper owner changed';end if;
 if (select jsonb_agg(jsonb_build_object('table',c.relname,'position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'generated',a.attgenerated,'defaultExpression',pg_get_expr(d.adbin,d.adrelid)) order by c.relname collate pg_catalog."C",a.attnum) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='sky_private' and c.relname in(${names(internal)}) and a.attnum>0 and not a.attisdropped) is distinct from ${json(columns)} then raise exception 'Internal validation columns changed';end if;
 if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_roles r on r.oid=c.relowner where n.nspname='sky_private' and c.relname in(${names(internal)}) and c.relkind='r' and c.relrowsecurity and not c.relforcerowsecurity and r.rolname='postgres')<>2 then raise exception 'Internal validation owner/RLS changed';end if;
 if (select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated,'deferrable',k.condeferrable,'deferred',k.condeferred) order by c.relname collate pg_catalog."C",k.conname collate pg_catalog."C") from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='sky_private' and c.relname in(${names(internal)}) and k.contype<>'t') is distinct from ${json(constraints)} then raise exception 'Internal validation constraints require source review';end if;
 if (select jsonb_agg(jsonb_build_object('table',c.relname,'name',i.relname,'definition',pg_get_indexdef(x.indexrelid),'valid',x.indisvalid,'ready',x.indisready,'live',x.indislive,'unique',x.indisunique,'primary',x.indisprimary,'immediate',x.indimmediate,'replicaIdentity',x.indisreplident) order by c.relname collate pg_catalog."C",i.relname collate pg_catalog."C") from pg_index x join pg_class c on c.oid=x.indrelid join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='sky_private' and c.relname in(${names(internal)})) is distinct from ${json(indexes)} then raise exception 'Internal validation indexes require source review';end if;
 if (select jsonb_agg(jsonb_build_object('table',c.relname,'name',t.tgname,'function',p.proname,'type',t.tgtype,'enabled',t.tgenabled,'deferrable',t.tgdeferrable,'deferred',t.tginitdeferred,'args',t.tgnargs,'argBytes',encode(t.tgargs,'hex'),'columns',t.tgattr::text,'condition',pg_get_expr(t.tgqual,t.tgrelid),'oldTransition',t.tgoldtable,'newTransition',t.tgnewtable,'constraint',t.tgconstraint<>0) order by c.relname collate pg_catalog."C",t.tgname collate pg_catalog."C") from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid join pg_namespace fn on fn.oid=p.pronamespace where n.nspname='sky_private' and fn.nspname='sky_private' and not t.tgisinternal and t.tgname in(${names(hookNames)})) is distinct from ${json(hooks)} then raise exception 'Private write bracket coverage changed';end if;
 if exists(select 1 from pg_policies where schemaname='sky_private' and tablename in(${names(internal)})) then raise exception 'Internal validation policy must remain closed';end if;
 foreach role_name in array array['sky_guide_sync_reader','sky_guide_sync_writer'] loop
  foreach table_name in array array[${names(internal)}] loop
   foreach priv in array array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] loop
    if has_table_privilege(role_name,'sky_private.'||table_name,priv) then raise exception 'Runtime access to internal owner';end if;
   end loop;
   for column_name in select a.attname from pg_attribute a where a.attrelid=('sky_private.'||table_name)::regclass and a.attnum>0 and not a.attisdropped loop
    foreach priv in array array['SELECT','INSERT','UPDATE','REFERENCES'] loop
     if has_column_privilege(role_name,'sky_private.'||table_name,column_name,priv) then raise exception 'Runtime internal column access';end if;
    end loop;
   end loop;
  end loop;
  foreach fn in array array['enter_release_validation_statement()','leave_release_validation_statement()','validate_release_epoch(text)'] loop
   if has_function_privilege(role_name,'sky_private.'||fn,'EXECUTE') is distinct from (role_name='sky_guide_sync_writer' and fn='validate_release_epoch(text)') then raise exception 'Validation helper privilege changed';end if;
  end loop;
 end loop;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a where n.nspname='sky_private' and c.relname in(${names(internal)}) and a.grantee<>c.relowner)
 or exists(select 1 from pg_attribute col join pg_class c on c.oid=col.attrelid join pg_namespace n on n.oid=c.relnamespace cross join lateral aclexplode(col.attacl) a where n.nspname='sky_private' and c.relname in(${names(internal)}) and a.grantee<>c.relowner) then raise exception 'Nonowner internal ACL';end if;
 if (select coalesce(jsonb_agg(jsonb_build_object('name',p.proname,'grantee',r.rolname,'privilege',a.privilege_type,'grantable',a.is_grantable) order by p.proname collate pg_catalog."C",r.rolname collate pg_catalog."C"),'[]'::jsonb) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a left join pg_roles r on r.oid=a.grantee where n.nspname='sky_private' and p.proname in(${names(helperNames)}) and a.grantee<>p.proowner) is distinct from ${json([{name:'validate_release_epoch',grantee:'sky_guide_sync_writer',privilege:'EXECUTE',grantable:false}])} then raise exception 'Validation helper nonowner ACL changed';end if;
end;$validation_catalog$;\n`
 const after=filtered+extra
 const ddl=`create table sky_private.release_validation_clock (
 singleton integer primary key constraint validation_clock_singleton check(singleton=1),
 epoch bigint not null constraint validation_clock_epoch check(epoch>=0),
 write_depth integer not null constraint validation_clock_depth check(write_depth>=0),
 writer_xid pg_catalog.xid8,
 constraint validation_clock_owner check((write_depth=0)=(writer_xid is null))
);
create table sky_private.release_validation_witness (
 catalog_version text primary key,transaction_id pg_catalog.xid8 not null,
 epoch bigint not null constraint validation_witness_epoch check(epoch>=0),
 constraint validation_witness_release foreign key(catalog_version) references sky_private.public_release(catalog_version) on update restrict on delete restrict
);
alter table sky_private.release_validation_clock enable row level security;
alter table sky_private.release_validation_witness enable row level security;
revoke all on sky_private.release_validation_clock,sky_private.release_validation_witness from public,sky_guide_sync_reader,sky_guide_sync_writer;
insert into sky_private.release_validation_clock(singleton,epoch,write_depth,writer_xid) values(1,0,0,null);
${enter}${leave}${validate}${wrapper}
revoke all on function sky_private.enter_release_validation_statement(),sky_private.leave_release_validation_statement(),sky_private.validate_release_epoch(text) from public,sky_guide_sync_reader,sky_guide_sync_writer;
grant execute on function sky_private.validate_release_epoch(text) to sky_guide_sync_writer;
do $validation_hooks$ declare t text;begin
 foreach t in array array[${names(tables)}] loop
  execute format('create trigger release_validation_write_enter before insert or update or delete on sky_private.%I for each statement execute function sky_private.enter_release_validation_statement()',t);
  execute format('create trigger release_validation_write_leave after insert or update or delete on sky_private.%I for each statement execute function sky_private.leave_release_validation_statement()',t);
 end loop;
 foreach t in array array[${names(internal)}] loop
  execute format('create trigger validation_cache_no_truncate before truncate on sky_private.%I for each statement execute function sky_private.guard_evidence_truncate()',t);
 end loop;
end;$validation_hooks$;\n`
 const header='-- REVIEW ONLY / NOT APPLIED. Requires new scoped85-owner/definer/ACL approval. Migration tool owns the transaction.\n'
 const up=header+before+emptyGuard()+ddl+after+emptyGuard(true)
 const down=header+after+emptyGuard(true,true)+`do $validation_down$ declare t text;begin
 foreach t in array array[${names(tables)}] loop
  execute format('drop trigger release_validation_write_enter on sky_private.%I',t);
  execute format('drop trigger release_validation_write_leave on sky_private.%I',t);
 end loop;
end;$validation_down$;
${original.replace('create function','create or replace function')}
drop function sky_private.validate_release_epoch(text),sky_private.enter_release_validation_statement(),sky_private.leave_release_validation_statement();
drop table sky_private.release_validation_witness;
drop table sky_private.release_validation_clock;\n`+before+emptyGuard(false,true)
 const files={'release-validation-bracket-up.sql':up,'release-validation-bracket-down.sql':down,'release-validation-bracket-before-check.sql':before,'release-validation-bracket-after-check.sql':after}
 if(Object.values(files).some(s=>Buffer.byteLength(s)>450000))throw new Error('Bracket proposal exceeds transport/review bound')
 return {files,emptyBeforeGuard:emptyGuard(),emptyAfterGuard:emptyGuard(true),originalChecks:checks,functions,columns,constraints,indexes,hooks,tables,wrapperMd5,oldBodyMd5,counts:{tables:85,functions:40,triggers:323,definers:3},hashes:Object.fromEntries(Object.entries(files).map(([name,text])=>[name,{bytes:Buffer.byteLength(text),sha256:sha(text)}]))}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 if(!process.argv[2])throw new Error('Provide E-drive proposal directory')
 const p=buildReleaseValidationBracketProposal();for(const [name,sql]of Object.entries(p.files))writeFileSync(join(process.argv[2],name),sql)
 process.stdout.write(JSON.stringify({status:'PREPARED/NOT APPLIED/NOT NATIVE VERIFIED',counts:p.counts,functions:p.functions.map(({name,args,result,definer,bodyMd5})=>({name,args,result,definer,bodyMd5})),files:p.hashes})+'\n')
}

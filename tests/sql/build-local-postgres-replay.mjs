import assert from 'node:assert/strict'
import { readFileSync,readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL } from 'node:url'

export const localBootstrap=`begin;
set local statement_timeout='30s';
do $local_guard$ begin
 if current_user<>'supabase_admin' or current_setting('server_version_num')<>'170011'
 or not exists(select 1 from pg_roles where rolname=current_user and oid=10 and rolsuper)
 then raise exception 'Wrong local initialization identity/version';end if;
 if exists(select 1 from pg_roles where rolname not like 'pg\\_%' escape '\\' and rolname<>'supabase_admin')
 or exists(select 1 from pg_namespace where nspname in('sky_private','supabase_migrations'))
 then raise exception 'Local initialization target not fresh';end if;
end;$local_guard$;
create role postgres login nosuperuser nocreatedb createrole noreplication inherit bypassrls;
create role anon nologin nosuperuser nocreatedb nocreaterole noreplication noinherit nobypassrls;
create role authenticated nologin nosuperuser nocreatedb nocreaterole noreplication noinherit nobypassrls;
create role service_role nologin nosuperuser nocreatedb nocreaterole noreplication noinherit nobypassrls;
alter database postgres owner to postgres;
create schema supabase_migrations authorization postgres;
set local role postgres;
create table supabase_migrations.schema_migrations(version text primary key,name text not null,statements text[] not null);
revoke all on schema supabase_migrations from public;
revoke all on supabase_migrations.schema_migrations from public;
reset role;
commit;
`

// These are local bookkeeping transactions, not new hosted migrations. The source
// SQL is preserved byte-for-byte and runs as the nonsuper postgres migrator.
export function buildLocalPostgresReplay(){
 const directory=new URL('../../supabase/migrations/',import.meta.url)
 const names=readdirSync(directory).filter(n=>/^\d{14}_[a-z_]+\.sql$/.test(n)).sort()
 assert.equal(names.length,16)
 const migrations=names.map(name=>{
  const raw=readFileSync(new URL(name,directory)),source=raw.toString('utf8')
  const version=name.slice(0,14),label=name.slice(15,-4),tag=`$local_source_${version}$`
  assert.ok(!source.includes(tag))
  const sha256=createHash('sha256').update(raw).digest('hex')
  return {name,version,bytes:raw.length,sha256,sql:`begin isolation level read committed read write;\nset local statement_timeout='30s';\n${source}\ninsert into supabase_migrations.schema_migrations(version,name,statements) values('${version}','${label}',array[${tag}${source}${tag}]);\ncommit;\n`}
 })
 assert.equal(migrations.at(-1).sha256,'d518e0e751b6c8ab0321f3b66b17a6dfa22f176e02294fc0b70e87124325d8bf')
 return {bootstrap:localBootstrap,migrations,scope:'Approved isolated local replay only; hosted/API/SDK parity not inferred'}
}

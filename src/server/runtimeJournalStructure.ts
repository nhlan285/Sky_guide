import { runtimePrivilegeBaseline } from './runtimePrivilegeBaseline.ts'

// Expanded native79 baseline, captured read-only 2026-10-07. Existing body/name
// fingerprints still apply independently. These hashes cover canonical JSONB
// definitions, not source authentication. Never refresh to make drift pass.
export const installedStructure = {
  columns: 'a05bbf5f6b93ad3d867bbb1e02632304',
  constraints: '63783ebc9248ac48a2a644f58955431d',
  indexes: '96c11328830473de69d5536969812063',
} as const

// Native83 structure explicitly reviewed 2026-10-07 against up SHA256
// 4ad16e6200129114098936f1b0408fd78050e6a3413f299d0b857ec6ee5eeb7e:
// 52 immediate/validated constraints, 7 valid/ready/live indexes. Exact allowlist,
// UUID/digest/revision/time/health/global-tuple checks, bounded row, restricted
// FK actions, PK/UNIQUE key order and one nonunique active-control index match.
// Receipt on E: authorized-journal-structure-receipt.json. Never auto-adopt drift;
// future unreviewed structures must still use null and fail closed before grants.
export const reviewedJournalStructure: { constraints: string | null; indexes: string | null } = {
  constraints: '797ac2761349e5eedc6a282bf8084911', indexes: 'bc5a8dcaeaa5f63abf24a536b071059a',
}

export const expectedFunctionSettings = (names: readonly string[]) => names.map(name => ({
  name, language: ['instant_order_key', 'graph_edges'].includes(name) ? 'sql' : 'plpgsql',
  config: ['search_path=""'], volatile: ['instant_order_key', 'iso_instant', 'valid_partial_time', 'valid_time_range'].includes(name) ? 'i' : name === 'graph_edges' ? 's' : 'v',
  strict: ['instant_order_key', 'iso_instant'].includes(name), parallel: 'u', kind: 'f', leakproof: false,
})).sort((a,b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)

const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'"
function structureQueries() {
  const installed = runtimePrivilegeBaseline.tables.map(t => quote(t.name)).join(',')
  const journal = "'sync_commit_intent','sync_commit_control','sync_commit_applied','sync_commit_receipt'"
  const constraints = `select jsonb_agg(jsonb_build_object('table',c.relname,'name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid),'validated',k.convalidated,'deferrable',k.condeferrable,'deferred',k.condeferred) order by c.relname collate pg_catalog."C",k.conname collate pg_catalog."C") from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='sky_private' and c.relkind='r' and k.contype<>'t' and c.relname in`
  const indexes = `select jsonb_agg(jsonb_build_object('table',c.relname,'name',i.relname,'definition',pg_get_indexdef(x.indexrelid),'valid',x.indisvalid,'ready',x.indisready,'live',x.indislive,'unique',x.indisunique,'primary',x.indisprimary,'immediate',x.indimmediate,'replicaIdentity',x.indisreplident) order by c.relname collate pg_catalog."C",i.relname collate pg_catalog."C") from pg_index x join pg_class c on c.oid=x.indrelid join pg_class i on i.oid=x.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='sky_private' and c.relkind='r' and c.relname in`
  return { installed, journal, constraints, indexes }
}

// Read-only collection AFTER authorized installation, BEFORE grants. Full
// definitions accompany hashes for maintainer review; no auto-import/update API.
export function journalStructureAuditQuery(): string {
  const { installed, journal, constraints, indexes } = structureQueries()
  return `select jsonb_build_object('serverVersion',current_setting('server_version'),
 'installedConstraintsMd5',md5((${constraints}(${installed}))::text),'installedIndexesMd5',md5((${indexes}(${installed}))::text),
 'journalConstraints',(${constraints}(${journal})),'journalConstraintsMd5',md5((${constraints}(${journal}))::text),
 'journalIndexes',(${indexes}(${journal})),'journalIndexesMd5',md5((${indexes}(${journal}))::text),
 'disabledTriggers',(select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='sky_private' and t.tgenabled<>'O'),
 'replicationRole',current_setting('session_replication_role')) as structural_receipt;`
}

export function journalStructurePreflight(functionNames: readonly string[]): string {
  const { installed, journal, constraints, indexes } = structureQueries()
  return `do $runtime_structure$ begin
if current_setting('session_replication_role')<>'origin' then raise exception 'Runtime requires origin trigger enforcement';end if;
if exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='sky_private' and t.tgenabled<>'O') then raise exception 'Private trigger enablement changed (including internal FK triggers)';end if;
if (select jsonb_agg(jsonb_build_object('name',p.proname,'language',l.lanname,'config',p.proconfig,'volatile',p.provolatile,'strict',p.proisstrict,'parallel',p.proparallel,'kind',p.prokind,'leakproof',p.proleakproof) order by p.proname collate pg_catalog."C") from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='sky_private') is distinct from ${quote(JSON.stringify(expectedFunctionSettings(functionNames)))}::jsonb then raise exception 'Private function execution settings changed';end if;
if (select md5(jsonb_agg(jsonb_build_object('table',c.relname,'position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'generated',a.attgenerated,'defaultExpression',pg_get_expr(d.adbin,d.adrelid)) order by c.relname collate pg_catalog."C",a.attnum)::text) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where n.nspname='sky_private' and c.relname in(${installed}) and a.attnum>0 and not a.attisdropped) is distinct from '${installedStructure.columns}' then raise exception 'Installed physical columns changed';end if;
if (select md5((${constraints}(${installed}))::text)) is distinct from '${installedStructure.constraints}' then raise exception 'Installed CHECK/FK/UNIQUE definitions changed';end if;
if (select md5((${indexes}(${installed}))::text)) is distinct from '${installedStructure.indexes}' then raise exception 'Installed index definitions/validity changed';end if;
if ${reviewedJournalStructure.constraints === null || reviewedJournalStructure.indexes === null ? 'true' : 'false'} then raise exception 'Journal structural receipt requires explicit maintainer review before grants';end if;
if (select md5((${constraints}(${journal}))::text)) is distinct from ${reviewedJournalStructure.constraints === null ? 'null' : quote(reviewedJournalStructure.constraints)} then raise exception 'Journal CHECK/FK/UNIQUE definitions changed';end if;
if (select md5((${indexes}(${journal}))::text)) is distinct from ${reviewedJournalStructure.indexes === null ? 'null' : quote(reviewedJournalStructure.indexes)} then raise exception 'Journal index definitions/validity changed';end if;
end;$runtime_structure$;`
}

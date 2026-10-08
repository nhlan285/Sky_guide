import { readFileSync, writeFileSync } from 'node:fs'
import { URL } from 'node:url'
import process from 'node:process'
import { catalogColumns } from '../../src/server/catalogRows.ts'
import { releaseColumns, encodeReleaseRows } from '../../src/server/releaseRows.ts'
import { projectionColumns, encodeProjectionRows } from '../../src/server/projectionRows.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'

// Bounded synthetic transport, never a production SQL driver.
const scalar=value => {
  if(value===null) return 'null'
  if(typeof value==='boolean') return value?'true':'false'
  if(typeof value==='number'&&Number.isFinite(value)) return String(value)
  if(typeof value==='string') return `'${value.replaceAll("'","''")}'`
  throw new Error('Unsupported synthetic scalar')
}
const {snapshot,catalog}=releaseFixture(),release=encodeReleaseRows(snapshot,catalog),projection=encodeProjectionRows(snapshot,'2026-10-07T00:30:00Z')
const groups={catalog:{columns:catalogColumns,rows:catalog},release:{columns:releaseColumns,rows:release}}
const statements=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;"]
for(const group of Object.values(groups)) for(const [table,columns] of Object.entries(group.columns)) if(group.rows[table].length)
  statements.push(`insert into sky_private.${table} (${columns.join(',')}) values ${group.rows[table].map(row => `(${columns.map(c => scalar(row[c])).join(',')})`).join(',')};`)
// Copy a complete unsealed candidate for deferred negative tests; derived byte
// semantic validity is deliberately checked by the reader, not SQL JSON parsing.
statements.push(`create function pg_temp.prepare_projection_candidate(version text) returns void language plpgsql security invoker set search_path='' as $prepare$ begin
set constraints all deferred;
${Object.entries(releaseColumns).map(([table,columns]) => `insert into sky_private.${table}(${columns.join(',')}) select ${columns.map(c => c==='catalog_version'||c==='data_version'?'version':`r.${c}`).join(',')} from sky_private.${table} r where r.catalog_version='fixture-release';`).join('\n')}
set constraints all immediate;
end;$prepare$;`)
// Files precede header. The deferred header FK allows this within one transaction;
// inserting header seals metadata and denies every subsequent byte insertion.
for(const table of ['release_projection_file','release_projection']) {
  const columns=projectionColumns[table]
  statements.push(`insert into sky_private.${table}(${columns.join(',')}) values ${projection[table].map(row => `(${columns.map(c => scalar(row[c])).join(',')})`).join(',')};`)
}
statements.push(readFileSync(new URL('private-projection.sql',import.meta.url),'utf8'))
statements.push(`select jsonb_build_object(${Object.entries(projectionColumns).map(([table,columns]) => `'${table}',coalesce((select jsonb_agg(to_jsonb(r)) from(select ${columns.join(',')} from sky_private.${table} where catalog_version='fixture-release') r),'[]'::jsonb)`).join(',')}) as rows;`,'rollback;')
if(!process.argv[2]) throw new Error('Provide an output file outside Git')
writeFileSync(process.argv[2],statements.join('\n'),'utf8')
process.stdout.write(`Immutable projection rehearsal written: ${statements.join('\n').length} bytes\n`)

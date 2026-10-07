import { readFileSync, writeFileSync } from 'node:fs'
import { URL } from 'node:url'
import process from 'node:process'
import { catalogColumns } from '../../src/server/catalogRows.ts'
import { releaseColumns, encodeReleaseRows } from '../../src/server/releaseRows.ts'
import { projectionColumns, encodeProjectionRows } from '../../src/server/projectionRows.ts'
import { syncMetadataColumns } from '../../src/server/syncMetadataRows.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'

const scalar=value => {
  if(value===null) return 'null'
  if(typeof value==='boolean') return value?'true':'false'
  if(typeof value==='number'&&Number.isFinite(value)) return String(value)
  if(typeof value==='string') return `'${value.replaceAll("'","''")}'`
  throw new Error('Unsupported synthetic scalar')
}
const {snapshot,catalog}=releaseFixture(),release=encodeReleaseRows(snapshot,catalog),projection=encodeProjectionRows(snapshot,'2026-10-07T00:30:00Z')
const groups=[{columns:catalogColumns,rows:catalog},{columns:releaseColumns,rows:release},
  {columns:{release_projection_file:projectionColumns.release_projection_file,release_projection:projectionColumns.release_projection},rows:projection}]
const statements=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;"]
for(const group of groups) for(const [table,columns] of Object.entries(group.columns)) if(group.rows[table].length)
  statements.push(`insert into sky_private.${table}(${columns.join(',')}) values ${group.rows[table].map(r => `(${columns.map(c=>scalar(r[c])).join(',')})`).join(',')};`)
statements.push("insert into sky_private.source_registry(id) values('K01');",readFileSync(new URL('private-sync-metadata.sql',import.meta.url),'utf8'))
statements.push(`select jsonb_build_object(${['K15','K01'].map(source => `'${source}',jsonb_build_object(${Object.entries(syncMetadataColumns).map(([table,columns]) => {
  const filter=table==='sync_source_state'?`where source_id='${source}'`:table==='sync_acceptance'?`where revision in(select current_acceptance_revision from sky_private.sync_generation union select last_success_revision from sky_private.sync_source_state where source_id='${source}')`:table==='sync_audit'?'where revision=(select revision from sky_private.sync_generation)':''
  return `'${table}',coalesce((select jsonb_agg(to_jsonb(r)) from(select ${columns.join(',')} from sky_private.${table} ${filter}) r),'[]'::jsonb)`
}).join(',')})`).join(',')}) as rows;`,'rollback;')
if(!process.argv[2]) throw new Error('Provide an output file outside Git')
writeFileSync(process.argv[2],statements.join('\n'),'utf8')
process.stdout.write(`Sync metadata rehearsal written: ${statements.join('\n').length} bytes\n`)

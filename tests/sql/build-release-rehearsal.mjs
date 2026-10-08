import { readFileSync, writeFileSync } from 'node:fs'
import { URL } from 'node:url'
import process from 'node:process'
import { catalogColumns } from '../../src/server/catalogRows.ts'
import { releaseColumns, encodeReleaseRows } from '../../src/server/releaseRows.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'

// Test-only static identifiers and bounded synthetic literals. Never a driver.
const scalar=value => {
  if(value===null) return 'null'
  if(typeof value==='boolean') return value?'true':'false'
  if(typeof value==='number'&&Number.isFinite(value)) return String(value)
  if(typeof value==='string') return `'${value.replaceAll("'","''")}'`
  throw new Error('Unsupported rehearsal scalar')
}
const {snapshot,catalog}=releaseFixture(),withoutOptional=process.argv[3]==='--without-optional'
if(withoutOptional) {delete snapshot.manifest.source;delete snapshot.manifest.importReport;snapshot.manifest.assetManifestVersion=null}
const release=encodeReleaseRows(snapshot,catalog)
const groups={catalog:{columns:catalogColumns,rows:catalog},release:{columns:releaseColumns,rows:release}}
const statements=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;"]
for(const group of Object.values(groups)) for(const [table,columns] of Object.entries(group.columns)) if(group.rows[table].length)
  statements.push(`insert into sky_private.${table} (${columns.join(',')}) values ${group.rows[table].map(row => `(${columns.map(column => scalar(row[column])).join(',')})`).join(',')};`)
statements.push(withoutOptional?'set constraints all immediate;':readFileSync(new URL('private-release.sql',import.meta.url),'utf8'))
statements.push(`select jsonb_build_object(${Object.entries(groups).map(([name,group]) => `'${name}',jsonb_build_object(${Object.entries(group.columns).map(([table,columns]) => `'${table}',coalesce((select jsonb_agg(to_jsonb(r)) from (select ${columns.join(',')} from sky_private.${table}) r),'[]'::jsonb)`).join(',')})`).join(',')}) as rows;`,'rollback;')
if(!process.argv[2]) throw new Error('Provide an output file outside Git')
writeFileSync(process.argv[2],statements.join('\n'),'utf8')
process.stdout.write(`Release rehearsal written: ${statements.join('\n').length} bytes\n`)

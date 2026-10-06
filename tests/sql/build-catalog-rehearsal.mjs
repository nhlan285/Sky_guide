import { readFileSync, writeFileSync } from 'node:fs'
import { URL } from 'node:url'
import process from 'node:process'
import { catalogColumns, encodeCatalogRows } from '../../src/server/catalogRows.ts'
import { catalogFixture, catalogFixtureContext } from '../fixtures/catalogRows.mjs'

// Test-only SQL transport, no credentials/provider calls or canonical JSON store.
// Values are bounded synthetic fixtures; identifiers come from static columns.
const scalar=value => {
  if (value===null) return 'null'
  if (typeof value==='boolean') return value?'true':'false'
  if (typeof value==='number'&&Number.isFinite(value)) return String(value)
  if (typeof value==='string') return `'${value.replaceAll("'","''")}'`
  throw new Error('Unsupported fixture SQL scalar')
}
const rows=encodeCatalogRows(catalogFixture(),catalogFixtureContext)
const entries=Object.entries(catalogColumns)
const statements=['begin;',"set local statement_timeout='30s';","set local standard_conforming_strings=on;"]
for (const [table,columns] of entries) if (rows[table].length) statements.push(`insert into sky_private.${table} (${columns.join(',')}) values ${rows[table].map(row => `(${columns.map(column => scalar(row[column])).join(',')})`).join(',')};`)
statements.push(readFileSync(new URL('private-catalog.sql',import.meta.url),'utf8'))
// Actual DB row response is a derived transport value, never persisted JSON.
statements.push(`select jsonb_build_object(${entries.map(([table,columns]) => `'${table}',coalesce((select jsonb_agg(to_jsonb(r)) from (select ${columns.join(',')} from sky_private.${table}) r),'[]'::jsonb)`).join(',')}) as rows;`,'rollback;')
if (!process.argv[2]) throw new Error('Provide an output file outside Git for the bounded rehearsal SQL')
writeFileSync(process.argv[2],statements.join('\n'),'utf8')
process.stdout.write(`Synthetic SQL rehearsal written: ${statements.join('\n').length} bytes\n`)

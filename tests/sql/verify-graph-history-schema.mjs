import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { graphHistoryColumns } from '../../src/server/graphHistoryRows.ts'
const actual=JSON.parse(readFileSync(process.argv[2],'utf8'))
assert.equal(actual.tables.length,77);assert.ok(actual.tables.every(t=>t.rls))
for(const [table,cols] of Object.entries(graphHistoryColumns)) {
 const row=actual.tables.find(t=>t.name===table);assert.ok(row);assert.deepEqual([...row.columns].sort(),[...cols].sort())
}
assert.equal(Object.keys(actual.row_counts).length,77)
for(const [table,count] of Object.entries(actual.row_counts)) assert.equal(count,table==='sync_generation'?1:0,table)
assert.deepEqual(actual.control,{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null})
for(const field of ['unvalidated','nonrestrict_fks','security_definers','platform_schema_grants','platform_table_grants','platform_function_grants']) assert.equal(actual[field],0,field)
process.stdout.write('77 private tables/RLS; 27 graph writable column contracts, RESTRICT FKs/no runtime grants; only revision0 baseline remains PASS\n')

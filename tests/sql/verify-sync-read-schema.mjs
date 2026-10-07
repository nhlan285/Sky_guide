import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { manifestOrderColumns } from '../../src/server/manifestOrderRows.ts'
const actual=JSON.parse(readFileSync(process.argv[2],'utf8'))
assert.equal(actual.tables.length,78);assert.ok(actual.tables.every(t=>t.rls))
const order=actual.tables.find(t=>t.name==='acceptance_manifest_dataset');assert.ok(order);assert.deepEqual([...order.columns].sort(),[...manifestOrderColumns].sort())
assert.equal(Object.keys(actual.row_counts).length,78)
for(const [table,count] of Object.entries(actual.row_counts)) assert.equal(count,table==='sync_generation'?1:0,table)
assert.deepEqual(actual.control,{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null})
for(const field of ['unvalidated','nonrestrict_fks','security_definers','platform_schema_grants','platform_table_grants','platform_function_grants']) assert.equal(actual[field],0,field)
process.stdout.write('78 private tables/RLS; acceptance dataset order columns/FKs/no runtime grants; only revision0 baseline remains PASS\n')

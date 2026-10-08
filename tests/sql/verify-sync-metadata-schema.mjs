import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { syncMetadataColumns } from '../../src/server/syncMetadataRows.ts'

const actual=JSON.parse(readFileSync(process.argv[2],'utf8'))
assert.equal(actual.tables.length,50);assert.ok(actual.tables.every(r=>r.rls))
for(const [table,columns] of Object.entries(syncMetadataColumns)) {
  const row=actual.tables.find(r=>r.name===table);assert.ok(row);assert.deepEqual([...row.columns].sort(),[...columns].sort())
}
assert.equal(Object.keys(actual.row_counts).length,50)
for(const [name,count] of Object.entries(actual.row_counts)) assert.equal(count,name==='sync_generation'?1:0,name)
assert.deepEqual(actual.control,{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null})
for(const key of ['unvalidated','nonrestrict_fks','security_definers','platform_schema_grants','platform_table_grants','platform_function_grants']) assert.equal(actual[key],0,key)
process.stdout.write('50 private tables/RLS; sync columns/FKs/grants PASS; only revision0 control baseline retained\n')

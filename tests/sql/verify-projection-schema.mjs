import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { projectionColumns } from '../../src/server/projectionRows.ts'

const actual=JSON.parse(readFileSync(process.argv[2],'utf8'))
assert.equal(actual.tables.length,46)
for(const [table,columns] of Object.entries(projectionColumns)) {
  const row=actual.tables.find(r => r.name===table)
  assert.ok(row);assert.equal(row.rls,true);assert.deepEqual([...row.columns].sort(),[...columns].sort())
}
assert.ok(actual.tables.every(r => r.rls))
assert.equal(Object.keys(actual.row_counts).length,46);assert.ok(Object.values(actual.row_counts).every(n => n===0))
for(const key of ['unvalidated','nonrestrict_fks','security_definers','platform_schema_grants','platform_table_grants','platform_function_grants']) assert.equal(actual[key],0,key)
process.stdout.write('46 private tables empty/RLS; projection column contracts/FKs/grants PASS\n')

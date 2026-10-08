import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLocalDurableAdapter,verifyLocalDurableBoundary } from '../sql/build-local-durable-adapter.mjs'

test('local durability preparation retains all39 adapter callbacks/978 queries/6 negatives and original isolation',async()=>{
 const p=await buildLocalDurableAdapter()
 assert.equal(p.callbacks.length,39);assert.equal(p.queryChecks,978);assert.equal(p.negativeChecks,6)
 assert.ok(p.seed.endsWith('commit;\n'));assert.ok(p.final.endsWith('commit;\n'))
 assert.ok(p.callbacks.some(c=>c.readonly))
 for(const c of p.callbacks){
  assert.ok(c.sql.startsWith(`begin isolation level ${c.readonly?'repeatable read read only':'read committed read write'};`))
  assert.ok(c.sql.endsWith(`${c.negative?'rollback':'commit'};\n`))
  const row={index:c.index,negative:c.negative,pid:10+c.index,isolation:c.isolation,readonly:c.readonly?'on':'off'}
  const raw=`BEGIN\nDO\n${JSON.stringify(row)}\n${c.negative?'ROLLBACK':'COMMIT'}\n`
  assert.equal(verifyLocalDurableBoundary(raw,c).pid,row.pid)
  assert.throws(()=>verifyLocalDurableBoundary(raw.replace(/(?:ROLLBACK|COMMIT)\n$/,'WRONG\n'),c))
  assert.throws(()=>verifyLocalDurableBoundary(raw.replace('"pid":'+row.pid,'"pid":0'),c))
 }
})

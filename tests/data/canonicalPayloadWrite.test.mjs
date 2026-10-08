import assert from 'node:assert/strict'
import test from 'node:test'
import { prepareCanonicalPayloadWrite } from '../../src/server/canonicalPayloadWrite.ts'
import { payloadWriteFixture,writeLimits } from '../fixtures/canonicalPayloadWrite.mjs'
import { contract } from '../fixtures/syncReadFrame.mjs'

test('canonical statements bind scalar values, preserve all graph reservations and bound allocation',async()=>{
 const {candidate,current}=await payloadWriteFixture(),before=globalThis.structuredClone(current)
 const result=await prepareCanonicalPayloadWrite(candidate,contract,current,writeLimits)
 assert.deepEqual(current,before);assert.equal(result.plan.payload.items.length,3)
 assert.deepEqual(result.plan.payload.items.map(p=>p.id),['tsa-cosmetic-9003','tsa-cosmetic-9001','tsa-cosmetic-9002'])
 assert.ok(result.statements.some(s=>s.values.includes("Reviewed 'quote' \\ path $1")))
 assert.ok(result.statements.every(s=>!s.text.includes("Reviewed 'quote'")))
 assert.ok(result.statements.some(s=>s.text.startsWith('insert into sky_private.domain_identity')&&s.values.includes('fixture-cosmetic-reservation')))
 assert.ok(result.statements.some(s=>s.text.startsWith('insert into sky_private.source_registry')&&s.values.includes('K02')))
 assert.ok(result.statements.some(s=>s.text.startsWith('insert into sky_private.alias')))
 for(const limits of [{maxRows:1,maxBytes:200_000},{maxRows:1000,maxBytes:1},{maxRows:0,maxBytes:1000},{maxRows:NaN,maxBytes:1000}])
  await assert.rejects(()=>prepareCanonicalPayloadWrite(candidate,contract,current,limits))
})

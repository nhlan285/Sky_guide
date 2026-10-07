import assert from 'node:assert/strict'
import test from 'node:test'
import { Buffer } from 'node:buffer'
import { buildFullK15ValidationRehearsal, verifyFullK15ValidationReceipt } from '../sql/build-full-k15-validation-rehearsal.mjs'

test('full K15 cost preparation retains every membership and forces deferred checks under ROLLBACK',async()=>{
 const r=await buildFullK15ValidationRehearsal()
 assert.deepEqual(r.expected,{items:1808,spirits:213,seasons:30,provenance:244,identityRows:2051,membershipRows:4103})
 assert.ok(r.canonicalRows>10_000)
 assert.ok(r.releaseRows>4103)
 assert.ok(Buffer.byteLength(r.sql)<32_000_000)
 assert.ok(r.sql.startsWith('-- PREPARED/NOT RUN.'))
 assert.ok(r.sql.includes('set constraints all immediate;checked:=clock_timestamp()'))
 assert.ok(r.sql.includes('Full K15 rehearsal requires empty native baseline'))
 assert.ok(r.sql.includes("statement_timeout='30s'"))
 assert.ok(r.sql.includes('rollback;'))
 assert.doesNotMatch(r.sql,/\bcommit;|disable trigger|session_replication_role|create (?:table|function|role)|\bgrant |apply_sync_metadata_cas/i)
 const receipt={expected:r.expected,items:1808,memberships:4103,canonicalMs:10,releaseMs:20,deferredMs:30,totalMs:60}
 assert.equal(verifyFullK15ValidationReceipt(receipt,r.expected),true)
 for(const mutate of [x=>x.memberships--,x=>delete x.deferredMs,x=>x.totalMs=59,x=>{x.deferredMs=30_000;x.totalMs=30_030},x=>x.canonicalMs=-1]) {
  const bad=globalThis.structuredClone(receipt);mutate(bad);assert.throws(()=>verifyFullK15ValidationReceipt(bad,r.expected))
 }
 // The synthetic receipt above validates the verifier, not PostgreSQL timings.
})

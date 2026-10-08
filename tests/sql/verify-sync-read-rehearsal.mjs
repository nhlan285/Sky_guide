import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { decodeSyncStateRows } from '../../src/server/syncStateRows.ts'
import { acceptedFrame,contract } from '../fixtures/syncReadFrame.mjs'
const actual=JSON.parse(readFileSync(process.argv[2],'utf8')),{candidate,review}=await acceptedFrame()
assert.equal(actual.negative_cases,11)
const a=await decodeSyncStateRows(actual.K15,'K15',contract),b=await decodeSyncStateRows(actual.K01,'K01',contract)
for(const state of [a,b]){assert.equal(state.revision,3);assert.deepEqual(state.lastKnownGood,candidate);assert.deepEqual(state.approval,review);assert.equal(state.lastPromotedAt,'2026-10-07T00:03:00.000Z');assert.equal(state.failures,1)}
assert.deepEqual(a.freshness,{health:'offline',lastSuccessAt:'2026-10-07T00:03:00.000Z',validUntil:null});assert.equal(b.freshness,null)
assert.equal(a.lastAttemptAt,'2026-10-07T00:05:00Z');assert.equal(b.lastAttemptAt,'2026-10-07T00:04:00Z')
assert.equal(a.nextRetryAt,'2026-10-07T00:06:00.000Z');assert.equal(b.nextRetryAt,'2026-10-07T00:05:00.000Z')
process.stdout.write('Actual hosted metadata/graph/public bytes/order -> exact reviewed SyncState/LKG, independent source health/retry after canonical mutation; 11 native negatives PASS\n')

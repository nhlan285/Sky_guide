import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeSyncMetadataRows } from '../../src/server/syncMetadataRows.ts'
import { candidateReviewHash } from '../../src/server/sourceSync.ts'
import { syncMetadataFixture } from '../fixtures/syncMetadataRows.mjs'

test('global acceptance/audit and independent source freshness reconstruct from exact typed frames',() => {
  const a=decodeSyncMetadataRows(syncMetadataFixture('K15'),'K15'),b=decodeSyncMetadataRows(syncMetadataFixture('K01'),'K01')
  assert.equal(a.revision,6);assert.equal(a.acceptance.revision,6);assert.equal(a.acceptance.sourceId,'K15')
  assert.deepEqual(a.acceptance,b.acceptance);assert.equal(a.freshness.lastSuccessAt,'2026-10-07T00:16:00Z');assert.equal(b.freshness.lastSuccessAt,'2026-10-07T00:12:00Z')
  assert.equal(a.acceptance.candidateHash,candidateReviewHash(a.acceptance))
  assert.equal(a.audit.outcome,'promoted');assert.equal(a.failures,0)
})

test('initial and first-failure state have no invented LKG/source success',() => {
  const rows={sync_generation:[{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null}],sync_acceptance:[],sync_source_state:[],sync_audit:[]}
  assert.deepEqual(decodeSyncMetadataRows(rows,'K15'),{revision:0,acceptance:null,lastPromotedAt:null,lastAttemptAt:null,failures:0,nextRetryAt:null,freshness:null,audit:null})
  rows.sync_generation[0].revision=1
  rows.sync_source_state.push({source_id:'K15',last_success_revision:null,health:null,last_attempt_at:'2026-10-07T00:04:00Z',failures:1,next_retry_at:null})
  rows.sync_audit.push({revision:1,source_id:'K15',outcome:'failure',attempt_completed_at:'2026-10-07T00:04:00Z',acceptance_revision:null})
  const decoded=decodeSyncMetadataRows(rows,'K15');assert.equal(decoded.acceptance,null);assert.equal(decoded.freshness,null);assert.equal(decoded.failures,1)
})

test('failure keeps global LKG, turns own source offline and preserves configured retry',() => {
  const rows=syncMetadataFixture(),time='2026-10-07T00:20:00Z'
  rows.sync_generation[0].revision=7
  rows.sync_source_state[0].health='offline';rows.sync_source_state[0].failures=1;rows.sync_source_state[0].last_attempt_at=time;rows.sync_source_state[0].next_retry_at='2026-10-07T00:25:00Z'
  rows.sync_audit[0]={revision:7,source_id:'K15',outcome:'failure',attempt_completed_at:time,acceptance_revision:null}
  const decoded=decodeSyncMetadataRows(rows,'K15');assert.equal(decoded.acceptance.revision,6);assert.equal(decoded.freshness.health,'offline');assert.equal(decoded.lastPromotedAt,'2026-10-07T00:16:00Z')
  assert.equal(decoded.nextRetryAt,'2026-10-07T00:25:00Z')
})

test('malformed/private/cross-source/clock/review/pointer/audit frames fail closed',() => {
  for(const change of [r=>{r.sync_generation[0].revision=-1},r=>{r.sync_generation[0].singleton=2},r=>{r.sync_generation[0].revision=Number.MAX_SAFE_INTEGER+1},
    r=>{r.sync_generation[0].current_acceptance_revision=5},r=>{r.sync_generation[0].last_promoted_at=null},r=>{r.sync_acceptance=[]},
    r=>{r.sync_acceptance.push({...r.sync_acceptance[0]})},r=>{r.sync_acceptance[0].candidate_hash='0'.repeat(64)},r=>{r.sync_acceptance[0].reviewer_ref=' '},
    r=>{r.sync_acceptance[0].reviewed_at='2026-10-07T00:12:00Z'},r=>{r.sync_acceptance[0].valid_until='2026-10-07T00:15:00Z'},
    r=>{r.sync_source_state[0].source_id='K01'},r=>{r.sync_source_state[0].last_success_revision=5},r=>{r.sync_source_state[0].health='offline'},
    r=>{r.sync_source_state[0].next_retry_at='2026-10-07T00:25:00Z'},r=>{r.sync_audit[0].revision=5},r=>{r.sync_audit[0].source_id='K01'},
    r=>{r.sync_audit[0].outcome='failure'},r=>{r.sync_audit[0].attempt_completed_at='invalid'},r=>{r.sync_generation[0].privateEvidence='hidden'},r=>{r.extra=[]},
  ]) {
    const rows=syncMetadataFixture();change(rows);assert.throws(()=>decodeSyncMetadataRows(rows,'K15'))
  }
  assert.throws(()=>decodeSyncMetadataRows(syncMetadataFixture(),'K99'))
  const staleOwn=syncMetadataFixture('K01');staleOwn.sync_source_state[0].source_id='K15'
  staleOwn.sync_source_state[0].last_attempt_at='2026-10-07T00:13:00Z';staleOwn.sync_acceptance[0].source_id='K15'
  assert.throws(()=>decodeSyncMetadataRows(staleOwn,'K15'))
})

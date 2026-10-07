import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import process from 'node:process'
import { buildSyncCommitAdapterRehearsal } from './build-sync-commit-adapter-rehearsal.mjs'

const ordered=rows=>rows.toSorted((a,b)=>String(a.id??a.intent_id).localeCompare(String(b.id??b.intent_id)))
// Compare ACTUAL native output only. Synthetic verifier tests never become a
// native receipt; even a real outer-ROLLBACK receipt is not SDK/crash/race proof.
export async function verifySyncCommitAdapterRehearsal(actual) {
 const expected=await buildSyncCommitAdapterRehearsal(),rows=expected.rows
 assert.equal(actual.phases,5);assert.equal(actual.callbacks,expected.callbacks);assert.equal(actual.query_checks,expected.queryChecks)
 assert.equal(actual.negative_checks,expected.negativeChecks);assert.equal(actual.revision,5)
 assert.deepEqual(ordered(actual.intent),ordered(rows))
 assert.deepEqual(actual.control,[{singleton:1,active_intent_id:null}])
 assert.deepEqual(ordered(actual.applied),ordered(rows.slice(0,5).map(r=>({intent_id:r.id,revision:r.target_revision,state_digest:r.state_digest}))))
 assert.deepEqual(ordered(actual.receipts),ordered(rows.map((r,n)=>({intent_id:r.id,resolution:n<5?'committed':'not_committed'}))))
 return {phases:5,callbacks:expected.callbacks,queryChecks:expected.queryChecks,negativeChecks:expected.negativeChecks}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide actual native output JSON outside Git')
 const r=await verifySyncCommitAdapterRehearsal(JSON.parse(readFileSync(process.argv[2],'utf8')))
 process.stdout.write(`Returned v2 adapter rows verified: ${r.callbacks} callbacks/${r.queryChecks} query checks/${r.negativeChecks} token negatives; one-connection proof only\n`)
}

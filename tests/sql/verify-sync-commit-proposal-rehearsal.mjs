import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import process from 'node:process'
import { buildSyncCommitProposalRehearsal } from './build-sync-commit-proposal-rehearsal.mjs'

const ordered=rows=>rows.toSorted((a,b)=>String(a.id??a.intent_id).localeCompare(String(b.id??b.intent_id)))
// Use only on the ACTUAL returned native row object, never prepared/mock data as
// a native receipt. Even real single-connection output cannot prove crash/races.
export async function verifySyncCommitProposalRehearsal(actual) {
 const expected=await buildSyncCommitProposalRehearsal(),rows=expected.rows
 assert.equal(actual.phases,5);assert.equal(actual.query_checks,expected.queryChecks);assert.equal(actual.negative_checks,expected.negativeChecks);assert.equal(actual.revision,5)
 assert.deepEqual(ordered(actual.intent),ordered(rows.map(r=>({...r,target_revision:r.expected_revision+1}))))
 assert.deepEqual(actual.control,[{singleton:1,active_intent_id:null}])
 assert.deepEqual(ordered(actual.applied),ordered(rows.slice(0,5).map(r=>({intent_id:r.id,revision:r.expected_revision+1,state_digest:r.state_digest}))))
 assert.deepEqual(ordered(actual.receipts),ordered(rows.map((r,n)=>({intent_id:r.id,resolution:n<5?'committed':'not_committed'}))))
 return {phases:5,queryChecks:expected.queryChecks,negativeChecks:expected.negativeChecks}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 if(!process.argv[2])throw new Error('Provide actual native output JSON outside Git')
 const r=await verifySyncCommitProposalRehearsal(JSON.parse(readFileSync(process.argv[2],'utf8')))
 process.stdout.write(`Returned journal5-phase rows verified: ${r.queryChecks} query checks/${r.negativeChecks} negatives; one-connection proof only\n`)
}

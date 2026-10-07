import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { decodeCatalogRows } from '../../src/server/catalogRows.ts'
import { decodeSyncStateRows } from '../../src/server/syncStateRows.ts'
import { candidateReviewHash,stageSourceSnapshot } from '../../src/server/sourceSync.ts'
import { payloadEvidenceFixture } from '../fixtures/payloadEvidence.mjs'
import { contract,empty } from '../fixtures/syncReadFrame.mjs'
const actual=JSON.parse(readFileSync(process.argv[2],'utf8')),f=payloadEvidenceFixture()
assert.equal(actual.negative_cases,13);assert.deepEqual(decodeCatalogRows(actual.catalog,{identities:f.identities}),f.payload)
const staged=await stageSourceSnapshot({sourceId:'K15',raw:'synthetic evidence boundary',normalizationVersion:'fixture-v1',base:empty(),contract,
 normalize:async()=>({identities:f.graph,publicFiles:f.snapshot,provenanceIds:f.provenanceIds}),fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')})
assert.equal(staged.status,'staged')
const restored=await decodeSyncStateRows(actual.frame,'K15',contract);assert.deepEqual(restored.lastKnownGood,staged.candidate);assert.equal(restored.approval.candidateHash,candidateReviewHash(staged.candidate))
assert.ok([...restored.lastKnownGood.publicFiles.files.values()].every(text=>!text.includes('fixture-private-proof')))
assert.deepEqual(restored.lastKnownGood.identities.identities,f.identities)
process.stdout.write('Actual hosted private identity evidence + exact public record subset/order -> typed payload + reviewed candidate parity; 13 negatives/deferred replacement PASS\n')

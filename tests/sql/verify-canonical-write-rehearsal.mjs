import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { prepareCanonicalPayloadWrite } from '../../src/server/canonicalPayloadWrite.ts'
import { decodeCatalogRows } from '../../src/server/catalogRows.ts'
import { decodeProjectionRows } from '../../src/server/projectionRows.ts'
import { payloadWriteFixture,writeLimits } from '../fixtures/canonicalPayloadWrite.mjs'
import { contract } from '../fixtures/syncReadFrame.mjs'
const actual=JSON.parse(readFileSync(process.argv[2],'utf8')),{f,current,candidate}=await payloadWriteFixture()
const {plan}=await prepareCanonicalPayloadWrite(candidate,contract,current,writeLimits)
assert.equal(actual.rollback_cases,2)
assert.deepEqual(decodeCatalogRows(actual.catalog,{identities:candidate.identities.identities}),plan.payload)
assert.equal(actual.reservations.domain_identity.length,4)
assert.ok(actual.reservations.domain_identity.some(n=>n.kind==='cosmetic'&&n.id==='fixture-cosmetic-reservation'))
assert.deepEqual(actual.reservations.source_crosswalk,[{source_id:'K02',kind:'item',source_key:"Legacy 'quoted' source",target_id:'tsa-cosmetic-9001'}])
assert.deepEqual(actual.reservations.alias.toSorted((a,b)=>a.from_id.localeCompare(b.from_id)),[
 {kind:'item',from_id:'fixture-alias',target_identity_id:'tsa-cosmetic-9001',target_alias_id:null},
 {kind:'item',from_id:'tsa-cosmetic-9002',target_identity_id:null,target_alias_id:'fixture-alias'}])
assert.deepEqual(actual.reservations.tombstone,[{kind:'item',id:'tsa-cosmetic-9002',retired_at:'2026-10-07T00:01:00Z',replacement_id:'tsa-cosmetic-9001'}])
assert.deepEqual(decodeProjectionRows(actual.oldProjection,'fixture-release'),f.snapshot)
assert.deepEqual(decodeProjectionRows(actual.nextProjection,'fixture-release-next'),candidate.publicFiles)
assert.deepEqual(actual.control,{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null})
process.stdout.write('Actual prepared SQL -> exact payload/private evidence/retention/position/alias/reservation/history parity; two injected rollbacks and repeated fragment PASS; no full SyncStore claim\n')

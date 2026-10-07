import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { createPostgresSyncStore } from '../../src/server/postgresSyncStore.ts'
import { privateSyncReader } from '../../src/server/postgresSyncRows.ts'
import { decodeProjectionRows } from '../../src/server/projectionRows.ts'
import { postgresSyncSequence } from '../fixtures/postgresSyncSequence.mjs'
import { scriptedDatabase,storeOptions,contract,decodeTables } from '../fixtures/postgresSyncStore.mjs'
const actual=JSON.parse(readFileSync(process.argv[2],'utf8')),expected=await postgresSyncSequence()
assert.equal(actual.rollback_cases,2);assert.equal(actual.phases,5);assert.ok(actual.query_checks>500)
assert.equal(actual.tables.sync_generation[0].revision,5);assert.equal(actual.tables.sync_generation[0].current_acceptance_revision,5)
const db=scriptedDatabase(actual.tables),store=createPostgresSyncStore(db,contract,storeOptions)
for(const sourceId of ['K15','K01']) assert.deepEqual(await store.read(sourceId),await decodeTables(expected.tables,sourceId))
const current=await store.read('K15')
assert.deepEqual(await db.transaction({isolation:'repeatable read',readOnly:true},connection=>privateSyncReader(connection,storeOptions.readLimits).canonical(current,contract)),expected.canonical)
for(const version of ['fixture-release','fixture-release-next']) {
 const rows=Object.fromEntries(['release_projection','release_projection_file'].map(t=>[t,actual.tables[t].filter(r=>r.catalog_version===version)]))
 const snapshot=version==='fixture-release'?expected.f.snapshot:current.lastKnownGood.publicFiles
 assert.deepEqual(decodeProjectionRows(rows,version),snapshot)
}
process.stdout.write(`Actual full Store SQL -> exact five-phase graph/payload/review/LKG/source-health history; ${actual.query_checks} selected-query checks/two whole publication rollbacks PASS; no connected concurrency/driver/auth claim\n`)

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { createProjectionRepository, decodeProjectionRows } from '../../src/server/projectionRows.ts'
import { createSnapshotRepository } from '../../src/server/domainSnapshot.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'

const rows=JSON.parse(readFileSync(process.argv[2],'utf8')),{snapshot}=releaseFixture()
assert.deepEqual(decodeProjectionRows(rows,'fixture-release'),snapshot)
const freshness={health:'healthy',lastSuccessAt:'2026-10-07T01:00:00Z',validUntil:null}
assert.deepEqual(await createProjectionRepository(rows,'fixture-release',freshness).readCatalog(),await createSnapshotRepository(snapshot,freshness).readCatalog())
process.stdout.write('Actual hosted immutable rows after canonical mutation -> exact historical bytes/repository parity PASS\n')

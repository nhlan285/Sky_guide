import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { decodeSyncMetadataRows } from '../../src/server/syncMetadataRows.ts'
import { syncMetadataFixture } from '../fixtures/syncMetadataRows.mjs'

const actual=JSON.parse(readFileSync(process.argv[2],'utf8'))
for(const source of ['K15','K01']) assert.deepEqual(decodeSyncMetadataRows(actual[source],source),decodeSyncMetadataRows(syncMetadataFixture(source),source))
process.stdout.write('Actual hosted CAS/audit frames -> global pointer + independent source metadata parity PASS\n')

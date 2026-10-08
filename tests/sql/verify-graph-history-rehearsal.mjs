import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import { decodeGraphHistoryRows } from '../../src/server/graphHistoryRows.ts'
import { graphHistoryFixture } from '../fixtures/graphHistoryRows.mjs'
const actual=JSON.parse(readFileSync(process.argv[2],'utf8')),first=graphHistoryFixture(),second=globalThis.structuredClone(first)
second.identities.relations=second.identities.relations.filter(r=>r.type!=='itemMedia')
const owner=second.identities.identities.find(n=>n.kind==='item'&&n.id==='shared');owner.revision=4;owner.updatedAt='2026-10-07T00:01:00Z'
assert.equal(actual.negative_cases,141)
assert.deepEqual(decodeGraphHistoryRows(actual.frames['1'],1),first)
assert.deepEqual(decodeGraphHistoryRows(actual.frames['2'],2),second)
process.stdout.write('Actual hosted graph history -> exact ordered fields/alias/retirement/all-kind parity; independent revisions and 141 native negatives PASS\n')

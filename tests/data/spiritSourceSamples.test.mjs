import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { sourceTree, sourceTreeContext, estimateSourcePath, sourceNodeKey, sourceVisits } from '../../src/features/spirits/sourceSamples.ts'
import { validateFriendshipGraph } from '../../src/data/catalog/friendship.ts'

const evidence = JSON.parse(readFileSync(new URL('../../knowledge/evidence/k02-regular-spirit-tree-2026-10-05.json', import.meta.url), 'utf8'))
test('runtime research graph retains all reviewed edges/costs and unresolved canonical identities', () => {
  assert.equal(sourceTree.nodes.length, 10)
  assert.equal(sourceTree.nodes.reduce((n, node) => n + node.parentNodeIds.length, 0), 9)
  for (const node of sourceTree.nodes) {
    const expected = evidence.sample.nodes.find(value => value.sourceNodeKey === sourceNodeKey(node.id))
    assert.deepEqual(node.parentNodeIds.map(sourceNodeKey), expected.parentSourceNodeKeys)
    assert.deepEqual(node.costs, expected.costs)
    assert.equal(node.costStatus, expected.costStatus)
    assert.equal(node.itemId, null)
    assert.equal(node.optional, null)
    assert.equal(node.recordStatus, 'draft', 'sample does not approve public catalogue export')
  }
  const corrupted = JSON.parse(JSON.stringify(sourceTree)); corrupted.nodes[0].parentNodeIds = [corrupted.nodes[0].id]
  assert.equal(validateFriendshipGraph(corrupted, sourceTreeContext).valid, false)
})
test('overlapping source paths reproduce reviewed unique subtotals while root remains unknown', () => {
  for (const sample of evidence.sample.pathSamples) {
    const selected = sourceTree.nodes.filter(node => sample.selectedSourceNodeKeys.includes(sourceNodeKey(node.id))).map(node => node.id)
    const result = estimateSourcePath([...selected, ...selected]); assert.equal(result.valid, true)
    assert.deepEqual(result.value.includedNodeIds.map(sourceNodeKey).sort(), [...sample.uniquePathNodeKeys].sort())
    assert.deepEqual(Object.fromEntries(result.value.knownSubtotal.map(cost => [cost.sourceCurrencyLabel, cost.amount])), sample.knownSubtotal)
    assert.equal(result.value.complete, false)
    assert.deepEqual(result.value.missingCostNodeIds.map(sourceNodeKey), ['C1'])
  }
  assert.equal(estimateSourcePath(['unknown-node']).valid, false)
  assert.equal(estimateSourcePath([]).valid, false)
})
test('repeat visits have distinct stable keys and preserve date-only/unknown end and tree', () => {
  assert.equal(sourceVisits.length, 2)
  assert.equal(new Set(sourceVisits.map(visit => visit.id)).size, 2)
  assert.deepEqual(sourceVisits.map(visit => visit.sourceVisitKey).sort(), ['TS#115', 'TS#12'])
  for (const visit of sourceVisits) {
    assert.equal(visit.spiritName, 'Leaping Dancer')
    assert.equal(visit.startsAt.precision, 'date'); assert.equal(visit.startsAt.timezone, null)
    assert.equal(visit.endsAt, null); assert.equal(visit.treeId, null); assert.equal(visit.canonicalSpiritId, null)
  }
})

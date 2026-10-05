import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateFriendshipPath, validateFriendshipInput } from '../../src/data/catalog/index.ts'

// Synthetic draft graph only; these IDs/prices are not game data.
const context = {
  provenanceIds: new Set(['fixture-source']), spiritIds: new Set(['fixture-spirit']),
  itemIds: new Set(), treeIds: new Set(), nodeIds: new Set(), seasonIds: new Set(),
  realmIds: new Set(), mapIds: new Set(), articleIds: new Set(), assetIds: new Set(),
  ruleIds: new Set(), iapProductIds: new Set(), visitIds: new Set(),
}
const meta = () => ({ fixture: true, recordStatus: 'draft', updatedAt: '2026-01-01T00:00:00Z', provenanceIds: ['fixture-source'] })
const cost = (amount, currency = 'candle', sourceCurrencyLabel = 'fixture-C') => ({ amount, currency, sourceCurrencyLabel })
const node = (id, parents, costs, costStatus = 'known') => ({
  ...meta(), id, treeId: 'fixture-tree', itemId: null, label: 'Fixture node',
  parentNodeIds: parents, costs, costStatus, optional: null,
  fieldProvenance: { parentNodeIds: ['fixture-source'], costs: ['fixture-source'] },
})
const graph = () => ({
  trees: [{ ...meta(), id: 'fixture-tree', spiritId: 'fixture-spirit', variant: 'regular', visitId: null, nodeIds: ['root', 'a', 'b', 'tip', 'sibling'] }],
  nodes: [node('root', [], [cost(1)]), node('a', ['root'], [cost(2)]), node('b', ['root'], [cost(3)]), node('tip', ['a', 'b'], [cost(4)]), node('sibling', ['root'], [cost(50)])],
})
const selection = nodeIds => ({ treeId: 'fixture-tree', nodeIds })
const calculate = (g, ids) => calculateFriendshipPath(g, context, selection(ids))

test('manual versioned file projects graph, keeps node provenance and does not mutate', () => {
  const g = graph(), input = { schemaVersion: 1, graph: g, privateNote: 'discard' }, before = globalThis.structuredClone(input)
  const result = validateFriendshipInput(input, context)
  assert.equal(result.valid, true)
  assert.deepEqual(result.value, { schemaVersion: 1, graph: g })
  assert.deepEqual(input, before)
  for (const version of [undefined, 2, '1', null]) assert.equal(validateFriendshipInput({ ...input, schemaVersion: version }, context).valid, false)
  assert.equal(validateFriendshipInput({ schemaVersion: 1, graph: { trees: [], nodes: [] } }, context).valid, false)
})

test('manual input cannot stage approved/published records or invent a real source', () => {
  for (const status of ['reviewed', 'published', 'retired']) {
    const g = graph(); g.nodes[0].recordStatus = status
    assert.equal(validateFriendshipInput({ schemaVersion: 1, graph: g }, context).valid, false)
  }
  const g = graph(); g.nodes[0].fixture = false; g.nodes[0].provenanceIds = []
  assert.equal(validateFriendshipInput({ schemaVersion: 1, graph: g }, context).valid, false)
})

test('diamond closure and overlapping/duplicate selection count ancestors once, excluding siblings', () => {
  const g = graph(), before = globalThis.structuredClone(g), result = calculate(g, ['tip', 'a', 'tip'])
  assert.equal(result.valid, true)
  assert.deepEqual(result.value.includedNodeIds, ['a', 'b', 'root', 'tip'])
  assert.deepEqual(result.value.selectedNodeIds, ['a', 'tip'])
  assert.deepEqual(result.value.knownSubtotal, [cost(10)])
  assert.equal(result.value.complete, true)
  assert.deepEqual(g, before)
  assert.deepEqual(calculate(g, ['a', 'tip']).value, result.value)
})

test('unknown root remains incomplete even if all selected leaf costs are known', () => {
  const g = graph(); g.nodes[0].costStatus = 'unknown'; g.nodes[0].costs = []
  const result = calculate(g, ['tip'])
  assert.equal(result.valid, true)
  assert.equal(result.value.complete, false)
  assert.deepEqual(result.value.missingCostNodeIds, ['root'])
  assert.deepEqual(result.value.knownSubtotal, [cost(9)])
})

test('partial node amounts retain known subtotal without coercing null to zero', () => {
  const g = graph(); g.nodes[0].costStatus = 'unknown'; g.nodes[0].costs = [cost(2), cost(null, 'other', 'fixture-AC')]
  const result = calculate(g, ['a'])
  assert.equal(result.valid, true)
  assert.deepEqual(result.value.knownSubtotal, [cost(4)])
  assert.equal(result.value.complete, false)
  assert.deepEqual(result.value.missingCostNodeIds, ['root'])
})

test('explicit known zero and free are accepted without converting unknown to free', () => {
  const g = graph(); g.nodes[0].costs = [cost(0)]; g.nodes[1].costs = []; g.nodes[1].costStatus = 'free'
  const result = calculate(g, ['a'])
  assert.equal(result.valid, true)
  assert.equal(result.value.complete, true)
  assert.deepEqual(result.value.knownSubtotal, [cost(0)])
  assert.equal(g.nodes[0].costStatus, 'known'); assert.equal(g.nodes[1].costStatus, 'free')
})

test('currency kinds and exact raw labels never merge into a converted number', () => {
  const g = graph(); g.nodes[0].costs = [cost(1), cost(2, 'other', 'fixture-AC'), cost(3, 'other', 'fixture-event')]
  g.nodes[1].costs = [cost(4, 'candle', 'unreviewed-alias')]
  const result = calculate(g, ['a'])
  assert.equal(result.valid, true)
  assert.equal(result.value.knownSubtotal.length, 4)
  assert.deepEqual(result.value.knownSubtotal.find(c => c.sourceCurrencyLabel === 'fixture-AC'), cost(2, 'other', 'fixture-AC'))
})

test('invalid graph, missing node/tree, empty selection and cross-tree node fail without estimate', () => {
  const cycle = graph(); cycle.nodes[0].parentNodeIds = ['tip']
  const orphan = graph(); orphan.nodes[0].parentNodeIds = ['absent']
  for (const g of [cycle, orphan, null]) assert.equal(calculate(g, ['a']).valid, false)
  for (const ids of [[], ['absent'], [1]]) assert.equal(calculate(graph(), ids).valid, false)
  assert.equal(calculateFriendshipPath(graph(), context, { treeId: 'absent', nodeIds: ['root'] }).valid, false)
  const g = graph(); g.trees.push({ ...meta(), id: 'other-tree', spiritId: 'fixture-spirit', variant: 'regular', visitId: null, nodeIds: ['other-node'] })
  g.nodes.push({ ...node('other-node', [], [], 'free'), treeId: 'other-tree' })
  assert.equal(calculate(g, ['other-node']).valid, false)
})

test('safe integer overflow rejects totals rather than rounding', () => {
  const g = graph(); g.nodes[0].costs = [cost(Number.MAX_SAFE_INTEGER)]; g.nodes[1].costs = [cost(1)]
  const result = calculate(g, ['a'])
  assert.equal(result.valid, false)
  assert.equal(Object.hasOwn(result, 'value'), false)
})

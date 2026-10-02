import assert from 'node:assert/strict'
import test from 'node:test'
import { object, validateString } from '../../src/data/core/index.ts'
import {
  validateAcquisitionOption, validateEvent, validateFriendshipGraph, validateFriendshipNode,
  validateFriendshipTree, validateItem, validateItems, validateLocalizedText,
  validateSeason, validateSeasonEvent, validateSeasonEvents, validateSpirit, validateSpirits,
  validateTravelingSpiritPrediction, validateTravelingSpiritPredictions,
  validateTravelingSpiritVisit, validateTravelingSpiritVisits,
} from '../../src/data/catalog/index.ts'

// All records below are project-internal synthetic fixtures, never Sky source data.
const context = {
  provenanceIds: new Set(['fixture-provenance-a']),
  itemIds: new Set(['fixture-item-a']), spiritIds: new Set(['fixture-spirit-a']),
  treeIds: new Set(['fixture-tree-a', 'fixture-tree-b']),
  nodeIds: new Set(['fixture-node-a', 'fixture-node-b']),
  seasonIds: new Set(['fixture-season-a']), realmIds: new Set(['fixture-realm-a']),
  mapIds: new Set(['fixture-map-a']), articleIds: new Set(['fixture-article-a']),
  assetIds: new Set(['fixture-asset-a']), ruleIds: new Set(['fixture-rule-a']),
  iapProductIds: new Set(['fixture-iap-a']), visitIds: new Set(['fixture-visit-a']),
}
const metadata = () => ({
  fixture: true, recordStatus: 'draft', updatedAt: '2024-01-01T00:00:00Z',
  provenanceIds: ['fixture-provenance-a'],
})
const name = () => ({ default: 'Generic fixture label', translations: { 'fixture-lang': 'Generic translated fixture label' } })
const date = value => ({ value, precision: 'date', timezone: null, rawLabel: null })
const instant = value => ({ value, precision: 'instant', timezone: null, rawLabel: null })
const cost = amount => ({ currency: 'other', sourceCurrencyLabel: 'fixture-currency', amount })
const acquisition = () => ({
  id: 'fixture-acquisition-a', kind: 'unknown', costs: [], costStatus: 'unknown',
  friendshipNodeId: null, iapProductId: null, validFrom: null, validTo: null,
  provenanceIds: ['fixture-provenance-a'],
})
const item = () => ({
  ...metadata(), id: 'fixture-item-a', sourceKeys: {}, name: name(), slot: 'mask', rawSlot: null,
  accessoryAnchor: null, seasonIds: ['fixture-season-a'], spiritIds: ['fixture-spirit-a'],
  acquisitionOptions: [acquisition()], assetIds: ['fixture-asset-a'], dyeRegions: [],
  dyeStatus: 'unknown', ruleIds: ['fixture-rule-a'], compatibility: null,
})
const spirit = () => ({
  ...metadata(), id: 'fixture-spirit-a', name: name(), category: 'regular', realmId: null,
  seasonIds: ['fixture-season-a'], treeIds: ['fixture-tree-a'],
})
const tree = () => ({
  ...metadata(), id: 'fixture-tree-a', spiritId: 'fixture-spirit-a', variant: 'regular',
  visitId: null, nodeIds: ['fixture-node-a', 'fixture-node-b'],
})
const node = (id = 'fixture-node-a', parents = []) => ({
  ...metadata(), id, treeId: 'fixture-tree-a', itemId: null, label: 'Generic fixture node',
  parentNodeIds: parents, costs: [], costStatus: 'unknown', optional: null,
})
const graph = () => ({ trees: [tree()], nodes: [node(), node('fixture-node-b', ['fixture-node-a'])] })
const season = (kind = 'season') => ({
  ...metadata(), id: kind === 'season' ? 'fixture-season-a' : 'fixture-event-a', kind, name: name(),
  startsAt: date('2024-01-01'), endsAt: date('2024-01-02'), timeStatus: 'confirmed', summary: null,
  spiritIds: ['fixture-spirit-a'], itemIds: ['fixture-item-a'], realmIds: ['fixture-realm-a'],
  mapIds: ['fixture-map-a'], officialArticleIds: ['fixture-article-a'],
  fieldProvenance: { startsAt: ['fixture-provenance-a'] },
})
const visit = (id = 'fixture-visit-a') => ({
  ...metadata(), id, spiritId: 'fixture-spirit-a', startsAt: date('2024-01-01'),
  endsAt: date('2024-01-02'), status: 'confirmed', treeId: null, fieldProvenance: {},
})
const prediction = () => ({
  ...metadata(), id: 'fixture-prediction-a', candidateSpiritIds: ['fixture-spirit-a'],
  targetWindow: { start: null, end: null }, methodDescription: 'Synthetic fixture method, no game prediction',
  generatedAt: '2024-01-01T00:00:00Z', inputDataVersion: 'fixture-version-a', confidenceLabel: null,
})
function errorAt(result, path, code) {
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.code === code && JSON.stringify(error.path) === JSON.stringify(path)), JSON.stringify(result))
}

test('LocalizedText validates strings and projects fields without translating names', () => {
  assert.deepEqual(validateLocalizedText({ ...name(), extra: 'fixture-private-value' }), { valid: true, value: name() })
  errorAt(validateLocalizedText({ default: 42, translations: {} }), ['default'], 'invalid_type')
  errorAt(validateLocalizedText({ default: 'Fixture', translations: { 'fixture-lang': { nested: 'fixture' } } }), ['translations', 'fixture-lang'], 'invalid_type')
  assert.equal(validateLocalizedText({ default: 'Fixture', translations: [] }).valid, false)
  const input = JSON.parse('{"default":"Fixture","translations":{"__proto__":"Fixture"}}')
  assert.equal(Object.hasOwn(validateLocalizedText(input).value.translations, '__proto__'), true)
})

test('valid Item fixture preserves nulls, identity and unknown raw slot without guessing', () => {
  assert.deepEqual(validateItem(item(), context), { valid: true, value: item() })
  const input = { ...item(), slot: 'unknown', rawSlot: 'fixture-unmapped-slot' }
  assert.deepEqual(validateItem(input, context).value, input)
  errorAt(validateItem({ ...item(), slot: 'fixture-invalid-slot' }, context), ['slot'], 'invalid_value')
})

test('Item FK validation checks seasons, spirits and future asset/rule references', () => {
  for (const field of ['seasonIds', 'spiritIds', 'assetIds', 'ruleIds']) {
    errorAt(validateItem({ ...item(), [field]: ['fixture-missing'] }, context), [field, 0], 'unknown_reference')
  }
  const input = item()
  delete input.spiritIds
  errorAt(validateItem(input, context), ['spiritIds'], 'missing_field')
})

test('Item acquisitions expose nested stable paths and keep unknown/free/zero distinct', () => {
  const unknown = validateAcquisitionOption(acquisition(), context)
  assert.equal(unknown.value.costStatus, 'unknown')
  assert.deepEqual(unknown.value.costs, [])
  const free = validateAcquisitionOption({ ...acquisition(), costStatus: 'free' }, context)
  assert.equal(free.value.costStatus, 'free')
  const zero = validateAcquisitionOption({ ...acquisition(), costs: [cost(0)], costStatus: 'known' }, context)
  assert.equal(zero.value.costStatus, 'known')
  assert.equal(zero.value.costs[0].amount, 0)
  const invalid = { ...item(), acquisitionOptions: [{ ...acquisition(), costs: [cost('1')] }] }
  const result = validateItem(invalid, context)
  errorAt(result, ['acquisitionOptions', 0, 'costs', 0, 'amount'], 'invalid_type')
  assert.deepEqual(result, validateItem(invalid, context))
  assert.equal(validateAcquisitionOption({ ...acquisition(), costs: [cost(1)], costStatus: 'free' }, context).valid, false)
  assert.equal(validateAcquisitionOption({ ...acquisition(), costs: [cost(null)], costStatus: 'known' }, context).valid, false)
  const missing = acquisition()
  delete missing.costs
  errorAt(validateAcquisitionOption(missing, context), ['costs'], 'missing_field')
})

test('AcquisitionOption links and provenance resolve; nullable unknown links stay null', () => {
  assert.equal(validateAcquisitionOption({ ...acquisition(), kind: 'iap', iapProductId: 'fixture-iap-a', friendshipNodeId: 'fixture-node-a' }, context).valid, true)
  for (const field of ['iapProductId', 'friendshipNodeId']) errorAt(validateAcquisitionOption({ ...acquisition(), [field]: 'fixture-missing' }, context), [field], 'unknown_reference')
  errorAt(validateAcquisitionOption({ ...acquisition(), provenanceIds: ['fixture-missing'] }, context), ['provenanceIds', 0], 'unknown_provenance')
  errorAt(validateAcquisitionOption({ ...acquisition(), kind: 'fixture-invalid' }, context), ['kind'], 'invalid_value')
})

test('Item metadata extension is fail-closed, supplied validators project only declared fields', () => {
  errorAt(validateItem({ ...item(), dyeRegions: [{ id: 'fixture-region-a' }] }, context), ['dyeRegions', 0], 'invalid_value')
  errorAt(validateItem({ ...item(), compatibility: {} }, context), ['compatibility'], 'invalid_value')
  // Generic extension fixture only; not a Wardrobe/DyeRegion schema implementation.
  const extensions = { compatibility: value => object(value, { label: validateString }) }
  const result = validateItem({ ...item(), compatibility: { label: 'fixture-policy', extra: 'fixture-private' } }, context, extensions)
  assert.deepEqual(result.value.compatibility, { label: 'fixture-policy' })
})

test('common metadata validates fixture/nonfixture provenance and optional field provenance', () => {
  assert.equal(validateItem({ ...item(), fixture: true, provenanceIds: [] }, context).valid, true)
  errorAt(validateItem({ ...item(), fixture: false, provenanceIds: [] }, context), ['provenanceIds'], 'invalid_value')
  errorAt(validateItem({ ...item(), fixture: 'true' }, context), ['fixture'], 'invalid_type')
  errorAt(validateItem({ ...item(), recordStatus: 'fixture-invalid' }, context), ['recordStatus'], 'invalid_value')
  const input = { ...item(), fieldProvenance: { name: ['fixture-provenance-a'] } }
  assert.deepEqual(validateItem(input, context).value, input)
  errorAt(validateItem({ ...item(), fieldProvenance: { name: ['fixture-missing'] } }, context), ['fieldProvenance', 'name', 0], 'unknown_provenance')
  const projected = validateItem({ ...item(), extra: { private: 'fixture-private' } }, context).value
  assert.equal(Object.hasOwn(projected, 'extra'), false)
  assert.equal(Object.hasOwn(projected, 'fieldProvenance'), false)
})

test('Spirit category and season/tree/realm references follow schema, not visit identity', () => {
  assert.deepEqual(validateSpirit(spirit(), context), { valid: true, value: spirit() })
  errorAt(validateSpirit({ ...spirit(), category: 'traveling' }, context), ['category'], 'invalid_value')
  for (const field of ['seasonIds', 'treeIds']) errorAt(validateSpirit({ ...spirit(), [field]: ['fixture-missing'] }, context), [field, 0], 'unknown_reference')
  errorAt(validateSpirit({ ...spirit(), realmId: 'fixture-missing' }, context), ['realmId'], 'unknown_reference')
})

test('Friendship graph accepts a small acyclic bundle without modifying records/context', () => {
  const input = graph()
  const before = globalThis.structuredClone(input)
  const result = validateFriendshipGraph(input, context)
  assert.deepEqual(result, { valid: true, value: before })
  assert.deepEqual(input, before)
  assert.deepEqual([...context.treeIds], ['fixture-tree-a', 'fixture-tree-b'])
})

test('Friendship FK validation checks tree spirit/visit and node tree/item', () => {
  errorAt(validateFriendshipTree({ ...tree(), spiritId: 'fixture-missing' }, context), ['spiritId'], 'unknown_reference')
  errorAt(validateFriendshipTree({ ...tree(), visitId: 'fixture-missing' }, context), ['visitId'], 'unknown_reference')
  for (const field of ['treeId', 'itemId']) errorAt(validateFriendshipNode({ ...node(), [field]: 'fixture-missing' }, context), [field], 'unknown_reference')
  assert.equal(validateFriendshipNode({ ...node(), itemId: 'fixture-item-a', costs: [cost(0)], costStatus: 'known', optional: false }, context).valid, true)
})

test('Friendship graph rejects unresolved nodes and duplicate node references', () => {
  const missing = graph()
  missing.trees[0].nodeIds.push('fixture-missing')
  errorAt(validateFriendshipGraph(missing, context), ['trees', 0, 'nodeIds', 2], 'unknown_reference')
  const duplicate = graph()
  duplicate.trees[0].nodeIds.push('fixture-node-a')
  errorAt(validateFriendshipGraph(duplicate, context), ['trees', 0, 'nodeIds', 2], 'duplicate_id')
  const parents = graph()
  parents.nodes[1].parentNodeIds.push('fixture-node-a')
  errorAt(validateFriendshipGraph(parents, context), ['nodes', 1, 'parentNodeIds', 1], 'duplicate_id')
})

test('Friendship graph enforces membership both directions and same-tree parents', () => {
  const input = graph()
  input.nodes[0].treeId = 'fixture-tree-b'
  input.trees.push({ ...tree(), id: 'fixture-tree-b', nodeIds: ['fixture-node-a'] })
  input.trees[0].nodeIds = ['fixture-node-b']
  errorAt(validateFriendshipGraph(input, context), ['nodes', 1, 'parentNodeIds', 0], 'invalid_relationship')
  const listedElsewhere = graph()
  listedElsewhere.trees.push({ ...tree(), id: 'fixture-tree-b', nodeIds: ['fixture-node-a'] })
  errorAt(validateFriendshipGraph(listedElsewhere, context), ['trees', 1, 'nodeIds', 0], 'invalid_relationship')
  const unlisted = graph()
  unlisted.trees[0].nodeIds = ['fixture-node-a']
  errorAt(validateFriendshipGraph(unlisted, context), ['nodes', 1, 'treeId'], 'invalid_relationship')
})

test('Friendship graph rejects self-parent and multi-node cycles deterministically', () => {
  const self = graph()
  self.nodes[0].parentNodeIds = ['fixture-node-a']
  errorAt(validateFriendshipGraph(self, context), ['nodes', 0, 'parentNodeIds', 0], 'cyclic_graph')
  const cycle = graph()
  cycle.nodes[0].parentNodeIds = ['fixture-node-b']
  const result = validateFriendshipGraph(cycle, context)
  errorAt(result, ['nodes', 1, 'parentNodeIds', 0], 'cyclic_graph')
  assert.deepEqual(result, validateFriendshipGraph(cycle, context))
})

test('Friendship graph rejects duplicate tree/node record IDs', () => {
  const input = graph()
  input.nodes.push(node())
  errorAt(validateFriendshipGraph(input, context), ['nodes', 2, 'id'], 'duplicate_id')
  const trees = graph()
  trees.trees.push(tree())
  errorAt(validateFriendshipGraph(trees, context), ['trees', 1, 'id'], 'duplicate_id')
})

test('Season/Event accept confirmed date data unchanged and keep concrete kinds separate', () => {
  assert.deepEqual(validateSeason(season(), context), { valid: true, value: season() })
  assert.deepEqual(validateEvent(season('event'), context), { valid: true, value: season('event') })
  assert.equal(validateSeason(season('event'), context).valid, false)
  assert.equal(validateEvent(season(), context).valid, false)
  const result = validateSeasonEvent(season(), context)
  assert.equal(result.value.startsAt.precision, 'date')
  assert.equal(result.value.startsAt.timezone, null)
  assert.equal(Object.hasOwn(result.value, 'active'), false)
})

test('Season/Event validate vocabulary, relation registries and field-level provenance', () => {
  for (const field of ['kind', 'timeStatus']) errorAt(validateSeasonEvent({ ...season(), [field]: 'fixture-invalid' }, context), [field], 'invalid_value')
  for (const field of ['spiritIds', 'itemIds', 'realmIds', 'mapIds', 'officialArticleIds']) errorAt(validateSeasonEvent({ ...season(), [field]: ['fixture-missing'] }, context), [field, 0], 'unknown_reference')
  errorAt(validateSeasonEvent({ ...season(), fieldProvenance: { endsAt: ['fixture-missing'] } }, context), ['fieldProvenance', 'endsAt', 0], 'unknown_provenance')
  errorAt(validateSeasonEvent({ ...season(), fieldProvenance: null }, context), ['fieldProvenance'], 'invalid_type')
})

test('time ranges reject reversed comparable dates/instants, preserving mixed/unknown precision', () => {
  errorAt(validateSeasonEvent({ ...season(), endsAt: date('2023-12-31') }, context), ['endsAt'], 'invalid_value')
  const equalInstant = { ...season(), startsAt: instant('2024-01-01T07:00:00+07:00'), endsAt: instant('2024-01-01T00:00:00Z') }
  assert.equal(validateSeasonEvent(equalInstant, context).valid, true)
  errorAt(validateSeasonEvent({ ...equalInstant, endsAt: instant('2023-12-31T23:59:59Z') }, context), ['endsAt'], 'invalid_value')
  const fractional = { ...season(), startsAt: instant('2024-01-01T00:00:00.000002Z'), endsAt: instant('2024-01-01T00:00:00.000001Z') }
  errorAt(validateSeasonEvent(fractional, context), ['endsAt'], 'invalid_value')
  assert.equal(validateSeasonEvent({ ...season(), endsAt: instant('2024-01-01T00:00:00Z') }, context).valid, true)
  assert.equal(validateSeasonEvent({ ...season(), startsAt: { ...date('fixture-unknown'), precision: 'unknown' } }, context).valid, true)
  errorAt(validateAcquisitionOption({ ...acquisition(), validFrom: date('2024-01-02'), validTo: date('2024-01-01') }, context), ['validTo'], 'invalid_value')
})

test('Visit collection keeps distinct visits for the same spirit and rejects invalid FKs', () => {
  const a = visit()
  const b = { ...visit('fixture-visit-b'), startsAt: date('2024-02-01'), endsAt: date('2024-02-02') }
  const result = validateTravelingSpiritVisits([a, b], context)
  assert.deepEqual(result, { valid: true, value: [a, b] })
  for (const field of ['spiritId', 'treeId']) errorAt(validateTravelingSpiritVisit({ ...a, [field]: 'fixture-missing' }, context), [field], 'unknown_reference')
  errorAt(validateTravelingSpiritVisit({ ...a, status: 'prediction' }, context), ['status'], 'invalid_value')
  errorAt(validateTravelingSpiritVisits([a, a], context), [1, 'id'], 'duplicate_id')
})

test('Prediction validates independently; candidates, method and version are explicit', () => {
  assert.deepEqual(validateTravelingSpiritPrediction(prediction(), context), { valid: true, value: prediction() })
  errorAt(validateTravelingSpiritPrediction({ ...prediction(), candidateSpiritIds: ['fixture-missing'] }, context), ['candidateSpiritIds', 0], 'unknown_reference')
  for (const field of ['methodDescription', 'inputDataVersion']) errorAt(validateTravelingSpiritPrediction({ ...prediction(), [field]: ' ' }, context), [field], 'invalid_value')
  errorAt(validateTravelingSpiritPrediction({ ...prediction(), confidenceLabel: 0.9 }, context), ['confidenceLabel'], 'invalid_type')
  errorAt(validateTravelingSpiritPrediction({ ...prediction(), generatedAt: '2024-01-01T00:00:00' }, context), ['generatedAt'], 'invalid_instant')
  assert.equal(Object.hasOwn(validateTravelingSpiritPrediction({ ...prediction(), probability: 0.9 }, context).value, 'probability'), false)
})

test('Visit and Prediction cannot enter each other collection, even as hybrid records', () => {
  assert.equal(validateTravelingSpiritVisits([prediction()], context).valid, false)
  assert.equal(validateTravelingSpiritPredictions([visit()], context).valid, false)
  const hybrid = { ...visit(), ...prediction() }
  assert.equal(validateTravelingSpiritVisit(hybrid, context).valid, false)
  assert.equal(validateTravelingSpiritPrediction(hybrid, context).valid, false)
})

test('domain collections enforce unique IDs, with no repair or record merging', () => {
  for (const [validate, fixture] of [[validateItems, item], [validateSpirits, spirit], [validateSeasonEvents, season], [validateTravelingSpiritPredictions, prediction]]) {
    errorAt(validate([fixture(), fixture()], context), [1, 'id'], 'duplicate_id')
    assert.equal(validate([fixture()], context).valid, true)
    assert.equal(validate(null, context).valid, false)
  }
})

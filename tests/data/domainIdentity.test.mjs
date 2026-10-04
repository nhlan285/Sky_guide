import assert from 'node:assert/strict'
import test from 'node:test'
import { validateIdentityGraph } from '../../src/data/domain/identity.ts'

// Entirely synthetic. The K15 key below tests registry scoping, not source data.
const identity = (kind, id) => ({ kind, id, revision: 1, schemaVersion: 1, updatedAt: '2026-10-04T00:00:00Z', retiredAt: null, fixture: true, provenanceIds: [] })
const graph = () => ({ identities: [identity('item', 'tsa-cosmetic-1'), identity('sampleSet', 'fixture-samples'), identity('instrument', 'fixture-instrument')], relations: [
  { type: 'instrumentItem', fromId: 'fixture-instrument', toId: 'tsa-cosmetic-1' },
  { type: 'instrumentSamples', fromId: 'fixture-instrument', toId: 'fixture-samples' },
], crosswalks: [{ sourceId: 'K15', sourceKey: '1', target: { kind: 'item', id: 'tsa-cosmetic-1' } }], aliases: [], tombstones: [] })
const validate = (value, previous) => validateIdentityGraph(value, new Set(['fixture-provenance']), new Set(['K15', 'K01']), previous)

test('portable identities retain stable K15 IDs and deduplicate shared sample sets', () => {
  const value = graph()
  value.identities.push(identity('item', 'fixture-variant'), identity('instrument', 'fixture-variant-instrument'))
  value.relations.push({ type: 'instrumentItem', fromId: 'fixture-variant-instrument', toId: 'fixture-variant' }, { type: 'instrumentSamples', fromId: 'fixture-variant-instrument', toId: 'fixture-samples' })
  assert.equal(validate(value).valid, true)
  value.crosswalks.push({ sourceId: 'K01', sourceKey: '1', target: { kind: 'item', id: 'fixture-variant' } })
  assert.equal(validate(value).valid, true)
  value.crosswalks.push({ sourceId: 'K15', sourceKey: '1', target: { kind: 'item', id: 'fixture-variant' } })
  assert.equal(validate(value).valid, false)
})

test('rejects dangling, missing, duplicate and incorrect-cardinality foreign keys', () => {
  for (const mutate of [
    value => value.identities.push(value.identities[0]),
    value => { value.relations[0].toId = 'missing' },
    value => value.relations.pop(),
    value => value.relations.push(value.relations[0]),
    value => { value.identities.push(identity('sampleSet', 'fixture-second')); value.relations.push({ type: 'instrumentSamples', fromId: 'fixture-instrument', toId: 'fixture-second' }) },
    value => { value.crosswalks[0].sourceId = 'unregistered' },
    value => { value.identities[0].fixture = false },
    value => { value.identities[0].provenanceIds = ['missing'] },
    value => { value.identities[0].revision = 0 },
    value => { value.identities[0].schemaVersion = 2 },
  ]) {
    const value = graph(); mutate(value)
    assert.equal(validate(value).valid, false)
  }
})

test('aliases resolve without ID reuse, cycles, kind changes or hidden retirement', () => {
  const value = graph()
  const old = identity('item', 'fixture-retired')
  old.retiredAt = old.updatedAt
  value.identities.push(old)
  const target = { kind: 'item', id: 'tsa-cosmetic-1' }
  value.tombstones.push({ target: { kind: old.kind, id: old.id }, retiredAt: old.retiredAt, replacement: target })
  value.aliases.push({ from: { kind: old.kind, id: old.id }, to: target })
  assert.equal(validate(value).valid, true)
  const resurrected = globalThis.structuredClone(value)
  resurrected.identities.at(-1).retiredAt = null
  resurrected.identities.at(-1).revision++
  resurrected.tombstones = []; resurrected.aliases = []
  assert.equal(validate(resurrected, value).valid, false)
  value.aliases.push({ from: target, to: { kind: old.kind, id: old.id } })
  assert.equal(validate(value).valid, false)
  const cycle = graph()
  cycle.aliases = [{ from: { kind: 'item', id: 'old-a' }, to: { kind: 'item', id: 'old-b' } }, { from: { kind: 'item', id: 'old-b' }, to: { kind: 'item', id: 'old-a' } }]
  assert.equal(validate(cycle).errors[0].code, 'cyclic_graph')
})

test('new snapshots preserve identity history and require changed revisions', () => {
  const previous = graph()
  const reordered = globalThis.structuredClone(previous)
  reordered.identities = reordered.identities.map(node => Object.fromEntries(Object.entries(node).reverse()))
  assert.equal(validate(reordered, previous).valid, true)
  const next = globalThis.structuredClone(previous)
  next.identities[0].provenanceIds = ['fixture-provenance']
  assert.equal(validate(next, previous).valid, false)
  next.identities[0].revision++
  assert.equal(validate(next, previous).valid, true)
  next.crosswalks = []
  assert.equal(validate(next, previous).valid, false)
  assert.equal(validate(graph(), next).valid, false)
})

test('event rule and override references must belong to the same event', () => {
  const value = graph()
  value.identities.push(identity('event', 'fixture-event-a'), identity('event', 'fixture-event-b'), identity('eventRule', 'fixture-rule'), identity('eventOverride', 'fixture-override'))
  value.relations.push({ type: 'ruleEvent', fromId: 'fixture-rule', toId: 'fixture-event-a' }, { type: 'overrideEvent', fromId: 'fixture-override', toId: 'fixture-event-b' }, { type: 'overrideRule', fromId: 'fixture-override', toId: 'fixture-rule' })
  assert.equal(validate(value).valid, false)
  value.relations.find(edge => edge.type === 'overrideEvent').toId = 'fixture-event-a'
  assert.equal(validate(value).valid, true)
})

test('identity parser strips operational fields and rejects malformed input', () => {
  const value = graph()
  value.identities[0].privateEvidence = 'not-public'
  assert.equal('privateEvidence' in validate(value).value.identities[0], false)
  for (const bad of [null, {}, [], { ...value, identities: [null] }]) assert.equal(validate(bad).valid, false)
})

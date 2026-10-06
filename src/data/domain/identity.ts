import { enumeration, failure, nullable, object, success, validateDateTime, validateId } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import { array, boolean, nonBlank } from '../catalog/shared.ts'

export const entityKinds = ['item', 'spirit', 'season', 'location', 'cosmetic', 'event', 'eventRule', 'eventOverride', 'eventOccurrence', 'sampleSet', 'instrument', 'emote', 'call', 'media'] as const
export type EntityKind = typeof entityKinds[number]
export interface EntityRef { kind: EntityKind; id: string }
export interface Identity extends EntityRef {
  revision: number
  schemaVersion: 1
  updatedAt: string
  retiredAt: string | null
  fixture: boolean
  provenanceIds: string[]
}
export interface Crosswalk { sourceId: string; sourceKey: string; target: EntityRef }
export interface Alias { from: EntityRef; to: EntityRef }
export interface Tombstone { target: EntityRef; retiredAt: string; replacement: EntityRef | null }

// The graph validates keys/cardinalities, not entity payloads or publication rights.
// Payload validation stays with each domain's existing typed validator.
export const relations = {
  itemSeason: ['item', 'season', 'many'], itemSpirit: ['item', 'spirit', 'many'],
  spiritSeason: ['spirit', 'season', 'many'], spiritLocation: ['spirit', 'location', 'one'],
  cosmeticItem: ['cosmetic', 'item', 'required'], eventLocation: ['event', 'location', 'many'],
  ruleEvent: ['eventRule', 'event', 'required'], overrideEvent: ['eventOverride', 'event', 'required'],
  overrideRule: ['eventOverride', 'eventRule', 'one'], occurrenceEvent: ['eventOccurrence', 'event', 'required'],
  occurrenceRule: ['eventOccurrence', 'eventRule', 'one'], occurrenceOverride: ['eventOccurrence', 'eventOverride', 'one'],
  instrumentItem: ['instrument', 'item', 'required'], instrumentSamples: ['instrument', 'sampleSet', 'required'],
  emoteItem: ['emote', 'item', 'required'], callItem: ['call', 'item', 'required'],
  itemMedia: ['item', 'media', 'many'], emoteMedia: ['emote', 'media', 'many'],
  callMedia: ['call', 'media', 'many'], sampleMedia: ['sampleSet', 'media', 'many'],
} as const
export interface Relation { type: keyof typeof relations; fromId: string; toId: string }
const relationTypes = Object.keys(relations) as Relation['type'][]
export interface IdentityGraph {
  identities: Identity[]; crosswalks: Crosswalk[]; aliases: Alias[]
  tombstones: Tombstone[]; relations: Relation[]
}
const ref = (input: unknown) => object<EntityRef>(input, { kind: enumeration(entityKinds), id: validateId })
const revision = (input: unknown) => typeof input === 'number' && Number.isSafeInteger(input) && input > 0 ? success(input) : failure('invalid_value', 'Revision must be a positive safe integer.')
const key = (value: EntityRef) => JSON.stringify([value.kind, value.id])
const identityContent = (value: Identity) => JSON.stringify([value.kind, value.id, value.revision, value.schemaVersion, value.updatedAt, value.retiredAt, value.fixture, value.provenanceIds])
const invalid = (message: string): ValidationResult<never> => failure('invalid_relationship', message)

export function validateIdentityGraph(input: unknown, provenanceIds: ReadonlySet<string>, sourceIds: ReadonlySet<string>, previous?: IdentityGraph): ValidationResult<IdentityGraph> {
  const result = object<IdentityGraph>(input, {
    identities: array(value => object<Identity>(value, {
      kind: enumeration(entityKinds), id: validateId, revision,
      schemaVersion: value => value === 1 ? success(1 as const) : failure('invalid_value', 'Unsupported identity schema.'),
      updatedAt: validateDateTime, retiredAt: nullable(validateDateTime), fixture: boolean,
      provenanceIds: array(validateId),
    })),
    crosswalks: array(value => object<Crosswalk>(value, { sourceId: validateId, sourceKey: nonBlank, target: ref })),
    aliases: array(value => object<Alias>(value, { from: ref, to: ref })),
    tombstones: array(value => object<Tombstone>(value, { target: ref, retiredAt: validateDateTime, replacement: nullable(ref) })),
    relations: array(value => object<Relation>(value, { type: enumeration(relationTypes), fromId: validateId, toId: validateId })),
  })
  if (!result.valid) return result
  const graph = result.value
  const nodes = new Map(graph.identities.map(node => [key(node), node]))
  if (nodes.size !== graph.identities.length) return failure('duplicate_id', 'Duplicate kind/ID identity.')
  for (const node of graph.identities) {
    if ((!node.fixture && !node.provenanceIds.length) || new Set(node.provenanceIds).size !== node.provenanceIds.length || node.provenanceIds.some(id => !provenanceIds.has(id))) return failure('unknown_provenance', 'Identity provenance is missing or invalid.')
    if (node.retiredAt && Date.parse(node.retiredAt) > Date.parse(node.updatedAt)) return invalid('Retirement cannot be later than record update.')
  }
  const active = (target: EntityRef) => nodes.has(key(target)) && nodes.get(key(target))?.retiredAt === null
  const crosswalkKeys = new Set<string>()
  for (const entry of graph.crosswalks) {
    const scoped = JSON.stringify([entry.sourceId, entry.target.kind, entry.sourceKey])
    if (crosswalkKeys.has(scoped)) return failure('duplicate_id', 'Ambiguous source-scoped crosswalk.')
    crosswalkKeys.add(scoped)
    if (!sourceIds.has(entry.sourceId) || !nodes.has(key(entry.target))) return invalid('Crosswalk source or target missing.')
  }
  const edges = new Set<string>()
  const counts = new Map<string, number>()
  for (const edge of graph.relations) {
    const [fromKind, toKind, cardinality] = relations[edge.type]
    if (!active({ kind: fromKind, id: edge.fromId }) || !active({ kind: toKind, id: edge.toId })) return invalid('Relation requires active foreign keys of the declared kinds.')
    const edgeKey = JSON.stringify([edge.type, edge.fromId, edge.toId])
    if (edges.has(edgeKey)) return failure('duplicate_id', 'Duplicate relation.')
    edges.add(edgeKey)
    const countKey = JSON.stringify([edge.type, edge.fromId])
    const count = (counts.get(countKey) ?? 0) + 1
    counts.set(countKey, count)
    if (cardinality !== 'many' && count > 1) return invalid('To-one relation has multiple targets.')
    // Item-backed extensions must not create a second catalogue entry per item.
    if (['cosmeticItem', 'instrumentItem', 'emoteItem', 'callItem'].includes(edge.type) && graph.relations.some(other => other !== edge && other.type === edge.type && other.toId === edge.toId)) return invalid('Item extension must be one-to-one.')
  }
  for (const node of graph.identities.filter(node => node.retiredAt === null)) {
    for (const [type, [fromKind, , cardinality]] of Object.entries(relations)) {
      if (fromKind === node.kind && cardinality === 'required' && !counts.has(JSON.stringify([type, node.id]))) return invalid('Required relation is missing.')
    }
  }
  const targetOf = (type: Relation['type'], id: string) => graph.relations.find(edge => edge.type === type && edge.fromId === id)?.toId
  for (const node of graph.identities.filter(node => node.retiredAt === null)) {
    const parentType = node.kind === 'eventOverride' ? 'overrideEvent' : node.kind === 'eventOccurrence' ? 'occurrenceEvent' : null
    if (!parentType) continue
    const eventId = targetOf(parentType, node.id)
    const ruleId = targetOf(node.kind === 'eventOverride' ? 'overrideRule' : 'occurrenceRule', node.id)
    if (ruleId && targetOf('ruleEvent', ruleId) !== eventId) return invalid('Rule belongs to another event.')
    const overrideId = node.kind === 'eventOccurrence' ? targetOf('occurrenceOverride', node.id) : undefined
    if (overrideId && targetOf('overrideEvent', overrideId) !== eventId) return invalid('Override belongs to another event.')
    const overrideRuleId = overrideId ? targetOf('overrideRule', overrideId) : undefined
    if (ruleId && overrideRuleId && ruleId !== overrideRuleId) return invalid('Occurrence and override select different rules.')
  }
  const tombstones = new Map(graph.tombstones.map(entry => [key(entry.target), entry]))
  if (tombstones.size !== graph.tombstones.length) return failure('duplicate_id', 'Duplicate tombstone.')
  for (const node of graph.identities) if (Boolean(node.retiredAt) !== tombstones.has(key(node))) return invalid('Retired identities and tombstones must match.')
  for (const entry of graph.tombstones) {
    if (nodes.get(key(entry.target))?.retiredAt !== entry.retiredAt) return invalid('Tombstone retirement must match identity.')
    if (entry.replacement && (entry.replacement.kind !== entry.target.kind || !active(entry.replacement))) return invalid('Replacement must be an active identity of the same kind.')
  }
  const aliases = new Map(graph.aliases.map(entry => [key(entry.from), entry.to]))
  if (aliases.size !== graph.aliases.length) return failure('duplicate_id', 'Ambiguous alias.')
  for (const entry of graph.aliases) {
    if (entry.from.kind !== entry.to.kind || active(entry.from)) return invalid('Alias cannot reuse an active ID or change kind.')
    const seen = new Set([key(entry.from)])
    let target = entry.to
    while (aliases.has(key(target))) {
      if (seen.has(key(target))) return failure('cyclic_graph', 'Alias cycle.')
      seen.add(key(target)); target = aliases.get(key(target))!
    }
    if (seen.has(key(target))) return failure('cyclic_graph', 'Alias cycle.')
    if (!active(target)) return invalid('Alias must resolve to an active identity.')
    const replacement = tombstones.get(key(entry.from))?.replacement
    if (replacement && key(replacement) !== key(target)) return invalid('Alias and tombstone replacement disagree.')
  }
  if (previous) {
    const outgoing = (graph: IdentityGraph, node: Identity) => JSON.stringify(graph.relations.filter(edge => relations[edge.type][0] === node.kind && edge.fromId === node.id).map(edge => [edge.type, edge.toId]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en')))
    for (const old of previous.identities) {
      const current = nodes.get(key(old))
      if (!current || current.revision < old.revision || (old.retiredAt !== null && current.retiredAt !== old.retiredAt)) return invalid('Identity history cannot disappear, regress or resurrect.')
      if (Date.parse(current.updatedAt) < Date.parse(old.updatedAt)) return invalid('Update timestamp cannot regress.')
      if (identityContent(current) !== identityContent(old) && current.revision <= old.revision) return invalid('Changed identity requires a new revision.')
      if (outgoing(graph, current) !== outgoing(previous, old) && current.revision <= old.revision) return invalid('Changed relationships require a new owner revision.')
    }
    for (const old of previous.crosswalks) if (!graph.crosswalks.some(entry => entry.sourceId === old.sourceId && entry.sourceKey === old.sourceKey && key(entry.target) === key(old.target))) return invalid('Existing source identities cannot be remapped or discarded.')
    for (const old of previous.aliases) if (!graph.aliases.some(entry => key(entry.from) === key(old.from) && key(entry.to) === key(old.to))) return invalid('Existing aliases cannot be remapped or discarded.')
    for (const old of previous.tombstones) {
      const current = tombstones.get(key(old.target))
      if (!current || (current.replacement ? key(current.replacement) : null) !== (old.replacement ? key(old.replacement) : null)) return invalid('Historical tombstone replacements cannot be rewritten.')
    }
  }
  return result
}

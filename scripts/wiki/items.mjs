import { validateSourceRecord } from '../../src/data/core/provenance.ts'
import { validateItem } from '../../src/data/catalog/items.ts'
import { parseLuaData } from './lua.mjs'

const nonBlank = value => typeof value === 'string' && value.trim().length > 0
const report = (code, path) => ({ code, path })
const quarantine = reports => ({ status: 'quarantined', candidateItems: null, rawFields: [], reports })
const registryFields = ['provenanceIds', 'itemIds', 'spiritIds', 'treeIds', 'nodeIds', 'seasonIds', 'realmIds', 'mapIds', 'articleIds', 'assetIds', 'ruleIds', 'iapProductIds', 'visitIds']

function priceFields(rawPrice) {
  if (rawPrice === 'free') return { costStatus: 'free', costs: [] }
  const match = typeof rawPrice === 'string' && /^(\d+) (C|H|AC)$/.exec(rawPrice)
  if (match && Number.isSafeInteger(Number(match[1]))) {
    return { costStatus: 'known', costs: [{
      currency: match[2] === 'C' ? 'candle' : match[2] === 'H' ? 'heart' : 'other',
      sourceCurrencyLabel: match[2], amount: Number(match[1]),
    }] }
  }
  return { costStatus: 'unknown', costs: [] }
}

// Pure staging only. Caller supplies reviewed identity/relations and owns approval,
// persistence and last-known-good data. No IO, Lua execution or public promotion.
export function stageWikiItems(moduleText, sourceInput, mappings, context) {
  if (!context || registryFields.some(field => !(context[field] instanceof Set))) {
    return quarantine([report('invalid_context', ['context'])])
  }
  const provenance = validateSourceRecord(sourceInput, new Set(['K01']))
  if (!provenance.valid) return quarantine([report('invalid_source', ['source'])])
  const source = provenance.value
  if (source.verificationStatus !== 'verified' || source.sourceRecordKey !== 'Module:Cosmetics/data' ||
      !['sourceUrl', 'sourceRevision', 'attribution', 'licenseNote', 'transformNote'].every(field => nonBlank(source[field])) ||
      !context.provenanceIds.has(source.id)) return quarantine([report('invalid_source', ['source'])])
  if (typeof moduleText !== 'string' || new globalThis.TextEncoder().encode(moduleText).byteLength > 1024 * 1024) {
    return quarantine([report('invalid_module', ['module'])])
  }
  if (!Array.isArray(mappings) || !mappings.length) return quarantine([report('invalid_mapping', ['mappings'])])
  let table
  const diagnostics = []
  try { table = parseLuaData(moduleText, diagnostics) }
  catch { return quarantine([report('parse_error', ['module'])]) }
  if (diagnostics.length) return quarantine([report('duplicate_literal_key', ['module'])])

  const candidateItems = [], rawFields = [], reports = []
  const keys = new Set(), itemIds = new Set(), acquisitionIds = new Set()
  for (const [index, mapping] of mappings.entries()) {
    const path = ['mappings', index]
    if (!mapping || !nonBlank(mapping.sourceKey) || !nonBlank(mapping.acquisitionId)) {
      return quarantine([report('invalid_mapping', path)])
    }
    const seed = validateItem(mapping.draft, context)
    if (!seed.valid || seed.value.recordStatus !== 'draft' || seed.value.acquisitionOptions.length ||
        !context.itemIds.has(seed.value.id)) return quarantine([report('invalid_draft', [...path, 'draft'])])
    if (Object.hasOwn(seed.value.sourceKeys, 'K01') && seed.value.sourceKeys.K01 !== mapping.sourceKey) {
      return quarantine([report('conflicting_source_key', path)])
    }
    if (keys.has(mapping.sourceKey) || itemIds.has(seed.value.id) || acquisitionIds.has(mapping.acquisitionId)) {
      return quarantine([report('duplicate_mapping', path)])
    }
    keys.add(mapping.sourceKey); itemIds.add(seed.value.id); acquisitionIds.add(mapping.acquisitionId)
    if (!Object.hasOwn(table, mapping.sourceKey)) return quarantine([report('missing_source_row', path)])
    const row = table[mapping.sourceKey]
    if (!row || typeof row !== 'object' || !nonBlank(row.name) ||
        (row.item_type != null && typeof row.item_type !== 'string') ||
        (row.price != null && typeof row.price !== 'string')) return quarantine([report('invalid_source_row', path)])
    const rawSlot = row.item_type ?? null, rawPrice = row.price ?? null
    const slot = ['hair', 'mask', 'cape'].includes(rawSlot) ? rawSlot : 'unknown'
    const price = priceFields(rawPrice)
    if (slot === 'unknown') reports.push(report('unknown_slot', [...path, 'slot']))
    if (price.costStatus === 'unknown') reports.push(report('unknown_price', [...path, 'price']))
    const draft = {
      ...seed.value,
      updatedAt: source.retrievedAt,
      provenanceIds: [...new Set([...seed.value.provenanceIds, source.id])],
      sourceKeys: { ...seed.value.sourceKeys, K01: mapping.sourceKey },
      name: { ...seed.value.name, default: row.name }, slot, rawSlot,
      acquisitionOptions: [{ id: mapping.acquisitionId, kind: 'unknown', ...price,
        friendshipNodeId: null, iapProductId: null, validFrom: null, validTo: null, provenanceIds: [source.id] }],
      fieldProvenance: { ...seed.value.fieldProvenance,
        ...Object.fromEntries(['sourceKeys', 'name', 'slot', 'rawSlot', 'acquisitionOptions'].map(field => [field, [source.id]])) },
    }
    const candidate = validateItem(draft, context)
    if (!candidate.valid) return quarantine([report('invalid_candidate', path)])
    candidateItems.push(candidate.value)
    rawFields.push({ itemId: candidate.value.id, sourceKey: mapping.sourceKey, rawSlot, rawPrice })
  }
  return { status: 'staged', candidateItems, rawFields, reports }
}

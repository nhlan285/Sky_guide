import { validateSourceRecord } from '../../src/data/core/provenance.ts'
import { validatePartialTime } from '../../src/data/core/time.ts'
import { validateTravelingSpiritVisit } from '../../src/data/catalog/traveling.ts'

const nonBlank = value => typeof value === 'string' && value.trim().length > 0
const quarantine = (code, path = []) => ({ status: 'quarantined', candidateVisits: null, sourceBindings: [], reports: [{ code, path }] })
const registries = ['provenanceIds', 'itemIds', 'spiritIds', 'treeIds', 'nodeIds', 'seasonIds', 'realmIds', 'mapIds', 'articleIds', 'assetIds', 'ruleIds', 'iapProductIds', 'visitIds']
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function dateLabel(rawLabel) {
  const match = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{1,2}), (\d{4})$/.exec(rawLabel)
  if (!match) return null
  const value = `${match[3]}-${String(months.indexOf(match[1]) + 1).padStart(2, '0')}-${match[2].padStart(2, '0')}`
  const checked = validatePartialTime({ value, precision: 'date', timezone: null, rawLabel })
  return checked.valid ? checked.value : null
}
function cellLines(line) {
  const match = /^\|data-sort-value="[^"]*"\|(.*)$/.exec(line)
  if (!match) throw new Error('Unsupported cell')
  return match[1].split(/<br\s*\/?\s*>/i).map(part => part.replace(/<\/?u>/gi, '').replace(/'{2,3}/g, '').trim())
}
function selectedRows(text, selectedKeys) {
  const clean = text.replace(/<!--[\s\S]*?-->/g, '')
  const tables = [...clean.matchAll(/^\{\|[^\n]*\n\|\+'''Appearances by Spirit'''\s*\n([\s\S]*?)^\|\}/gm)]
  if (tables.length !== 1) throw new Error('Unsupported table')
  const chunks = tables[0][1].split(/^\|-[^\n]*\n/m)
  const header = '!Season||Spirit||Icon||Visits||data-sort-type="number"|Visit#||data-sort-type="date"|Date||data-sort-type="number"|Delta'
  if (chunks.shift().trim() !== header) throw new Error('Unsupported header')
  const rows = new Map()
  for (const chunk of chunks) {
    const lines = chunk.trim().split('\n').map(line => line.trim()).filter(Boolean)
    const cells = lines[0]?.split('||') ?? []
    const link = /^\[\[([^\]|]+)(?:\|[^\]]+)?\]\]$/.exec(cells[1] ?? '')
    if (!link || !selectedKeys.has(link[1])) continue
    if (rows.has(link[1]) || cells.length !== 4 || lines.length !== 4) throw new Error('Unsupported row')
    const visits = cellLines(lines[1]), dates = cellLines(lines[2])
    if (visits.length !== dates.length || new Set(visits).size !== visits.length) throw new Error('Unaligned row')
    if (visits.some(key => !/^(?:TS#[1-9]\d*|SV#[1-9]\d*|Error|—|-|)$/.test(key))) throw new Error('Unsupported visit kind')
    rows.set(link[1], new Map(visits.map((key, index) => [key, dates[index]])))
  }
  return rows
}

// Source-observed, date-only arrival staging. Never derives a departure clock,
// publishes history, calls providers or merges observations from K04.
export function stageWikiVisits(wikitext, sourceInput, cutoffDate, mappings, context) {
  if (!context || registries.some(field => !(context[field] instanceof Set))) return quarantine('invalid_context', ['context'])
  const provenance = validateSourceRecord(sourceInput, new Set(['K03']))
  if (!provenance.valid) return quarantine('invalid_source', ['source'])
  const source = provenance.value
  if (source.sourceRecordKey !== 'Spirit Visits' || source.verificationStatus !== 'verified' ||
      !['sourceUrl', 'sourceRevision', 'attribution', 'licenseNote', 'transformNote'].every(field => nonBlank(source[field])) ||
      !context.provenanceIds.has(source.id)) return quarantine('invalid_source', ['source'])
  if (!validatePartialTime({ value: cutoffDate, precision: 'date', timezone: null, rawLabel: null }).valid || cutoffDate > source.retrievedAt.slice(0, 10)) return quarantine('invalid_cutoff', ['cutoffDate'])
  if (typeof wikitext !== 'string' || new globalThis.TextEncoder().encode(wikitext).byteLength > 1024 * 1024) return quarantine('invalid_module', ['module'])
  if (!Array.isArray(mappings) || !mappings.length) return quarantine('invalid_mapping', ['mappings'])
  const prepared = [], keys = new Set(), ids = new Set(), spiritKeys = new Map(), canonicalSpirits = new Map()
  for (const [index, mapping] of mappings.entries()) {
    const path = ['mappings', index]
    if (!mapping || !nonBlank(mapping.spiritSourceKey) || typeof mapping.sourceVisitKey !== 'string' || !/^TS#[1-9]\d*$/.test(mapping.sourceVisitKey)) return quarantine('invalid_mapping', path)
    const seed = validateTravelingSpiritVisit(mapping.draft, context)
    if (!seed.valid || seed.value.recordStatus !== 'draft' || seed.value.startsAt.precision !== 'unknown' || seed.value.endsAt !== null || seed.value.treeId !== null ||
        !context.visitIds.has(seed.value.id)) return quarantine('invalid_draft', [...path, 'draft'])
    const key = JSON.stringify([mapping.spiritSourceKey, mapping.sourceVisitKey])
    if (keys.has(key) || ids.has(seed.value.id)) return quarantine('duplicate_mapping', path)
    if ((spiritKeys.has(mapping.spiritSourceKey) && spiritKeys.get(mapping.spiritSourceKey) !== seed.value.spiritId) ||
        (canonicalSpirits.has(seed.value.spiritId) && canonicalSpirits.get(seed.value.spiritId) !== mapping.spiritSourceKey)) return quarantine('conflicting_spirit_mapping', path)
    keys.add(key); ids.add(seed.value.id); spiritKeys.set(mapping.spiritSourceKey, seed.value.spiritId); canonicalSpirits.set(seed.value.spiritId, mapping.spiritSourceKey)
    prepared.push({ mapping, seed: seed.value, path })
  }
  let rows
  try { rows = selectedRows(wikitext, new Set(spiritKeys.keys())) }
  catch { return quarantine('parse_error', ['module']) }
  const candidateVisits = [], sourceBindings = []
  for (const { mapping, seed, path } of prepared) {
    const rawDate = rows.get(mapping.spiritSourceKey)?.get(mapping.sourceVisitKey)
    if (rawDate === undefined) return quarantine('missing_source_visit', path)
    const startsAt = dateLabel(rawDate)
    if (!startsAt) return quarantine('invalid_date_label', path)
    if (startsAt.value > cutoffDate) return quarantine('future_visit', path)
    const candidate = validateTravelingSpiritVisit({ ...seed, startsAt, status: 'confirmed', updatedAt: source.retrievedAt,
      provenanceIds: [...new Set([...seed.provenanceIds, source.id])],
      fieldProvenance: { ...seed.fieldProvenance, startsAt: [source.id], status: [source.id] },
    }, context)
    if (!candidate.valid) return quarantine('invalid_candidate', path)
    candidateVisits.push(candidate.value)
    sourceBindings.push({ visitId: seed.id, spiritSourceKey: mapping.spiritSourceKey, sourceVisitKey: mapping.sourceVisitKey, sourceRecordId: source.id })
  }
  return { status: 'staged', candidateVisits, sourceBindings, reports: [] }
}

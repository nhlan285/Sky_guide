import assert from 'node:assert/strict'
import test from 'node:test'
import { stageWikiVisits } from '../../scripts/wiki/visits.mjs'
import { validateTravelingSpiritVisit } from '../../src/data/catalog/traveling.ts'

// Synthetic names/IDs/dates; only source layout matches the verified contract.
const context = Object.fromEntries(['provenanceIds', 'itemIds', 'spiritIds', 'treeIds', 'nodeIds', 'seasonIds', 'realmIds', 'mapIds', 'articleIds', 'assetIds', 'ruleIds', 'iapProductIds', 'visitIds'].map(field => [field, new Set()]))
context.provenanceIds.add('fixture-source'); context.spiritIds.add('fixture-spirit')
context.visitIds.add('fixture-a'); context.visitIds.add('fixture-b')
const source = () => ({ id: 'fixture-source', sourceId: 'K03', sourceUrl: 'https://example.invalid/fixture', sourceRecordKey: 'Spirit Visits', sourceRevision: 'fixture-r1', retrievedAt: '2026-01-01T00:00:00Z', observedAt: null, attribution: 'Synthetic fixture', licenseNote: 'No real source content', transformNote: 'Synthetic layout test', verificationStatus: 'verified' })
const mapping = (sourceVisitKey = 'TS#2', id = 'fixture-a') => ({ spiritSourceKey: 'Synthetic Spirit', sourceVisitKey, draft: {
  id, spiritId: 'fixture-spirit', fixture: true, recordStatus: 'draft', updatedAt: '2025-01-01T00:00:00Z', provenanceIds: ['fixture-source'],
  startsAt: { value: '', precision: 'unknown', timezone: null, rawLabel: null }, endsAt: null, treeId: null, status: 'confirmed', fieldProvenance: {},
} })
const header = '!Season||Spirit||Icon||Visits||data-sort-type="number"|Visit#||data-sort-type="date"|Date||data-sort-type="number"|Delta'
const row = (visits = "TS#2<br><u>SV#1</u><br>Error<br>'''TS#1'''", dates = "Jun 6, 2024<br>Jul 3, 2023<br>May 8, 2022<br>'''Jun 25, 2020'''") => `|data-sort-value="0"|{{Season Icon|Synthetic|table}}||[[Synthetic Spirit]]||{{Spirit|Synthetic Spirit|table}}||3\n|data-sort-value="1"|${visits}\n|data-sort-value="2024-06-06"|${dates}\n|data-sort-value="1"|&Delta;1`
const table = (r = row()) => `{|class="sortable"\n|+'''Appearances by Spirit'''\n${header}\n|-\n${r}\n|}\nUnrelated chronological table is outside the supported slice.`
const stage = (text = table(), maps = [mapping(), mapping('TS#1', 'fixture-b')], provenance = source(), cutoff = '2025-12-31') => stageWikiVisits(text, provenance, cutoff, maps, context)
const rejected = result => { assert.equal(result.status, 'quarantined'); assert.equal(result.candidateVisits, null); assert.deepEqual(result.sourceBindings, []) }

test('parallel lines preserve repeated TS visits and skip SV/Error without shifting dates', () => {
  const result = stage(); assert.equal(result.status, 'staged'); assert.equal(result.candidateVisits.length, 2)
  const [recent, first] = result.candidateVisits
  assert.equal(recent.startsAt.value, '2024-06-06'); assert.equal(first.startsAt.value, '2020-06-25')
  for (const visit of result.candidateVisits) {
    assert.equal(validateTravelingSpiritVisit(visit, context).valid, true)
    assert.equal(visit.startsAt.precision, 'date'); assert.equal(visit.startsAt.timezone, null)
    assert.equal(visit.endsAt, null); assert.equal(visit.treeId, null); assert.equal(visit.recordStatus, 'draft')
    assert.deepEqual(visit.fieldProvenance.startsAt, ['fixture-source'])
  }
  assert.equal(recent.startsAt.rawLabel, 'Jun 6, 2024')
  assert.deepEqual(result.sourceBindings.map(binding => binding.sourceVisitKey), ['TS#2', 'TS#1'])
})

test('inputs and supplied identities remain unchanged; no fuzzy crosswalk or manufactured IDs', () => {
  const maps = [mapping()], provenance = source(), before = globalThis.structuredClone({ maps, provenance, context })
  assert.equal(stage(table(), maps, provenance).candidateVisits[0].id, 'fixture-a')
  assert.deepEqual({ maps, provenance, context }, before)
  rejected(stage(table(), [{ ...mapping(), spiritSourceKey: 'synthetic spirit' }]))
  const unknown = mapping(); unknown.draft.id = 'not-registered'; rejected(stage(table(), [unknown]))
  const unknownSpirit = mapping(); unknownSpirit.draft.spiritId = 'not-registered'; rejected(stage(table(), [unknownSpirit]))
})

test('SV/Error/never-returned rows and future arrivals cannot be promoted as historical TS', () => {
  for (const key of ['SV#1', 'Error', '', 'TS#0']) rejected(stage(table(), [mapping(key)]))
  rejected(stage(table(row('', "''Jun 6, 2024''"))))
  const future = stage(table(row('TS#2', 'Jan 2, 2026')), [mapping()]); rejected(future); assert.equal(future.reports[0].code, 'future_visit')
  rejected(stage(table(), [mapping()], source(), '2026-01-02'))
  assert.equal(stage(table(row('TS#2', 'Jan 1, 2026')), [mapping()], source(), '2026-01-01').status, 'staged')
  for (const cutoff of [undefined, '2025-02-30', 'yesterday']) rejected(stageWikiVisits(table(), source(), cutoff, [mapping()], context))
})

test('unsupported structure, unaligned dates, duplicate rows/visit keys and invalid calendar labels reject', () => {
  for (const text of [table().replace('!Season', '!Unknown'), table().replace('Appearances by Spirit', 'Another table'),
    table(row('TS#2<br>TS#1', 'Jun 6, 2024')), table(row('TS#2<br>TS#2', 'Jun 6, 2024<br>Jun 25, 2020')),
    table(`${row()}\n|-\n${row()}`), table(row('TS#2', 'Feb 30, 2024')), table(row('TS#2', 'June 6 to 9, 2024')),
    table(row('TS#2', '{{Date|Jun 6, 2024}}')), table(row('TS#2', 'private-sentinel()')), (table(row()) + '\n').repeat(2)]) {
    const result = stage(text, [mapping()]); rejected(result); assert.equal(JSON.stringify(result).includes('private-sentinel'), false)
  }
  rejected(stage('x'.repeat(1024 * 1024 + 1)))
})

test('source revision, verified provenance and declared draft context are mandatory', () => {
  for (const change of [{ sourceId: 'K04' }, { sourceRevision: null }, { sourceRecordKey: 'Traveling Spirits' }, { verificationStatus: 'conflict' }, { id: 'absent' }, { attribution: ' ' }, { licenseNote: '' }, { sourceUrl: '' }, { transformNote: '' }]) rejected(stage(table(), [mapping()], { ...source(), ...change }))
  for (const change of [{ recordStatus: 'published' }, { startsAt: { value: '2024-06-06', precision: 'date', timezone: null, rawLabel: null } }, { endsAt: { value: '', precision: 'unknown', timezone: null, rawLabel: null } }]) rejected(stage(table(), [{ ...mapping(), draft: { ...mapping().draft, ...change } }]))
  rejected(stageWikiVisits(table(), source(), '2025-12-31', [mapping()], null))
})

test('duplicate/empty crosswalk and later missing visit reject full batch with null candidates', () => {
  for (const maps of [[], null, [null], [mapping(), mapping()], [mapping(), mapping('TS#1')], [mapping(), mapping('TS#99', 'fixture-b')]]) rejected(stage(table(), maps))
  const conflict = mapping('TS#1', 'fixture-b'); conflict.spiritSourceKey = 'Another Spirit'
  const result = stage(table(), [mapping(), conflict]); rejected(result); assert.equal(result.reports[0].code, 'conflicting_spirit_mapping')
})

test('date normalization accepts leap day and comments without using sort attributes as arrival', () => {
  const text = table(row('TS#2', "'''Feb 29, 2024'''<!-- ignored source note -->"))
  assert.equal(stage(text, [mapping()]).candidateVisits[0].startsAt.value, '2024-02-29')
  rejected(stage(table(row('TS#2', 'Feb 29, 2023')), [mapping()]))
})

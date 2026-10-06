import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { acquisitionOptionKey, migrationFieldOwnership, realmLocationRef, validateAcquisitionOptionKeys } from '../../src/data/domain/migration.ts'
import { validateAcquisitionOption } from '../../src/data/catalog/items.ts'
import { validateGuideMap, validateRealm } from '../../src/data/catalog/geography.ts'
import { canonicalizeSnapshotFiles } from '../../src/server/domainSnapshot.ts'

const root = new URL('../../data/public/tsa-v1-74007cf878ef/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'))
const files = new Map(Object.values({ ...manifest.datasets, provenance: manifest.provenance }).map(entry => [entry.path, readFileSync(new URL(entry.path, root), 'utf8')]))
const dataset = name => JSON.parse(files.get(`${name}.json`))

test('acquisition option identity is item scoped and never assumes global uniqueness', () => {
  const items = [{ id: 'item-a', acquisitionOptions: [{ id: 'same-option' }] }, { id: 'item-b', acquisitionOptions: [{ id: 'same-option' }] }]
  assert.deepEqual(validateAcquisitionOptionKeys(items).value, [['item-a', 'same-option'], ['item-b', 'same-option']])
  items[0].acquisitionOptions.push({ id: 'same-option' })
  assert.equal(validateAcquisitionOptionKeys(items).valid, false)
  assert.equal(acquisitionOptionKey('', 'option').valid, false)
})

test('deferred node/IAP IDs, dates, provenance and all price semantics survive validated projection', () => {
  const context = { provenanceIds: new Set(['source-a']), nodeIds: new Set(['future-node']), iapProductIds: new Set(['future-product']) }
  const base = { id: 'option-a', kind: 'spirit_tree', costStatus: 'unknown', costs: [{ currency: 'other', sourceCurrencyLabel: 'seasonal heart', amount: null }],
    friendshipNodeId: 'future-node', iapProductId: 'future-product', validFrom: { value: '2026-10-06', precision: 'date', timezone: null, rawLabel: '6 October' }, validTo: null, provenanceIds: ['source-a'] }
  for (const option of [base, { ...base, costStatus: 'known', costs: [{ currency: 'heart', sourceCurrencyLabel: 'hearts', amount: 3 }] }, { ...base, costStatus: 'free', costs: [] }]) {
    const parsed = validateAcquisitionOption(option, context)
    assert.equal(parsed.valid, true)
    assert.deepEqual(JSON.parse(JSON.stringify(parsed.value)), option)
  }
  assert.equal(validateAcquisitionOption(base, { ...context, nodeIds: new Set() }).valid, false)
  assert.equal(validateAcquisitionOption(base, { ...context, iapProductIds: new Set() }).valid, false)
})

test('Realm is explicitly a Location subtype with stable ID; GuideMap has separate ownership', () => {
  const metadata = { provenanceIds: [], updatedAt: '2026-10-06T00:00:00Z', fixture: true, recordStatus: 'draft' }
  const realm = { ...metadata, id: 'realm-isle', name: { default: 'Fixture Isle', translations: {} } }
  const context = { provenanceIds: new Set(), realmIds: new Set([realm.id]), seasonIds: new Set(), assetIds: new Set() }
  assert.equal(validateRealm(realm, context).valid, true)
  assert.deepEqual(realmLocationRef(realm.id, context.realmIds).value, { kind: 'location', id: realm.id })
  assert.deepEqual(realmLocationRef(null, context.realmIds).value, null)
  assert.equal(realmLocationRef('location-area', context.realmIds).valid, false)
  const map = { ...metadata, id: 'guide-map-a', name: realm.name, realmId: realm.id, seasonIds: [], assetId: null, revision: 'map-r1', coordinateSystem: 'none', width: null, height: null }
  assert.equal(validateGuideMap(map, context).valid, true)
  assert.notEqual(map.id, realmLocationRef(map.realmId, context.realmIds).value.id)
})

test('every actual K15 field has an explicit migration owner, including nested fields and envelope', () => {
  const check = (kind, record) => {
    for (const field of Object.keys(record)) {
      assert.ok(migrationFieldOwnership[kind]?.[field], `Missing migration owner: ${kind}.${field}`)
      assert.match(migrationFieldOwnership[kind][field], /^(column|join|derived|deferred|future|excluded):.+/)
      assert.equal(migrationFieldOwnership[kind][field].startsWith('excluded:'), false)
    }
  }
  for (const [name, kind] of [['items', 'item'], ['lookup', 'lookup'], ['spirits', 'spirit'], ['seasons', 'season'], ['provenance', 'provenance']]) {
    const envelope = dataset(name); check('envelope', envelope)
    for (const record of envelope.records) {
      check(kind, record)
      if (record.name) check('localizedText', record.name)
      for (const option of record.acquisitionOptions ?? []) {
        check('acquisitionOption', option)
        for (const cost of option.costs) check('currencyAmount', cost)
        for (const time of [option.validFrom, option.validTo]) if (time) check('partialTime', time)
      }
      for (const offer of record.offers ?? []) check('offer', offer)
      for (const time of [record.startsAt, record.endsAt]) if (time) check('partialTime', time)
    }
  }
  check('manifest', manifest)
  check('snapshotSource', manifest.source)
  for (const path of manifest.source.sourcePaths) check('sourcePath', path)
  check('importReport', manifest.importReport)
  for (const entry of Object.values({ ...manifest.datasets, provenance: manifest.provenance })) check('datasetEntry', entry)
})

test('canonical public projection retains complete K15 payloads/nulls and item-scoped keys', () => {
  const canonical = canonicalizeSnapshotFiles({ manifest, files })
  for (const [path, text] of canonical.files) assert.deepEqual(JSON.parse(text), JSON.parse(files.get(path)))
  assert.deepEqual(canonical.manifest.source, manifest.source)
  assert.deepEqual(canonical.manifest.importReport, manifest.importReport)
  assert.equal(validateAcquisitionOptionKeys(dataset('items').records).valid, true)
})

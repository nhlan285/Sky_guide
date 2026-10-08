import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import test from 'node:test'
import { encodeCatalogRows } from '../../src/server/catalogRows.ts'
import { canonicalizeSnapshotFiles, canonicalJson } from '../../src/server/domainSnapshot.ts'
import { decodeReleaseRows, encodeReleaseRows, releaseColumns } from '../../src/server/releaseRows.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'

test('full current K15 manifest/envelopes and every canonical byte survive typed metadata and membership',() => {
  const root=new URL('../../data/public/tsa-v1-74007cf878ef/',import.meta.url)
  const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'))
  const files=new Map(Object.values({...manifest.datasets,provenance:manifest.provenance}).map(entry => [entry.path,readFileSync(new URL(entry.path,root),'utf8')]))
  const payload=Object.fromEntries(['items','lookup','spirits','seasons','provenance'].map(name => [name,JSON.parse(files.get(`${name}.json`)).records]))
  const catalog=encodeCatalogRows(payload),snapshot=canonicalizeSnapshotFiles({manifest,files}),rows=encodeReleaseRows(snapshot,catalog)
  assert.deepEqual(decodeReleaseRows(rows,catalog),snapshot)
  assert.equal(rows.release_item.length,1808);assert.equal(rows.release_lookup.length,1808)
  assert.equal(rows.release_spirit.length,213);assert.equal(rows.release_season.length,30);assert.equal(rows.release_provenance.length,244)
  assert.equal(rows.release_source_path.length,manifest.source.sourcePaths.length)
  assert.deepEqual(Object.fromEntries(rows.release_import_summary.map(r => [r.catalog_version,[r.accepted,r.excluded,r.unknown_category,r.unknown_cost]])),{'tsa-v1-74007cf878ef':[1808,1155,489,815]})
  for(const [table,values] of Object.entries(rows)) for(const row of values) assert.deepEqual(Object.keys(row).sort(),[...releaseColumns[table]].sort())
})

test('dataset timestamps, independent order, repeated source paths and optional absence survive',() => {
  const {snapshot,catalog}=releaseFixture(),rows=encodeReleaseRows(snapshot,catalog)
  for(const values of Object.values(rows)) values.reverse()
  assert.deepEqual(decodeReleaseRows(rows,catalog),snapshot)
  assert.notEqual(rows.release_item[0].id,rows.release_lookup[0].id)
  assert.equal(rows.release_source_path.length,3)
  assert.equal(new Set(rows.release_dataset.map(r => r.generated_at)).size,5)
  const absent=globalThis.structuredClone(snapshot);delete absent.manifest.source;delete absent.manifest.importReport
  absent.manifest.assetManifestVersion=null
  const absentRows=encodeReleaseRows(absent,catalog)
  assert.equal(absentRows.public_release[0].source_present,false);assert.equal(absentRows.release_source_snapshot.length,0)
  assert.equal(absentRows.public_release[0].import_report_present,false);assert.equal(absentRows.release_import_summary.length,0)
  assert.deepEqual(decodeReleaseRows(absentRows,catalog),canonicalizeSnapshotFiles(absent))
})

test('missing/extra/wrong-owner/revision/order/scalar/hash rows and unsupported metadata fail closed',() => {
  const {snapshot,catalog}=releaseFixture(),base=encodeReleaseRows(snapshot,catalog)
  for(const mutate of [r => {r.public_release[0].schema_version=2},r => {r.public_release[0].source_present=false},r => {r.public_release[0].import_report_present=false},
    r => {r.release_dataset.pop()},r => {r.release_dataset[0].sha256='0'.repeat(64)},r => {r.release_dataset[0].data_version='other'},
    r => {r.release_dataset[0].generated_at='invalid'},r => {r.release_dataset[0].fixture=true},r => {r.release_dataset[0].path=r.release_dataset[1].path},
    r => {r.release_source[0].source_id='K01'},r => {r.release_source[0].dataset='other'},r => {r.release_source.pop()},
    r => {r.release_item[0].owner_revision=2},r => {r.release_item[0].position=1},r => {r.release_item[0].id='missing'},r => {r.release_item.pop()},
    r => {r.release_lookup.push({...r.release_lookup[0]})},r => {r.release_provenance[0].catalog_version='other'},
    r => {r.release_source_path[0].position=5},r => {r.release_source_snapshot[0].revision='bad'},
    r => {r.release_import_summary[0].rejected_empty=false},r => {r.release_import_summary[0].accepted=Number.MAX_SAFE_INTEGER+1},
    r => {r.public_release[0].aliases_path='aliases.json'},r => {r.public_release[0].tombstones_path='tombstones.json'},
    r => {r.release_item[0].privateEvidence='hidden'},r => {r.extra=[]},
  ]) {
    const rows=globalThis.structuredClone(base);mutate(rows);assert.throws(() => decodeReleaseRows(rows,catalog))
  }
  const wrong=globalThis.structuredClone(catalog);wrong.item[0].name_default='changed'
  assert.throws(() => decodeReleaseRows(base,wrong),/checksum/)
  assert.throws(() => encodeReleaseRows(snapshot,wrong),/checksum/)
  wrong.item[0].name_default=catalog.item[0].name_default;wrong.domain_identity[0].revision=2
  assert.throws(() => decodeReleaseRows(base,wrong))
})

test('publication boundary strips private input but rejects fixture/draft/unverified or raw rejection reports',() => {
  const {snapshot,catalog}=releaseFixture(),input=globalThis.structuredClone(snapshot)
  input.manifest.privateEvidence='hidden';input.manifest.source.privatePath='hidden';input.manifest.importReport.privateRows=['hidden']
  assert.equal(canonicalJson(decodeReleaseRows(encodeReleaseRows(input,catalog),catalog).manifest).includes('hidden'),false)
  for(const mutate of [c => {c.item[0].record_status='draft'},c => {c.domain_identity[0].fixture=true},c => {c.provenance[0].verification_status='pending'},c => {c.provenance[0].source_url=null}]) {
    const rows=globalThis.structuredClone(catalog);mutate(rows);assert.throws(() => encodeReleaseRows(snapshot,rows))
  }
  const report=globalThis.structuredClone(snapshot);report.manifest.importReport.rejected=[{private:'hidden'}]
  assert.throws(() => encodeReleaseRows(report,catalog))
})

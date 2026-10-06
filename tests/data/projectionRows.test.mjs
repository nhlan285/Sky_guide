import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import test from 'node:test'
import { canonicalJson, canonicalizeSnapshotFiles, createSnapshotRepository } from '../../src/server/domainSnapshot.ts'
import { createDomainApi } from '../../src/server/domainApi.ts'
import { createProjectionRepository, decodeProjectionRows, encodeProjectionRows, projectionByteLength } from '../../src/server/projectionRows.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'

const freshness={health:'healthy',lastSuccessAt:'2026-10-07T01:00:00Z',validUntil:null}
const materializedAt='2026-10-07T00:30:00Z'
const digest=text => createHash('sha256').update(text).digest('hex')
function currentSnapshot() {
  const root=new URL('../../data/public/tsa-v1-74007cf878ef/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'))
  const files=new Map(Object.values({...manifest.datasets,provenance:manifest.provenance}).map(entry => [entry.path,readFileSync(new URL(entry.path,root),'utf8')]))
  return {manifest,files}
}

test('full K15 immutable byte cache and version-bound repository retain canonical files and complete API parity',async () => {
  const input=currentSnapshot(),rows=encodeProjectionRows(input,materializedAt),version=input.manifest.catalogVersion
  const snapshot=decodeProjectionRows(rows,version),original=canonicalizeSnapshotFiles(input)
  assert.deepEqual(snapshot,original)
  assert.equal(projectionByteLength(rows,version),Buffer.byteLength(canonicalJson(original.manifest),'utf8')+[...original.files.values()].reduce((n,text) => n+Buffer.byteLength(text,'utf8'),0))
  const expected=createDomainApi(createSnapshotRepository(input,freshness),() => Date.parse(freshness.lastSuccessAt))
  const actual=createDomainApi(createProjectionRepository(rows,version,freshness),() => Date.parse(freshness.lastSuccessAt))
  const itemId=JSON.parse(original.files.get(original.manifest.datasets.items.path)).records[0].id
  const spiritId=JSON.parse(original.files.get(original.manifest.datasets.spirits.path)).records[0].id
  for(const [path,status] of [['/api/items?limit=100',200],['/api/items?slot=hair&limit=20',200],
    [`/api/items/${encodeURIComponent(itemId)}`,200],['/api/spirits?limit=100',200],[`/api/spirits/${encodeURIComponent(spiritId)}`,200],
    ['/api/items/missing-id',404],['/api/events/active',503]]) {
    const a=await actual(new globalThis.Request(`https://example.invalid${path}`)),b=await expected(new globalThis.Request(`https://example.invalid${path}`))
    assert.equal(a.status,status);assert.equal(a.status,b.status);assert.deepEqual(await a.json(),await b.json())
  }
})

test('stored history reads independently of mutable canonical rows; consumers cannot edit its cached state',async () => {
  const {snapshot,catalog}=releaseFixture(),rows=encodeProjectionRows(snapshot,materializedAt)
  const repository=createProjectionRepository(rows,'fixture-release',freshness)
  const before=await repository.readCatalog()
  catalog.item[0].name_default='Changed current canonical payload';catalog.domain_identity[0].revision=2
  assert.deepEqual(await repository.readCatalog(),before)
  rows.release_projection_file[0].content='Caller later replaced its transport buffer'
  before.catalog.entries[0].item.name.default='Consumer edit'
  const after=await repository.readCatalog()
  assert.notEqual(after.catalog.entries[0].item.name.default,'Consumer edit')
  assert.notEqual(after.catalog.entries[0].item.name.default,'Changed current canonical payload')
})

test('partial/cross-version/forged/noncanonical/private/fixture byte caches fail closed even with recalculated hashes',() => {
  const {snapshot}=releaseFixture(),base=encodeProjectionRows(snapshot,materializedAt)
  const mutateManifest=(r,change) => {const m=JSON.parse(r.release_projection[0].manifest_text);change(m);r.release_projection[0].manifest_text=canonicalJson(m);r.release_projection[0].manifest_sha256=digest(r.release_projection[0].manifest_text)}
  const mutateFile=(r,change) => {
    const f=r.release_projection_file[0],e=JSON.parse(f.content);change(e);f.content=canonicalJson(e);f.sha256=digest(f.content)
    mutateManifest(r,m => {m.datasets[f.dataset].sha256=f.sha256})
  }
  for(const change of [r => {r.release_projection=[]},r => {r.release_projection_file.pop()},r => {r.release_projection_file.push({...r.release_projection_file[0]})},
    r => {r.release_projection[0].materialized_at='invalid'},r => {r.release_projection_file[0].catalog_version='other'},r => {r.release_projection_file[0].path='private.json'},
    r => {r.release_projection_file[0].dataset='hidden'},r => {r.release_projection[0].manifest_sha256='0'.repeat(64)},
    r => {r.release_projection[0].manifest_text+=' ';r.release_projection[0].manifest_sha256=digest(r.release_projection[0].manifest_text)},
    r => mutateManifest(r,m => {m.privateEvidence='hidden'}),r => mutateFile(r,e => {e.fixture=true}),
    r => mutateFile(r,e => {e.records[0].privateEvidence='hidden'}),r => mutateFile(r,e => {e.records[0].recordStatus='draft'}),
    r => {r.release_projection_file[0].privateEvidence='hidden'},r => {r.extra=[]},
  ]) {
    const rows=globalThis.structuredClone(base);change(rows);assert.throws(() => decodeProjectionRows(rows,'fixture-release'))
  }
  assert.throws(() => decodeProjectionRows(base,'other'))
  assert.throws(() => encodeProjectionRows(snapshot,'invalid'))
})

test('valid Unicode projection counts UTF8 bytes and preserves optional metadata absence',() => {
  const {snapshot}=releaseFixture()
  const itemFile=snapshot.files.get('items.json'),envelope=JSON.parse(itemFile);envelope.records[0].name.default='Ánh sáng 🌌'
  const text=canonicalJson(envelope);snapshot.files.set('items.json',text);snapshot.manifest.datasets.items.sha256=digest(text)
  delete snapshot.manifest.source;delete snapshot.manifest.importReport
  const rows=encodeProjectionRows(snapshot,materializedAt),decoded=decodeProjectionRows(rows,'fixture-release')
  assert.deepEqual(decoded,canonicalizeSnapshotFiles(snapshot))
  assert.ok(Buffer.byteLength(text,'utf8')>text.length)
})

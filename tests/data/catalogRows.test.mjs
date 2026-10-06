import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import test from 'node:test'
import { catalogColumns, decodeCatalogRows, encodeCatalogRows } from '../../src/server/catalogRows.ts'
import { canonicalJson, canonicalizeSnapshotFiles } from '../../src/server/domainSnapshot.ts'
import { catalogFixture as fixture, catalogFixtureContext as options } from '../fixtures/catalogRows.mjs'

const root=new URL('../../data/public/tsa-v1-74007cf878ef/',import.meta.url)
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'))
const files=new Map(Object.values({...manifest.datasets,provenance:manifest.provenance}).map(entry => [entry.path,readFileSync(new URL(entry.path,root),'utf8')]))
const current=Object.fromEntries(['items','lookup','spirits','seasons','provenance'].map(name => [name,JSON.parse(files.get(`${name}.json`)).records]))

test('every current K15 payload field round-trips through typed relational rows',() => {
  const rows=encodeCatalogRows(current)
  assert.equal(rows.item.length,1808);assert.equal(rows.spirit.length,213);assert.equal(rows.season.length,30);assert.equal(rows.provenance.length,244)
  assert.deepEqual(decodeCatalogRows(rows),current)
  for (const [table,values] of Object.entries(rows)) for (const row of values) {
    assert.deepEqual(Object.keys(row).sort(),[...catalogColumns[table]].sort())
    assert.ok(Object.values(row).every(value => value===null||['string','number','boolean'].includes(typeof value)))
  }
  const reconstructed=decodeCatalogRows(rows)
  const projected=new Map([...files].map(([path,text]) => {
    const envelope=JSON.parse(text);return [path,canonicalJson({...envelope,records:reconstructed[path.replace('.json','')]})]
  }))
  const projectedManifest=globalThis.structuredClone(manifest)
  for (const entry of Object.values({...projectedManifest.datasets,provenance:projectedManifest.provenance})) entry.sha256=createHash('sha256').update(projected.get(entry.path)).digest('hex')
  const canonical=canonicalizeSnapshotFiles({manifest:projectedManifest,files:projected})
  // Hash original canonical input rather than raw whitespace/key order.
  const original=canonicalizeSnapshotFiles({manifest,files})
  assert.deepEqual(canonical,original)
})

test('presence, empty evidence, independent order, composite options and deferred IDs survive',() => {
  const input=fixture(),rows=encodeCatalogRows(input,options)
  assert.deepEqual(decodeCatalogRows(rows,options),input)
  assert.equal(rows.acquisition_option.filter(p => p.option_id==='same-option').length,2)
  assert.equal(rows.acquisition_cost[0].amount,null)
  assert.equal(rows.item_k15.find(p => p.id==='tsa-cosmetic-9001').image_present,true)
  assert.equal(rows.item_k15.find(p => p.id==='tsa-cosmetic-9002').image_present,false)
  assert.equal(rows.field_provenance_field.filter(p => p.field==='name').length,1)
  assert.equal(rows.field_provenance.filter(p => p.field==='name').length,1)
  // Transport may return rows in arbitrary order. Position columns own order.
  for (const values of Object.values(rows)) values.reverse()
  assert.deepEqual(decodeCatalogRows(rows,options),input)
})

test('invalid scalar, gaps, duplicates, dangling/cross-owner and hidden retired rows fail closed',() => {
  const baseline=encodeCatalogRows(fixture(),options)
  for (const mutate of [
    r => {r.item[0].slot='not-a-slot'},r => {r.item[0].position=2},r => {r.item[0].privateEvidence='never public'},
    r => {r.acquisition_option[0].valid_from_present=false},r => {r.acquisition_cost[0].amount='0'},
    r => {r.acquisition_cost[0].amount=-1},r => {r.acquisition_cost[0].item_id='missing'},
    r => {r.acquisition_provenance=[]},r => {r.acquisition_option[0].cost_status='free'},
    r => {r.item_source_key.push({...r.item_source_key[0]})},r => {r.item_translation.push({...r.item_translation[0]})},
    r => {r.domain_identity[0].retired_at=r.domain_identity[0].updated_at},r => {r.domain_identity[0].revision=0},
    r => {r.domain_identity[0].schema_version=2},r => {r.provenance_order[0].position=1},
    r => {r.field_provenance_field[0].field='unapproved'},r => {r.spirit[0].field_provenance_present=false},
    r => {r.acquisition_source_offer[0].option_id='dangling'},r => {r.source_registry[0].id='K99'},
    r => {r.item_season.push({...r.item_season[0],position:2})},
  ]) {
    const rows=globalThis.structuredClone(baseline);mutate(rows);assert.throws(() => decodeCatalogRows(rows,options))
  }
})

test('codec strips operational payload fields and refuses unsupported modules without loss',() => {
  const input=fixture();input.items[0].privateEvidence='never public';input.lookup[0].rawReview='never public'
  const decoded=decodeCatalogRows(encodeCatalogRows(input,options),options)
  assert.equal('privateEvidence' in decoded.items[0],false);assert.equal('rawReview' in decoded.lookup[0],false)
  const validFutureMedia=fixture()
  validFutureMedia.lookup[0].image={url:'https://example.invalid/fixture.png',sourceUrl:'https://example.invalid/source',credit:'Synthetic fixture',license:'Fixture only',revision:null,permissionUrl:'https://example.invalid/permission',verifiedAt:'2026-10-07T00:00:00Z',reuseStatus:'verified'}
  assert.throws(() => encodeCatalogRows(validFutureMedia,options),/reviewed typed module/)
  for (const mutate of [p => {p.items[0].dyeRegions=[{id:'unreviewed'}]},p => {p.items[0].compatibility={unreviewed:true}},p => {p.lookup[0].image={unreviewed:true}},p => {p.lookup[0].offers[0].id='wrong-option'}]) {
    const value=fixture();mutate(value);assert.throws(() => encodeCatalogRows(value,options))
  }
})

test('authoritative identity revisions and retirement cannot be guessed or mismatched',() => {
  const input=fixture(),identities=[...input.items.map(p => ['item',p]),...input.spirits.map(p => ['spirit',p]),...input.seasons.map(p => ['season',p])].map(([kind,p]) => ({kind,id:p.id,revision:7,schemaVersion:1,updatedAt:p.updatedAt,fixture:p.fixture,provenanceIds:p.provenanceIds,retiredAt:null}))
  assert.equal(encodeCatalogRows(input,{...options,identities}).domain_identity[0].revision,7)
  const retired=globalThis.structuredClone(input);retired.items[0].recordStatus='retired'
  assert.throws(() => encodeCatalogRows(retired,options),/authoritative identity/)
  identities[0].retiredAt=identities[0].updatedAt
  assert.throws(() => encodeCatalogRows(input,{...options,identities}))
  assert.deepEqual(decodeCatalogRows(encodeCatalogRows(retired,{...options,identities}),options),retired)
  identities[0].updatedAt='2026-10-08T00:00:00Z'
  assert.throws(() => encodeCatalogRows(retired,{...options,identities}))
})

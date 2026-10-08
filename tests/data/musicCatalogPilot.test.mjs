import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL } from 'node:url'
import { musicInstruments, musicInstrumentForItem } from '../../src/features/music/catalogPilot.ts'

test('music pilot retains exact source IDs/records and unchanged unknown slots with one original fallback set',()=>{
  const pilot=JSON.parse(readFileSync(new URL('../../src/features/music/catalog-pilot.json',import.meta.url),'utf8'))
  const bytes=readFileSync(new URL(`../../data/public/${pilot.sourceCatalogVersion}/items.json`,import.meta.url))
  const source=JSON.parse(bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'),pilot.sourceDatasetSha256)
  assert.deepEqual(pilot.records,pilot.records.map(record=>source.records.find(item=>item.id===record.id)))
  assert.deepEqual(musicInstruments.map(i=>i.itemId),['tsa-cosmetic-81','tsa-cosmetic-227'])
  assert.equal(new Set(musicInstruments.map(i=>i.sampleSetId)).size,1)
  for(const record of pilot.records) { assert.equal(record.fixture,false); assert.equal(record.slot,'unknown'); assert.equal(musicInstrumentForItem(record.id).representation,'original-fallback') }
  assert.equal(musicInstrumentForItem('tsa-cosmetic-6'),undefined)
  assert.equal(musicInstrumentForItem(null),undefined)
})

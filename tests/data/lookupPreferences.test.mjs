import assert from 'node:assert/strict'
import test from 'node:test'
import { URLSearchParams } from 'node:url'
import { createLookupPreferenceStorage, effectiveLookupParams, initialLookupParams, lookupPreferenceKey, lookupPreferencesFromParams, preferenceParams, validateLookupPreferences } from '../../src/features/items/preferences.ts'
import { clearFilterParams, clearFilters, updateFilterParams } from '../../src/data/itemLookup/model.ts'
const choices = { categories:['cape','mask'], slots:['cape','mask'], seasons:['fixture-season'], spirits:['fixture-spirit'], acquisitions:['shop','default'] }
const selected = { ...clearFilters(), query:'QA cape', category:'cape', season:'fixture-season' }
const memory = () => { const values = new Map(); return { values, getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key) } }
const store = local => createLookupPreferenceStorage(choices, ()=>local)

test('fresh bare list restores validated preferences while explicit URLs and detail routes remain authoritative', () => {
  const local = memory(); store(local).write(selected)
  const restored = store(local).read(); assert.equal(restored.persistence,'persistent')
  const defaults = initialLookupParams('',undefined,restored.value)
  assert.equal(defaults.toString(),'q=QA+cape&category=cape&season=fixture-season')
  for (const search of ['?category=mask','?page=2','?unrelated=keep','?q=']) {
    assert.equal(initialLookupParams(search,undefined,selected).size,0)
    assert.equal(effectiveLookupParams(search,undefined,defaults).toString(),new URLSearchParams(search).toString())
  }
  assert.equal(initialLookupParams('','fixture-item',selected).size,0)
  assert.equal(effectiveLookupParams('','fixture-item',defaults).size,0)
  assert.deepEqual(store(local).read().value,selected)
})

test('only known filter fields project into storage; page and private or unrelated parameters never persist', () => {
  const params = new URLSearchParams('q=QA&category=mask&page=8&qr=private&unrelated=keep')
  const local = memory(); store(local).write(lookupPreferencesFromParams(params))
  const raw = local.getItem(lookupPreferenceKey)
  assert.equal(raw.includes('private'),false); assert.equal(raw.includes('page'),false); assert.equal(raw.includes('unrelated'),false)
  const next = updateFilterParams(params,'slot','mask')
  assert.equal(next.has('page'),false); assert.equal(next.get('unrelated'),'keep')
  assert.equal(preferenceParams(lookupPreferencesFromParams(next)).get('slot'),'mask')
})

test('unknown or stale choices and oversized query fail closed without erasing stored raw data', () => {
  for (const value of [{...selected,query:'x'.repeat(201)},{...selected,spirit:'deleted'},{...selected,category:'future-category'},{...selected,slot:42}]) {
    assert.equal(validateLookupPreferences(value,choices).valid,false)
    const local = memory(), raw = JSON.stringify({version:1,value}); local.setItem(lookupPreferenceKey,raw)
    assert.equal(store(local).read().issue,'corrupt'); assert.equal(local.getItem(lookupPreferenceKey),raw)
  }
})

test('explicit clear resets only owned key and known URL filters; outfit and locale state survive', () => {
  const local = memory(); local.setItem('outfit','keep'); local.setItem('locale','en'); store(local).write(selected)
  assert.deepEqual(store(local).reset().value,clearFilters())
  assert.equal(local.getItem('outfit'),'keep'); assert.equal(local.getItem('locale'),'en')
  assert.equal(clearFilterParams(new URLSearchParams('category=cape&page=3&unrelated=keep')).toString(),'unrelated=keep')
})

test('denied writes preserve in-memory choices; future envelopes survive until explicit reset', () => {
  const local = memory(); store(local).write(selected)
  const raw = local.getItem(lookupPreferenceKey)
  const denied = createLookupPreferenceStorage(choices,()=>({...local,setItem:()=>{throw new Error('quota')}}))
  assert.equal(denied.write({...selected,category:'mask'}).issue,'write_failed')
  assert.equal(denied.read().value.category,'mask'); assert.equal(local.getItem(lookupPreferenceKey),raw)
  const future = JSON.stringify({version:2,value:'future'}); local.setItem(lookupPreferenceKey,future)
  const protectedStore = store(local)
  assert.equal(protectedStore.write(selected).issue,'future_version'); assert.equal(local.getItem(lookupPreferenceKey),future)
  protectedStore.reset(); assert.equal(local.getItem(lookupPreferenceKey),null)
})

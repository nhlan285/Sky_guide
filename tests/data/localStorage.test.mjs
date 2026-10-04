import assert from 'node:assert/strict'
import test from 'node:test'
import { createVersionedStorage } from '../../src/shared/storage/versionedStorage.ts'
import { enumeration, success } from '../../src/data/core/index.ts'
import { createLocaleStorage, localeStorageKey } from '../../src/shared/i18n/localeStorage.ts'

const validate = enumeration(['vi', 'en'])
const memory = () => {
  const values = new Map()
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
}
const wrapper = (storage, extra = {}) => createVersionedStorage({ key: 'fixture-language', version: 2, defaultValue: 'vi', maxChars: 256, storage: () => storage, validate, ...extra })

test('versioned local state survives reload and preserves unrelated keys on reset', () => {
  const storage = memory(); storage.setItem('unrelated', 'keep')
  assert.equal(wrapper(storage).write('en').persistence, 'persistent')
  assert.equal(wrapper(storage).read().value, 'en')
  assert.deepEqual(JSON.parse(storage.getItem('fixture-language')), { version: 2, value: 'en' })
  assert.equal(wrapper(storage).reset().value, 'vi')
  assert.equal(storage.getItem('unrelated'), 'keep')
})

test('legacy and older versions migrate only through validated explicit paths', () => {
  const storage = memory(); storage.setItem('fixture-language', 'en')
  assert.equal(wrapper(storage, { legacy: validate }).read().value, 'en')
  storage.setItem('fixture-language', JSON.stringify({ version: 1, value: { language: 'en' } }))
  assert.equal(wrapper(storage, { migrate: (value, version) => version === 1 ? validate(value.language) : validate(null) }).read().value, 'en')
  storage.setItem('fixture-language', JSON.stringify({ version: 1, value: 'en' }))
  assert.equal(wrapper(storage).read().issue, 'migration_failed')
  assert.equal(wrapper(storage, { migrate: () => success('invalid') }).read().issue, 'migration_failed')
})

test('corrupt/oversized/invalid content fails to memory without crashing or deleting data', () => {
  for (const text of ['{', 'null', '{}', 'x'.repeat(257), '{"version":2,"value":"invalid"}']) {
    const storage = memory(); storage.setItem('fixture-language', text)
    const result = wrapper(storage).read()
    assert.equal(result.persistence, 'memory'); assert.equal(result.value, 'vi')
    assert.equal(storage.getItem('fixture-language'), text)
  }
})

test('future versions survive writes/retries until explicit reset', () => {
  const storage = memory(); const future = '{"version":9,"value":"en"}'
  storage.setItem('fixture-language', future)
  const local = wrapper(storage)
  assert.equal(local.retry().issue, 'future_version')
  assert.equal(local.write('en').issue, 'future_version')
  assert.equal(local.retry().issue, 'future_version')
  assert.equal(storage.getItem('fixture-language'), future)
  assert.equal(local.reset().issue, null)
  assert.equal(local.write('en').persistence, 'persistent')
  storage.setItem('fixture-language', JSON.stringify({ version: 9, value: 'x'.repeat(257) }))
  assert.equal(wrapper(storage).write('vi').issue, 'corrupt')
  assert.equal(JSON.parse(storage.getItem('fixture-language')).version, 9)
})

test('locale adapter migrates existing language and observes another tab or reset', () => {
  const storage = memory(); storage.setItem(localeStorageKey, 'en')
  const locale = createLocaleStorage(() => storage)
  assert.equal(locale.read().value, 'en')
  assert.deepEqual(JSON.parse(storage.getItem(localeStorageKey)), { version: 1, value: 'en' })
  const other = createLocaleStorage(() => storage)
  other.write('vi'); assert.equal(locale.read().value, 'vi')
  other.write('en'); assert.equal(locale.read().value, 'en')
  other.reset(); assert.equal(locale.read().value, 'vi')
})

test('getter/read/quota failures keep session changes and retry recovers persistence', () => {
  const denied = wrapper(memory(), { storage: () => { throw new Error('denied') } })
  assert.equal(denied.read().issue, 'unavailable')
  assert.equal(denied.write('en').value, 'en')
  assert.equal(denied.read().value, 'en')
  const storage = memory(); storage.setItem('fixture-language', '{"version":2,"value":"vi"}')
  const setter = storage.setItem
  storage.setItem = () => { throw new Error('quota') }
  const local = wrapper(storage)
  assert.equal(local.write('en').issue, 'write_failed')
  assert.equal(local.read().value, 'en')
  storage.setItem = setter
  assert.equal(local.retry().persistence, 'persistent')
  assert.equal(wrapper(storage).read().value, 'en')
  storage.setItem = () => { throw new Error('quota') }
  local.write('vi')
  storage.setItem = setter
  const future = '{"version":9,"value":"en"}'
  storage.setItem('fixture-language', future)
  assert.equal(local.retry().issue, 'future_version')
  assert.equal(storage.getItem('fixture-language'), future)
})

test('invalid writes preserve the valid value and read results are detached', () => {
  const local = wrapper(memory())
  local.write('en'); assert.equal(local.write('invalid').value, 'en')
  const result = local.read(); result.value = 'vi'
  assert.equal(local.read().value, 'en')
})

test('retry after a denied read reloads saved data instead of writing an empty default', () => {
  const storage = memory(); storage.setItem('fixture-language', '{"version":2,"value":"en"}')
  let denied = true
  const local = wrapper(storage, { storage: () => { if (denied) throw new Error('denied'); return storage } })
  assert.equal(local.read().value, 'vi')
  denied = false
  assert.equal(local.retry().value, 'en')
  assert.equal(wrapper(storage).read().value, 'en')
})

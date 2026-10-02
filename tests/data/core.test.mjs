import assert from 'node:assert/strict'
import test from 'node:test'
import {
  validateCurrencyAmount, validateDateTime, validateId, validatePartialTime,
  validateProvenanceIds, validateSourceRecord, validateSourceRecords,
} from '../../src/data/core/index.ts'

// Project-internal fixtures only: no source content, permission or live game data.
const sources = new Set(['K01'])
const provenanceFixture = () => ({
  id: 'fixture-provenance-a', sourceId: 'K01', sourceUrl: null,
  sourceRecordKey: null, sourceRevision: null,
  retrievedAt: '2024-02-29T12:30:00Z', observedAt: null,
  attribution: 'Self-created test fixture', licenseNote: 'Fixture only; no source license claim',
  transformNote: 'Synthetic validation input', verificationStatus: 'pending',
})
const moneyFixture = (amount, currency = 'candle') => ({
  currency, sourceCurrencyLabel: 'fixture-currency-label', amount,
})
const timeFixture = (value, precision, timezone = null) => ({ value, precision, timezone, rawLabel: null })

function errorAt(result, path, code) {
  assert.equal(result.valid, false)
  assert.ok(result.errors.some(error => error.code === code && JSON.stringify(error.path) === JSON.stringify(path)))
}

test('minimal provenance preserves every nullable unknown field', () => {
  const fixture = provenanceFixture()
  const result = validateSourceRecord(fixture, sources)
  assert.deepEqual(result, { valid: true, value: fixture })
  assert.equal(result.value.sourceUrl, null)
  assert.equal(result.value.observedAt, null)
})

test('provenance supports explicit metadata without claiming verification', () => {
  const fixture = { ...provenanceFixture(), sourceRevision: 'fixture-r1', sourceRecordKey: 'fixture-row', observedAt: '2024-03-01T01:00:00+07:00' }
  assert.deepEqual(validateSourceRecord(fixture, sources), { valid: true, value: fixture })
})

test('schema source enum and supplied registry are independent checks', () => {
  errorAt(validateSourceRecord({ ...provenanceFixture(), sourceId: 'K02' }, sources), ['sourceId'], 'unknown_source')
  errorAt(validateSourceRecord({ ...provenanceFixture(), sourceId: 'fixture-unknown-source' }, sources), ['sourceId'], 'invalid_value')
  assert.equal(validateSourceRecord(provenanceFixture(), new Set()).valid, false)
})

test('malformed provenance rejects absent nullable keys, incorrect fields and timestamps', () => {
  for (const input of [null, [], 'fixture']) assert.equal(validateSourceRecord(input, sources).valid, false)
  const missing = provenanceFixture()
  delete missing.sourceUrl
  errorAt(validateSourceRecord(missing, sources), ['sourceUrl'], 'missing_field')
  errorAt(validateSourceRecord({ ...provenanceFixture(), verificationStatus: 'permission_confirmed' }, sources), ['verificationStatus'], 'invalid_value')
  errorAt(validateSourceRecord({ ...provenanceFixture(), retrievedAt: '2024-02-29' }, sources), ['retrievedAt'], 'invalid_instant')
  errorAt(validateSourceRecord({ ...provenanceFixture(), observedAt: '2024-02-30T12:30:00Z' }, sources), ['observedAt'], 'invalid_instant')
})

test('collection validation rejects duplicate IDs and reports nested paths deterministically', () => {
  errorAt(validateSourceRecords([provenanceFixture(), provenanceFixture()], sources), [1, 'id'], 'duplicate_id')
  const input = [provenanceFixture(), { ...provenanceFixture(), sourceId: 'K02', attribution: 42 }]
  const result = validateSourceRecords(input, sources)
  errorAt(result, [1, 'sourceId'], 'unknown_source')
  errorAt(result, [1, 'attribution'], 'invalid_type')
  assert.deepEqual(result, validateSourceRecords(input, sources))
  assert.equal(validateSourceRecords([provenanceFixture()], sources).valid, true)
})

test('downstream provenance references reject missing/duplicate IDs and permit fixture emptiness explicitly', () => {
  const known = new Set(['fixture-provenance-a'])
  assert.deepEqual(validateProvenanceIds(['fixture-provenance-a'], known), { valid: true, value: ['fixture-provenance-a'] })
  errorAt(validateProvenanceIds(['fixture-provenance-missing'], known), [0], 'unknown_provenance')
  errorAt(validateProvenanceIds(['fixture-provenance-a', 'fixture-provenance-a'], known), [1], 'duplicate_id')
  assert.equal(validateProvenanceIds([], known).valid, false)
  assert.deepEqual(validateProvenanceIds([], known, { allowEmpty: true }), { valid: true, value: [] })
  errorAt(validateProvenanceIds([null], known), [0], 'invalid_type')
})

test('validated values project known fields and error messages do not expose private input', () => {
  const input = { ...provenanceFixture(), privateEvidence: 'fixture-private-marker', sourceId: 'fixture-private-marker' }
  const result = validateSourceRecord(input, sources)
  assert.equal(result.valid, false)
  assert.equal(JSON.stringify(result).includes('fixture-private-marker'), false)
  input.sourceId = 'K01'
  assert.equal(Object.hasOwn(validateSourceRecord(input, sources).value, 'privateEvidence'), false)
})

test('IDs reject blank/non-string values and preserve valid IDs without normalization', () => {
  for (const input of ['', '   ', 0, null, undefined]) assert.equal(validateId(input).valid, false)
  assert.deepEqual(validateId('fixture-id-a'), { valid: true, value: 'fixture-id-a' })
})

test('money preserves positive, explicit zero and unknown as three distinct inputs', () => {
  for (const amount of [12, 0, null]) {
    const result = validateCurrencyAmount(moneyFixture(amount))
    assert.equal(result.valid, true)
    assert.equal(result.value.amount, amount)
  }
  assert.notDeepEqual(validateCurrencyAmount(moneyFixture(null)), validateCurrencyAmount(moneyFixture(0)))
  const missing = moneyFixture(1)
  delete missing.amount
  errorAt(validateCurrencyAmount(missing), ['amount'], 'missing_field')
})

test('money rejects negative/fractional/non-finite/unsafe values and all numeric strings', () => {
  for (const amount of [-1, 1.5, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    errorAt(validateCurrencyAmount(moneyFixture(amount)), ['amount'], 'invalid_value')
  }
  for (const amount of ['12', '0', '1e2', 'not-a-number', false, [], {}, undefined]) {
    assert.equal(validateCurrencyAmount(moneyFixture(amount)).valid, false)
  }
})

test('currency vocabulary and original other label are required', () => {
  for (const currency of ['candle', 'heart', 'other']) assert.equal(validateCurrencyAmount(moneyFixture(1, currency)).valid, true)
  errorAt(validateCurrencyAmount(moneyFixture(1, 'fixture-unsupported-currency')), ['currency'], 'invalid_value')
  errorAt(validateCurrencyAmount({ ...moneyFixture(1, 'other'), sourceCurrencyLabel: ' ' }), ['sourceCurrencyLabel'], 'invalid_value')
  errorAt(validateCurrencyAmount({ ...moneyFixture(1), sourceCurrencyLabel: null }), ['sourceCurrencyLabel'], 'invalid_type')
})

test('date precision accepts possible dates including Gregorian leap years without inventing a timezone', () => {
  for (const value of ['2024-02-29', '2000-02-29', '2024-12-31']) {
    const fixture = timeFixture(value, 'date')
    assert.deepEqual(validatePartialTime(fixture), { valid: true, value: fixture })
  }
})

test('date precision rejects impossible and non-date values', () => {
  for (const value of ['2023-02-29', '1900-02-29', '2024-04-31', '2024-13-01', '2024-00-01', '2024-01-00', '2024-02-30', '2024-02-29T00:00:00Z', '2024-02-29\n']) {
    errorAt(validatePartialTime(timeFixture(value, 'date')), ['value'], 'invalid_date')
  }
})

test('exact instants accept explicit UTC/offset and preserve input without normalization', () => {
  for (const value of ['2024-02-29T12:30:00Z', '2024-02-29T12:30:00.123+07:00', '2024-02-29T12:30:00-05:30', '2024-02-29T12:30+0700', '2024-02-29T12:30+07']) {
    const fixture = timeFixture(value, 'instant')
    assert.deepEqual(validatePartialTime(fixture), { valid: true, value: fixture })
    assert.deepEqual(validateDateTime(value), { valid: true, value })
  }
})

test('exact instant requires offset in value even if timezone metadata is supplied', () => {
  for (const timezone of [null, 'UTC', 'fixture-timezone-label']) {
    errorAt(validatePartialTime(timeFixture('2024-02-29T12:30:00', 'instant', timezone)), ['value'], 'invalid_instant')
  }
})

test('impossible instants, clocks and offsets are rejected rather than Date.parse normalization', () => {
  for (const value of ['2024-02-30T12:30:00Z', '2024-02-29T24:00:00Z', '2024-02-29T12:60:00Z', '2024-02-29T12:30:60Z', '2024-02-29T12:30:00+24:00', '2024-02-29T12:30:00+07:60', '2024-02-29T12:30:00Z\n', '2024-02-29', 'not-a-date']) {
    assert.equal(validateDateTime(value).valid, false)
  }
})

test('unknown precision preserves raw source text and nullable metadata, never creates an instant', () => {
  const fixture = { ...timeFixture('fixture-unspecified-time', 'unknown'), rawLabel: 'fixture-original-label' }
  assert.deepEqual(validatePartialTime(fixture), { valid: true, value: fixture })
  errorAt(validatePartialTime({ ...fixture, precision: 'minute' }), ['precision'], 'invalid_value')
  const missing = timeFixture('2024-01-01', 'date')
  delete missing.timezone
  errorAt(validatePartialTime(missing), ['timezone'], 'missing_field')
})

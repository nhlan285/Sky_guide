import assert from 'node:assert/strict'
import test from 'node:test'
import { compareInstants, addInstantMilliseconds, validateDateTime } from '../../src/data/core/time.ts'

test('ordering accepts every portable spelling without truncating fractions', () => {
  for (const value of ['2026-10-07t00:00z','2026-10-07T01:00+01','2026-10-07T01:00:00+0100','2026-10-07T01:00:00,000+01:00']) {
    assert.equal(validateDateTime(value).valid,true)
    assert.equal(compareInstants(value,'2026-10-07T00:00:00.000Z'),0)
  }
  assert.equal(compareInstants('2026-10-07T00:00:00.0001Z','2026-10-07T00:00:00.000Z'),1)
  assert.equal(compareInstants('2026-10-07T00:00:00,00000000000000000001Z','2026-10-07T00:00Z'),1)
  assert.equal(compareInstants('0000-01-01T00:00Z','0099-01-01T00:00Z'),-1)
  assert.throws(()=>compareInstants('invalid','2026-10-07T00:00Z'))
})

test('retry arithmetic preserves sub-millisecond digits through carry and offsets', () => {
  assert.equal(addInstantMilliseconds('2026-10-07T01:00:00,9999+01',1),'2026-10-07T00:00:01.0009Z')
  assert.equal(addInstantMilliseconds('2026-10-07T23:59:59.999000000001Z',1),'2026-10-08T00:00:00.000000000001Z')
  assert.throws(()=>addInstantMilliseconds('9999-12-31T23:59:59.999Z',1))
  assert.throws(()=>addInstantMilliseconds('2026-10-07T00:00Z',Number.MAX_SAFE_INTEGER))
})

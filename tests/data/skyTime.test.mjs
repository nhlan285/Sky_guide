import test from 'node:test'
import assert from 'node:assert/strict'
import { getPhaseForHour, getSkyVisualState, getVisualStateForMode } from '../../src/features/constellation/skyTime.ts'

const fields = ['sunriseWeight', 'daylightWeight', 'sunsetWeight', 'nightWeight', 'starVisibility', 'cloudVisibility', 'constellationVisibility', 'horizonWarmth', 'hazeVisibility']
const boundaries = ['04:59', '05:00', '07:00', '09:00', '10:00', '15:59', '16:00', '17:00', '19:00', '20:00', '20:59', '21:00', '23:00']
const minute = text => { const [h, m] = text.split(':').map(Number); return h * 60 + m }

test('all requested local-clock boundaries produce normalized, deterministic visual weights', () => {
  for (const time of boundaries) {
    const state = getSkyVisualState(minute(time))
    assert.deepEqual(state, getSkyVisualState(minute(time)), time)
    for (const field of fields) assert.ok(Number.isFinite(state[field]) && state[field] >= 0 && state[field] <= 1, `${time}: ${field}`)
    assert.ok(Math.abs(state.sunriseWeight + state.daylightWeight + state.sunsetWeight + state.nightWeight - 1) < 1e-12)
    assert.equal(state.phase, getPhaseForHour(minute(time) / 60))
  }
})

test('visual values remain continuous across every phase boundary, keyframe and midnight', () => {
  for (let clock = 0; clock < 1440; clock++) {
    const before = getSkyVisualState(clock - 1 / 60)
    const after = getSkyVisualState(clock + 1 / 60)
    for (const field of fields) assert.ok(Math.abs(before[field] - after[field]) < 0.001, `${clock}: ${field}`)
  }
  assert.equal(getSkyVisualState(299).phase, 'night')
  assert.equal(getSkyVisualState(300).phase, 'daylight')
  assert.equal(getSkyVisualState(1020).phase, 'sunset')
  assert.equal(getSkyVisualState(1260).phase, 'night')
})

test('morning evolves from cool dawn into daylight without a separate user mode', () => {
  const dawn = getSkyVisualState(minute('05:00'))
  const morning = getSkyVisualState(minute('07:00'))
  const day = getSkyVisualState(minute('09:00'))
  assert.ok(dawn.nightWeight > morning.nightWeight)
  assert.ok(morning.sunriseWeight > day.sunriseWeight)
  assert.ok(day.daylightWeight > morning.daylightWeight)
  assert.ok(day.cloudVisibility > dawn.cloudVisibility)
  assert.ok(day.starVisibility < dawn.starVisibility)
})

test('late day is increasingly close to sunset and evening progressively reveals night', () => {
  assert.ok(getSkyVisualState(minute('16:55')).sunsetWeight > getSkyVisualState(minute('16:05')).sunsetWeight)
  const early = getSkyVisualState(minute('17:05'))
  const late = getSkyVisualState(minute('20:55'))
  assert.ok(late.nightWeight > early.nightWeight)
  assert.ok(late.starVisibility > early.starVisibility)
  assert.ok(late.hazeVisibility > early.hazeVisibility)
  assert.ok(late.cloudVisibility < early.cloudVisibility)
  assert.ok(late.constellationVisibility > early.constellationVisibility)
})

test('midday is cloudy and nearly starless while night reveals celestial depth', () => {
  for (const time of ['10:00', '15:59']) {
    const day = getSkyVisualState(minute(time))
    assert.ok(day.starVisibility < 0.03)
    assert.ok(day.cloudVisibility > 0.85)
    assert.ok(day.constellationVisibility < 0.1)
  }
  const night = getSkyVisualState(minute('23:00'))
  assert.equal(night.nightWeight, 1)
  assert.ok(night.hazeVisibility > 0.6)
})

test('manual scenes are stable representative moments, Auto uses local hours and minutes', () => {
  const first = new Date(2026, 9, 2, 7, 30, 0)
  const second = new Date(2026, 9, 2, 20, 55, 0)
  for (const mode of ['daylight', 'sunset', 'night']) assert.deepEqual(getVisualStateForMode(mode, first), getVisualStateForMode(mode, second))
  assert.deepEqual(getVisualStateForMode('auto', first), getSkyVisualState(450))
  assert.deepEqual(getVisualStateForMode('auto', second), getSkyVisualState(1255))
})

test('visual clock wraps at midnight and invalid numeric clock input stays finite', () => {
  assert.deepEqual(getSkyVisualState(-1), getSkyVisualState(1439))
  assert.deepEqual(getSkyVisualState(1440), getSkyVisualState(0))
  assert.deepEqual(getSkyVisualState(NaN), getSkyVisualState(0))
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { generateStars, starCount, viewportClass } from '../../src/features/constellation/starGeneration.ts'
import { translations } from '../../src/shared/i18n/translations.ts'

test('same seed/viewport gives the same scene without storing a large snapshot', () => {
  const config = { width: 360, height: 740, dpr: 2, seed: 91 }
  assert.deepEqual(generateStars(config), generateStars(config))
  assert.notDeepEqual(generateStars(config).slice(0, 8), generateStars({ ...config, seed: 92 }).slice(0, 8))
})

test('viewport density scales from rich mobile to desktop and is bounded on large screens', () => {
  const mobile = starCount(390, 844, 3)
  const desktop = starCount(1440, 900, 1)
  assert.ok(mobile >= 250 && mobile <= 500)
  assert.ok(desktop >= 650 && desktop > mobile)
  assert.equal(starCount(8000, 4000, 4), 1400)
  assert.ok(starCount(8000, 4000, 4, true) <= 1000)
  assert.equal(starCount(390, 844, 9), starCount(390, 844, 2))
})

test('distribution uses three depth populations with varied sizes and stable normalized coordinates', () => {
  const stars = generateStars({ width: 1440, height: 900, seed: 12 })
  const depths = new Set(stars.map(star => star.depth))
  assert.equal(depths.size, 3)
  assert.ok(stars.filter(star => star.depth === 0).length > stars.filter(star => star.depth === 1).length)
  assert.ok(stars.filter(star => star.depth === 1).length > stars.filter(star => star.depth === 2).length)
  for (const star of stars) {
    for (const value of Object.values(star)) assert.ok(Number.isFinite(value))
    assert.ok(star.x >= 0 && star.x <= 1 && star.y >= 0 && star.y <= 1)
    assert.ok(star.radius > 0 && star.opacity > 0 && star.opacity <= 1)
  }
})

test('resizing within a class preserves the seed pattern; a new class has its own composition', () => {
  const small = generateStars({ width: 360, height: 740 })
  const larger = generateStars({ width: 430, height: 930 })
  assert.deepEqual(small.slice(0, 30), larger.slice(0, 30))
  assert.notDeepEqual(small.slice(0, 30), generateStars({ width: 1200, height: 800 }).slice(0, 30))
  assert.equal(viewportClass(639), 'compact')
  assert.equal(viewportClass(640), 'tablet')
  assert.equal(viewportClass(1100), 'wide')
})

test('degenerate viewport input cannot generate unbounded star arrays or invalid points', () => {
  for (const config of [{ width: 0, height: 0 }, { width: NaN, height: Infinity, dpr: NaN }]) {
    const stars = generateStars(config)
    assert.ok(stars.length >= 250 && stars.length <= 1400)
    assert.ok(stars.every(star => Number.isFinite(star.x) && Number.isFinite(star.y)))
  }
})


test('every visible copy key has Vietnamese and English text', () => {
  assert.deepEqual(Object.keys(translations.vi).sort(), Object.keys(translations.en).sort())
  for (const locale of Object.values(translations)) assert.ok(Object.values(locale).every(text => typeof text === 'string' && text.trim().length > 0))
})

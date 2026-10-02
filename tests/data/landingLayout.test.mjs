import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { compositionForViewport, destinations, features } from '../../src/features/constellation/constellationLayout.ts'

test('landing recomposes for portrait, short portrait, landscape and very low available height', () => {
  assert.equal(compositionForViewport(360, 600).name, 'compact')
  assert.equal(compositionForViewport(360, 400).name, 'portrait-short')
  assert.equal(compositionForViewport(768, 700).name, 'tablet')
  assert.equal(compositionForViewport(1440, 780).name, 'wide')
  assert.equal(compositionForViewport(812, 240).name, 'landscape')
  assert.equal(compositionForViewport(320, 215).name, 'micro')
})
test('all primary node boxes fit the available scene across representative sizes', () => {
  // Conservative two-line label boxes from CSS: normal 152x90, compact 104x86;
  // low-height presets use horizontal 44px hit targets. Scene excludes chrome.
  for (const [width, height] of [[320,215], [328,400], [358,610], [398,750], [608,420], [635,500], [668,240], [780,260], [768,620], [1024,660], [1366,650], [1920,970]]) {
    const layout = compositionForViewport(width, height)
    const short = ['landscape','portrait-short','micro'].includes(layout.name)
    const halfWidth = layout.name === 'micro' ? 46 : short ? 56 : width < 640 ? 52 : 76
    for (const feature of features) {
      const [x, y] = layout.nodes[feature]
      assert.ok(x - halfWidth >= 0 && x + halfWidth <= width, `${width}x${height}: ${feature} horizontal bounds`)
      assert.ok(y - 22 >= 0 && y + (short ? 22 : width < 640 ? 64 : 68) <= height, `${width}x${height}: ${feature} vertical bounds`)
    }
  }
})
test('landing uses an exact viewport shell with safe areas and no taller-than-screen fallbacks', () => {
  const css = readFileSync(new URL('../../src/app/styles/constellation.css', import.meta.url), 'utf8')
  assert.match(css, /\.app-shell--landing \{ height: 100svh; height: 100dvh; min-height: 0; overflow: clip;/)
  assert.match(css, /grid-template-rows: auto minmax\(0, 1fr\) auto/)
  assert.match(css, /safe-area-inset-bottom/)
  assert.ok(!/height:\s*max\(100[sd]vh/.test(css))
  assert.ok(!/\.constellation-scene\s*\{[^}]*min-height:\s*[1-9]/.test(css))
})
test('Wardrobe navigation reaches the editor directly; SPA fallback covers reload', () => {
  assert.equal(destinations.wardrobe, '/wardrobe')
  const app = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8')
  const hub = readFileSync(new URL('../../src/features/hub/Hub.tsx', import.meta.url), 'utf8')
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
  assert.match(app, /path="\/wardrobe" element=/)
  assert.match(app, /<WardrobeEditor \/>/)
  assert.match(hub, /<Link to="\/wardrobe"/)
  assert.ok(config.rewrites.some(rule => rule.source === '/(.*)' && rule.destination === '/index.html'))
})

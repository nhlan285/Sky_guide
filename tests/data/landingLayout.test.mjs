import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { clusters, compositions, compositionForViewport, destinations, features } from '../../src/features/constellation/celestialAtlas.ts'
import { skyNavigationDelay } from '../../src/features/constellation/navigationMotion.ts'

test('atlas selects wide, desktop, tablet, orbital portrait, ribbon and compact presets', () => {
  for (const [width, height, name] of [[1920,970,'wide'], [1440,780,'desktop'], [768,700,'tablet'], [360,600,'portrait'], [360,400,'portrait'], [812,240,'landscape'], [320,215,'compact'], [1100,480,'landscape'], [1099,600,'tablet'], [1600,800,'wide']]) {
    assert.equal(compositionForViewport(width, height).name, name)
  }
})

test('six unique clusters contain bounded local stars, valid edges and original silhouettes', () => {
  assert.equal(clusters.length, 6)
  assert.deepEqual(clusters.map(cluster => cluster.id), features)
  assert.equal(new Set(features).size, features.length)
  const silhouettes = new Set()
  for (const cluster of clusters) {
    assert.ok(cluster.stars.length >= 3 && cluster.stars.length <= 7)
    const ids = new Set(cluster.stars.map(star => star.id))
    assert.equal(ids.size, cluster.stars.length)
    for (const star of cluster.stars) {
      assert.ok(star.radius > 0)
      for (const value of [star.x, star.y]) assert.ok(Number.isFinite(value) && value >= star.radius * 3.5 && value <= 100 - star.radius * 3.5)
    }
    for (const point of cluster.dust) for (const value of point) assert.ok(value >= 0 && value <= 100)
    const edges = new Set()
    for (const [from, to] of cluster.edges) {
      assert.ok(ids.has(from) && ids.has(to), `${cluster.id}: unknown local endpoint`)
      assert.notEqual(from, to)
      const key = [from, to].sort().join('-')
      assert.ok(!edges.has(key))
      edges.add(key)
    }
    assert.ok(cluster.edges.length >= 2)
    silhouettes.add(JSON.stringify(cluster.stars.map(({ x, y }) => [x, y])))
  }
  assert.equal(silhouettes.size, features.length)
})

test('every responsive composition keeps all six required destinations', () => {
  assert.deepEqual(new Set(Object.values(destinations)), new Set(['/items', '/hub#season-event', '/hub#traveling-spirit', '/hub#official-news', '/hub#maps-routes', '/wardrobe']))
  for (const preset of Object.values(compositions)) assert.deepEqual(Object.keys(preset.clusters).sort(), [...features].sort())
})

test('cluster hit boxes fit the scene, avoid each other and leave the identity pocket empty', () => {
  // Scene dimensions exclude toolbar, disclosure and safe-area padding.
  const viewports = [[288,215], [288,360], [320,215], [328,400], [358,610], [398,750], [608,420], [635,500], [640,480], [668,240], [780,260], [768,620], [1024,660], [1366,650], [1920,970], [2530,980]]
  for (const [width, height] of viewports) {
    const layout = compositionForViewport(width, height)
    assert.ok(layout.clusterWidth >= 44 && layout.clusterHeight >= 44)
    const boxes = features.map(id => ({ id, x: layout.clusters[id][0], y: layout.clusters[id][1], w: layout.clusterWidth, h: layout.clusterHeight }))
    boxes.push({ id: 'identity', x: layout.title[0], y: layout.title[1], w: layout.titleWidth, h: layout.titleHeight })
    for (const box of boxes) {
      assert.ok(box.x - box.w / 2 >= 0 && box.x + box.w / 2 <= width, `${width}x${height}: ${box.id} horizontal bounds`)
      assert.ok(box.y - box.h / 2 >= 0 && box.y + box.h / 2 <= height, `${width}x${height}: ${box.id} vertical bounds`)
      for (const other of boxes) if (other !== box) {
        assert.ok(Math.abs(box.x - other.x) >= (box.w + other.w) / 2 || Math.abs(box.y - other.y) >= (box.h + other.h) / 2, `${width}x${height}: ${box.id} overlaps ${other.id}`)
      }
    }
  }
})

test('reduced motion navigates immediately; the local dive stays within the transition budget', () => {
  assert.equal(skyNavigationDelay(true), 0)
  assert.ok(skyNavigationDelay(false) >= 300)
  assert.ok(skyNavigationDelay(false) + 180 <= 550)
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

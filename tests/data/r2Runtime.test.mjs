/* global Request, Response, fetch, process */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { URL } from 'node:url'
import sharp from 'sharp'
import manifestFunction from '../../api/manifest/[name].ts'
import assetFunction from '../../api/asset/[...path].ts'
import { parseAssetIndex, parseAssetShard, selectItemAsset } from '../../src/data/itemLookup/assets.ts'
import { wikiBucket } from '../../src/data/itemLookup/wiki.ts'
import { validateImage } from '../../scripts/assets/images.mjs'

async function listen(server) {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${server.address().port}`
}

test('R2 runtime routes dispatch before SPA and serve parseable manifests plus signed WebP redirects', async t => {
  // Use generated Build Output too when validating a completed Vercel build.
  const config = JSON.parse(await readFile(process.env.SKY_TEST_ROUTE_CONFIG ?? 'vercel.json', 'utf8'))
  const hash = 'a'.repeat(64)
  const id = 'tsa-cosmetic-0'
  const version = '0123456789abcdef'
  const cardPath = `/assets/items/cards/${hash}.webp`
  const webp = await sharp({ create: { width: 2, height: 3, channels: 4, background: '#aabbcc' } }).webp().toBuffer()
  const primary = {
    mediaId: 'synthetic-r2-fixture', hash, width: 2, height: 3, hasAlpha: true,
    kind: 'primary', rightsStatus: 'unknown', publishingEligible: false, mappingStatus: 'exact',
    sourceUrl: 'https://example.org/fixture.png', sourcePageUrl: 'https://example.org/fixture',
    filePageUrl: 'https://example.org/file', sourceFilename: 'fixture.png', sourceRevision: 1,
    crawlTimestamp: '2026-10-04T00:00:00Z', licenseMetadata: {}, creditMetadata: {},
    variants: Object.fromEntries(['thumbnails', 'cards', 'detail'].map(variant => [variant, {
      webPath: `/assets/items/${variant}/${hash}.webp`, hash, width: 2, height: 3, bytes: webp.length,
    }])),
  }
  const indexBody = { schemaVersion: 1, version, entries: { [id]: { primary } } }
  const shardBody = { schemaVersion: 1, version, entries: { [id]: {
    itemId: id, primary, gallery: [], sourcePages: [], updatedAt: null,
  } } }
  const objects = new Map([
    ['/fixture-bucket/manifests/index.json', ['application/json', Buffer.from(JSON.stringify(indexBody))]],
    ['/fixture-bucket/manifests/items-00.json', ['application/json', Buffer.from(JSON.stringify(shardBody))]],
    [`/fixture-bucket/items/cards/${hash}.webp`, ['image/webp', webp]],
  ])
  const storageRequests = []
  const storage = createServer((req, res) => {
    const url = new URL(req.url, 'http://fixture')
    storageRequests.push({ method: req.method, path: url.pathname, signed: url.searchParams.has('X-Amz-Signature') })
    const object = objects.get(url.pathname)
    if (!object) { res.writeHead(404); res.end(); return }
    res.writeHead(200, { 'Content-Type': object[0], 'Content-Length': object[1].length })
    res.end(req.method === 'HEAD' ? undefined : object[1])
  })
  const storageOrigin = await listen(storage)
  const env = { R2_ENDPOINT: storageOrigin, R2_BUCKET: 'fixture-bucket', R2_ACCESS_KEY_ID: 'fixture-access', R2_SECRET_ACCESS_KEY: 'fixture-secret' }
  const saved = Object.fromEntries(Object.keys(env).map(key => [key, process.env[key]]))
  Object.assign(process.env, env)
  const functions = new Map([
    ['/api/manifest/[name]', manifestFunction], ['/api/asset/[...path]', assetFunction],
  ])
  assert.equal(typeof manifestFunction.fetch, 'function', 'Vercel Web export required, not default Node function')
  assert.equal(typeof assetFunction.fetch, 'function')
  let appOrigin
  const app = createServer(async (req, res) => {
    try {
      let url = new URL(req.url, appOrigin)
      let result
      for (const route of config.routes) {
        if (route.handle) continue
        const match = new RegExp(`^(?:${route.src})$`).exec(url.pathname)
        if (!match || !route.dest) continue
        const dest = route.dest.replace(/\$([a-zA-Z]+|\d+)/g, (_, key) => match.groups?.[key] ?? match[Number(key)] ?? '')
        url = new URL(dest, appOrigin)
        const fn = functions.get(url.pathname)
        if (fn) {
          result = await fn.fetch(new Request(url, { method: req.method }))
          break
        }
        if (url.pathname === '/index.html') {
          result = new Response('<!doctype html><html>SPA fallback</html>', { headers: { 'Content-Type': 'text/html' } })
          break
        }
      }
      result ??= new Response('Not Found', { status: 404 })
      res.writeHead(result.status, Object.fromEntries(result.headers))
      res.end(Buffer.from(await result.arrayBuffer()))
    } catch {
      res.writeHead(500); res.end('Runtime invocation failed')
    }
  })
  appOrigin = await listen(app)
  t.after(async () => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    await Promise.all([app, storage].map(server => new Promise(resolve => server.close(resolve))))
  })

  await t.test('logical index and detail shard reach R2 and pass exact runtime parsers', async () => {
    const response = await fetch(`${appOrigin}/assets/items/manifests/index.json`)
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /application\/json/)
    const ids = new Set([id])
    const index = parseAssetIndex(await response.json(), ids)
    const shardResponse = await fetch(`${appOrigin}/assets/items/manifests/items-${wikiBucket(id)}.json`)
    assert.equal(shardResponse.status, 200)
    const shard = parseAssetShard(await shardResponse.json(), ids, index.version)
    assert.equal(selectItemAsset(shard.entries[id].primary), cardPath)
    assert.ok(storageRequests.some(r => r.path === '/fixture-bucket/manifests/index.json'))
  })
  await t.test('both API index spellings also dispatch before SPA', async () => {
    for (const path of ['/api/manifest/index', '/api/manifest/index.json']) {
      const response = await fetch(appOrigin + path)
      assert.equal(response.status, 200)
      assert.deepEqual(await response.json(), indexBody)
    }
  })
  await t.test('Items, detail and Wardrobe deep links retain the SPA fallback', async () => {
    for (const path of ['/items', `/items/${id}`, '/wardrobe']) {
      const response = await fetch(appOrigin + path)
      assert.equal(response.status, 200)
      assert.match(response.headers.get('content-type'), /text\/html/)
      assert.match(await response.text(), /SPA fallback/)
    }
  })
  await t.test('two-segment card route signs the right object; following redirect yields real WebP', async () => {
    for (const path of [cardPath, `/api/asset/cards/${hash}.webp`]) {
      const response = await fetch(appOrigin + path, { redirect: 'manual' })
      assert.equal(response.status, 302)
      const location = new URL(response.headers.get('location'))
      assert.equal(location.origin, storageOrigin)
      assert.equal(location.pathname, `/fixture-bucket/items/cards/${hash}.webp`)
      assert.ok(location.searchParams.has('X-Amz-Signature'))
      assert.equal(location.searchParams.get('X-Amz-Expires'), '3600')
      const image = await fetch(location)
      assert.equal(image.status, 200)
      const decoded = await validateImage(Buffer.from(await image.arrayBuffer()), image.headers.get('content-type'))
      assert.equal(decoded.format, 'webp')
      assert.equal(decoded.bytes, webp.length)
    }
  })
  await t.test('HEAD retains manifest metadata and signs a usable HEAD image request', async () => {
    const manifest = await fetch(`${appOrigin}/assets/items/manifests/index.json`, { method: 'HEAD' })
    assert.equal(manifest.status, 200)
    assert.equal(await manifest.text(), '')
    assert.match(manifest.headers.get('content-type'), /application\/json/)
    const image = await fetch(appOrigin + cardPath, { method: 'HEAD', redirect: 'manual' })
    assert.equal(image.status, 302)
    const object = await fetch(image.headers.get('location'), { method: 'HEAD' })
    assert.equal(object.status, 200)
    assert.equal(object.headers.get('content-type'), 'image/webp')
    assert.equal(Number(object.headers.get('content-length')), webp.length)
  })
  await t.test('invalid rewritten parameters, unsupported method and storage errors remain explicit', async () => {
    assert.equal((await manifestFunction.fetch(new Request(`${appOrigin}/api/manifest/[name]?name=../index`))).status, 404)
    assert.equal((await assetFunction.fetch(new Request(`${appOrigin}/api/asset/[...path]?variant=cards&file=../bad.webp`))).status, 404)
    const post = await fetch(`${appOrigin}/api/manifest/index`, { method: 'POST' })
    assert.equal(post.status, 405)
    assert.equal(post.headers.get('allow'), 'GET, HEAD')
    delete process.env.R2_BUCKET
    const unavailable = await fetch(`${appOrigin}/assets/items/manifests/index.json`)
    assert.equal(unavailable.status, 503)
    assert.equal(await unavailable.text(), 'Storage not configured')
    process.env.R2_BUCKET = env.R2_BUCKET
  })
})

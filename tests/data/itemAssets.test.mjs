/* global structuredClone, fetch */
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { Buffer } from 'node:buffer'
import { mkdir, mkdtemp, readFile, writeFile, stat, rm, realpath } from 'node:fs/promises'
import { URL, URLSearchParams } from 'node:url'
import { join, resolve } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { configuration, preflight, assertCapacity, GiB } from '../../scripts/assets/config.mjs'
import { sha256 } from '../../scripts/assets/io.mjs'
import { signature, validateImage, optimizeImage, assetName } from '../../scripts/assets/images.mjs'
import { downloadOne, downloadUrl } from '../../scripts/assets/download.mjs'
import { buildAssets, chooseLocalPrimary, rightsFor } from '../../scripts/assets/manifest.mjs'
import { createAssetStore } from '../../scripts/assets/storage.mjs'
import { localItemAssets } from '../../scripts/assets/vite.mjs'
import { paginate } from '../../scripts/wiki/api.mjs'
import { matchBinding } from '../../scripts/wiki/map.mjs'
import { readCorpus } from '../../scripts/wiki/output.mjs'
import { loadCatalogue } from '../../scripts/wiki/source.mjs'
import { selectItemAsset, parseAssetIndex, parseAssetShard, controlledAssetPath } from '../../src/data/itemLookup/assets.ts'
import { catalogResult } from '../../src/data/itemLookup/catalog.ts'
import { contextualLookupUrl, filtersFromParams, filterEntries } from '../../src/data/itemLookup/model.ts'

const testBase = join(configuration().metadataDir, 'tests')
await mkdir(testBase, { recursive: true })
const root = await mkdtemp(join(testBase, 'pipeline-'))
const config = configuration({ SKY_ASSET_ROOT: root })
await preflight(config)
after(async () => {
  const actual = await realpath(root)
  assert.equal(actual.toLowerCase(), resolve(root).toLowerCase())
  assert.ok(actual.toLowerCase().startsWith(`${resolve(testBase).toLowerCase()}\\`))
  await rm(actual, { recursive: true })
})
const png = await sharp({ create: { width: 17, height: 23, channels: 4, background: { r: 120, g: 30, b: 200, alpha: .25 } } }).png().toBuffer()
const source = { mediaId: 'fixture-a', originalUrl: 'https://static.wikia.nocookie.net/sky-children-of-the-light/images/a/aa/fixture.png', filePageUrl: 'https://sky-children-of-the-light.fandom.com/wiki/File:fixture.png', sourcePage: 'Fixture page', fileTitle: 'File:fixture.png', sourceRevision: 1, timestamp: '2026-10-03T00:00:00Z', itemIds: ['tsa-cosmetic-1'], mime: 'image/png', width: 17, height: 23 }
const response = (bytes, contentType = 'image/png') => ({ ok: true, status: 200, url: source.originalUrl, headers: new Map([['content-type', contentType], ['etag', 'fixture-etag']]), body: (async function* () { yield bytes })() })
const reservation = { held: 0, reserve: async function (n) { this.held += n }, release: function (n) { this.held -= n } }
const reserve = reservation.reserve.bind(reservation), release = reservation.release.bind(reservation)
let downloaded, runtimeAsset

test('configuration centralizes E: storage and refuses C:, temp, relative, UNC and repo/cache fallbacks', () => {
  assert.equal(configuration({}).root, 'E:\\SkyGuideAssets')
  for (const SKY_ASSET_ROOT of ['C:\\Users\\HP\\Assets', 'C:\\temp', '.cache', 'E:\\', 'E:\\.vscode\\Sky_guide\\.cache', 'E:\\node_modules\\cache', '\\\\server\\share']) assert.throws(() => configuration({ SKY_ASSET_ROOT }), /ASSET_ROOT_INVALID/)
  assert.throws(() => configuration({ SKY_ASSET_CACHE_LIMIT_GB: 'bad' }))
})
test('preflight hard-stops before creating directories when E: is missing, disk low or cache over limit', async () => {
  let creations = 0
  const io = { statfs: async () => ({ bavail: 10 * GiB, bsize: 1 }), directoryStats: async () => ({ bytes: 0 }), mkdir: async () => creations++ }
  await assert.rejects(preflight(config, io), /MINIMUM_FREE_SPACE/); assert.equal(creations, 0)
  await assert.rejects(preflight(config, { ...io, statfs: async () => { throw new Error('E missing') } }), /E missing/)
  await assert.rejects(preflight(config, { ...io, statfs: async () => ({ bavail: 30 * GiB, bsize: 1 }), directoryStats: async () => ({ bytes: 16 * GiB }) }), /CACHE_LIMIT/)
})
test('safe directory creation rejects junctions and unwritable roots without fallback', async () => {
  const calls = []
  const io = { statfs: async () => ({ bavail: 30 * GiB, bsize: 1 }), directoryStats: async () => ({ bytes: 0 }), mkdir: async p => calls.push(p), realpath: async p => p, writeFile: async () => {}, unlink: async () => {} }
  assert.equal((await preflight(config, io)).status, 'READY')
  assert.ok(calls.some(p => p.endsWith('processed\\cards')))
  await assert.rejects(preflight(config, { ...io, realpath: async () => 'C:\\bad' }), /ASSET_ROOT_INVALID/)
  await assert.rejects(preflight(config, { ...io, writeFile: async () => { throw new Error('EACCES') } }), /EACCES/)
})
test('capacity reservations protect both raw soft limit and minimum free space', () => {
  assert.throws(() => assertCapacity({ usage: 14.99 * GiB, additional: .1 * GiB, free: 30 * GiB, config }), /CACHE_LIMIT_REACHED/)
  assert.throws(() => assertCapacity({ usage: 0, additional: 2 * GiB, free: 21 * GiB, config }), /MINIMUM_FREE_SPACE/)
})
test('storage adapter keeps local paths on E: and supports an explicit owned HTTPS prefix without uploads', () => {
  const key = `cards/${sha256('fixture')}.webp`
  assert.equal(createAssetStore(config).reference(key).webPath, `/assets/items/${key}`)
  const migrated = createAssetStore(configuration({ SKY_ASSET_ROOT: root, SKY_ASSET_PUBLIC_BASE_URL: 'https://assets.sky-guide.example/items' }))
  assert.equal(migrated.kind, 'owned-object-storage'); assert.equal(migrated.reference(key).webPath, `https://assets.sky-guide.example/items/${key}`)
  assert.ok(migrated.reference(key).localPath.startsWith(root))
  assert.throws(() => createAssetStore(config).reference('../bad'))
  for (const SKY_ASSET_PUBLIC_BASE_URL of ['https://static.wikia.nocookie.net/items', 'https://sky.fandom.com/items', 'http://assets.example/items', 'https://u:p@assets.example/items']) assert.throws(() => configuration({ SKY_ASSET_PUBLIC_BASE_URL }))
})
test('URL discovery follows pagination and rejects unsafe download redirects', async () => {
  let requests = 0
  const responses = await paginate(async p => { requests++; return p.imcontinue ? { query: { images: ['two'] } } : { query: { images: ['one'] }, continue: { imcontinue: 'cursor' } } }, { prop: 'images' })
  assert.equal(responses.length, 2); assert.equal(requests, 2)
  assert.equal(downloadUrl(source.originalUrl), source.originalUrl)
  for (const url of ['http://static.wikia.nocookie.net/x', 'https://example.org/x', 'https://u:p@static.wikia.nocookie.net/x']) assert.throws(() => downloadUrl(url))
})
test('validation uses actual signatures, dimensions and full decode and rejects HTML/truncated/zero-byte responses', async () => {
  const image = await validateImage(png, 'image/png')
  assert.equal(image.width, 17); assert.equal(image.height, 23); assert.equal(image.hasAlpha, true); assert.equal(image.format, 'png')
  assert.equal(signature(png), 'png')
  await assert.rejects(validateImage(Buffer.from('<html>Cloudflare error</html>'), 'image/png'), /SIGNATURE/)
  await assert.rejects(validateImage(png, 'text/html'), /CONTENT_TYPE/)
  await assert.rejects(validateImage(Buffer.alloc(0), 'image/png'), /CONTENT_TYPE/)
  await assert.rejects(validateImage(png.subarray(0, 40), 'image/png'))
  const webp = await sharp(png).webp().toBuffer()
  assert.equal((await validateImage(webp, 'image/webp')).format, 'webp')
})
test('SHA-256 matches a known digest and names are deterministic, path-safe and shared by duplicate contents', () => {
  assert.equal(sha256('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  assert.equal(assetName(sha256(png), 'cards'), assetName(sha256(Buffer.from(png)), 'cards'))
  assert.throws(() => assetName('../bad', 'cards')); assert.throws(() => assetName(sha256(png), '../bad'))
})
test('download validates and checkpoints per source, preserves HTTP validators and resumes without network', async () => {
  let requests = 0
  const fetcher = async () => { requests++; return response(png) }
  downloaded = await downloadOne(source, config, reserve, release, fetcher)
  assert.equal(downloaded.status, 'complete'); assert.equal(downloaded.etag, 'fixture-etag'); assert.equal(reservation.held, 0)
  const resumed = await downloadOne(source, config, reserve, release, fetcher)
  assert.equal(resumed.cached, true); assert.equal(requests, 1); assert.equal(resumed.hash, downloaded.hash)
})
test('corrupted cache is repaired, duplicates use one raw file and invalid HTTP/HTML responses are logged', async () => {
  await writeFile(downloaded.localSourcePath, 'corrupted fixture bytes')
  let repairs = 0
  const repaired = await downloadOne(source, config, reserve, release, async () => { repairs++; return response(png) })
  assert.equal(repaired.hash, downloaded.hash); assert.equal(repairs, 1)
  const duplicate = await downloadOne({ ...source, originalUrl: `${source.originalUrl}?duplicate=1` }, config, reserve, release, async () => response(png))
  assert.equal(duplicate.localSourcePath, downloaded.localSourcePath)
  const invalid = await downloadOne({ ...source, originalUrl: `${source.originalUrl}?html=1` }, config, reserve, release, async () => response(Buffer.from('<html>Error</html>')))
  assert.equal(invalid.status, 'failed'); assert.equal(invalid.attempts, 1); assert.match(invalid.error, /SIGNATURE/)
  const denied = await downloadOne({ ...source, originalUrl: `${source.originalUrl}?404=1` }, config, reserve, release, async () => ({ ok: false, status: 404, headers: new Map() }))
  assert.equal(denied.httpStatus, 404); assert.equal(denied.attempts, 1); assert.equal(reservation.held, 0)
  const cachedFailure = await downloadOne({ ...source, originalUrl: `${source.originalUrl}?404=1` }, config, reserve, release, async () => { throw new Error('Must not request a cached permanent failure') })
  assert.equal(cachedFailure.cached, true)
  const forcedRetry = await downloadOne({ ...source, originalUrl: `${source.originalUrl}?404=1` }, { ...config, retryPermanent: true }, reserve, release, async () => response(png))
  assert.equal(forcedRetry.status, 'complete')
})
test('variants preserve alpha, avoid upscaling and do not rewrite unchanged outputs', async () => {
  await assert.rejects(optimizeImage({ ...downloaded, localSourcePath: 'C:\\should-never-be-read.png' }, config), /Unsafe raw cache reference/)
  const optimized = await optimizeImage(downloaded, config)
  const path = join(config.processedDir, optimized.variants.cards.relativePath)
  const before = (await stat(path)).mtimeMs
  assert.equal(optimized.variants.cards.width, 17); assert.equal(optimized.variants.cards.height, 23)
  const rgba = await sharp(await readFile(path)).raw().toBuffer({ resolveWithObject: true })
  assert.equal(rgba.info.channels, 4); assert.ok(Math.abs(rgba.data[3] - 64) <= 1)
  assert.deepEqual(await optimizeImage(downloaded, config), optimized); assert.equal((await stat(path)).mtimeMs, before)
})
test('mapping combines aliases/category/context, validates manual overrides and leaves ties ambiguous', () => {
  const item = id => ({ id, name: { default: `Fixture ${id}` }, spiritIds: ['s1'], seasonIds: [] })
  const catalogue = { items: [item('i1'), item('i2')], lookup: [{ id: 'i1', identifier: 'FirstCape', category: 'cape' }, { id: 'i2', identifier: 'SecondCape', category: 'cape' }], spirits: [{ id: 's1', name: { default: 'Fixture Spirit' } }], seasons: [] }
  const binding = { key: 'fixture', names: ['Alias'], canonicalNames: [], contextNames: ['Fixture Spirit'], category: 'cape', allowContext: true }
  assert.equal(matchBinding(binding, catalogue).status, 'ambiguous')
  assert.deepEqual(matchBinding(binding, catalogue).itemIds, [])
  assert.equal(matchBinding(binding, catalogue, { aliases: { fixture: ['FirstCape'] } }).status, 'exact')
  assert.equal(matchBinding(binding, catalogue, { bindings: { fixture: { identifier: 'FirstCape', reason: 'Reviewed fixture' } } }).status, 'manual')
  assert.throws(() => matchBinding(binding, catalogue, { bindings: { fixture: { identifier: 'FirstCape' } } }))
})
test('primary selection prioritizes isolated/transparent assets over worn gameplay and supports explicit overrides', () => {
  const image = { mediaId: 'clean', fileTitle: 'File:render.png', mediaKind: 'primary', itemIds: ['i1'], hasAlpha: true, width: 17, height: 23 }
  const worn = { ...image, mediaId: 'worn', fileTitle: 'File:gameplay.jpg', hasAlpha: false, mediaKind: 'worn-preview', width: 2000, height: 2000 }
  assert.equal(chooseLocalPrimary([worn, image], 'i1').mediaId, 'clean')
  assert.equal(chooseLocalPrimary([worn, image], 'i1', { assets: { i1: { primaryId: 'worn', reason: 'Reviewed fixture' } } }).mediaId, 'worn')
})
test('rights are never inferred from public availability or the Wiki text license', () => {
  assert.equal(rightsFor({ mediaId: 'fixture', licenseMetadata: { LicenseShortName: { value: 'CC-BY-SA' } } }, {}).status, 'unknown')
  assert.equal(rightsFor({ mediaId: 'fixture', licenseMetadata: { Restrictions: { value: 'All rights reserved' } } }, {}).status, 'restricted')
  assert.throws(() => rightsFor({ mediaId: 'fixture' }, { rights: { fixture: { status: 'verified', reason: 'No proof' } } }))
})
test('manifest maps real bytes with provenance, dedupes normalized copies and separates preview/public eligibility', async () => {
  const original = await readCorpus(), catalogue = await loadCatalogue()
  const record = original.records.find(r => r.itemIds.length === 1 && r.mediaKind === 'primary')
  const id = record.itemIds[0]
  const item = catalogue.items.find(i => i.id === id)
  const lookup = catalogue.lookup.find(i => i.id === id)
  const make = (mediaId, mediaKind) => ({ ...record, mediaId, mediaKind, mappings: record.mappings.map(m => ({ ...m, kind: mediaKind })), fileTitle: 'File:fixture-render.png', width: 17, height: 23 })
  const records = [make('fixture-primary', 'primary'), make('fixture-worn', 'worn-preview')]
  const corpus = { records, entries: { [id]: { ...original.entries[id], primaryId: 'fixture-primary', galleryIds: ['fixture-worn'] } }, mappingReport: [], conflicts: [] }
  const downloads = { records: Object.fromEntries(records.map(r => [r.mediaId, downloaded])), remaining: 0, stopped: null }
  const report = await buildAssets(corpus, downloads, { ...catalogue, items: [item], lookup: [lookup] }, config, {}, { publicRoot: join(root, 'public'), reportPath: join(root, 'report.json'), storagePath: join(root, 'storage.json') })
  assert.equal(report.normalizedAssetsCreated, 1); assert.equal(report.duplicatesDetected, 1); assert.equal(report.primaryAssetsMapped, 1)
  const index = parseAssetIndex(JSON.parse(await readFile(join(config.manifestDir, 'index.json'))), new Set([id]))
  runtimeAsset = index.entries[id].primary
  assert.equal(runtimeAsset.rightsStatus, 'unknown'); assert.equal(runtimeAsset.sourceUrl, record.originalUrl)
  const publicIndex = JSON.parse(await readFile(join(root, 'public/manifests/index.json')))
  assert.equal(publicIndex.entries[id].primary, null)
  const audit = JSON.parse(await readFile(join(config.manifestDir, 'items.json')))
  assert.equal(audit.entries[id].rawSources[0].localSourcePath, downloaded.localSourcePath)
})
test('runtime manifests reject external src, unknown IDs and mixed versions and choose card/detail variants', () => {
  assert.equal(selectItemAsset(runtimeAsset), runtimeAsset.variants.cards.webPath)
  assert.equal(selectItemAsset(runtimeAsset, true), runtimeAsset.variants.detail.webPath)
  assert.equal(selectItemAsset(runtimeAsset, false, runtimeAsset.variants.cards.webPath), null)
  assert.equal(selectItemAsset(null), null)
  assert.equal(controlledAssetPath('https://static.wikia.nocookie.net/x.png'), false)
  const broken = structuredClone(runtimeAsset); broken.variants.cards.webPath = source.originalUrl
  assert.equal(selectItemAsset(broken), null)
  assert.throws(() => parseAssetIndex({ schemaVersion: 1, version: '1'.repeat(16), entries: { wrong: { primary: runtimeAsset } } }, new Set(['id'])))
  assert.throws(() => parseAssetShard({ schemaVersion: 1, version: '1'.repeat(16), entries: {} }, new Set(), '2'.repeat(16)))
})
test('dev HTTP adapter serves decodable E: assets and manifests and rejects unsafe paths/methods without browser automation', async () => {
  const server = await createServer({ configFile: false, plugins: [localItemAssets(config)], logLevel: 'silent', server: { host: '127.0.0.1', port: 0, open: false, hmr: false, watch: null }, appType: 'custom' })
  try {
    await server.listen()
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`
    const indexResponse = await fetch(`${origin}/assets/items/manifests/index.json`)
    assert.equal(indexResponse.status, 200); assert.equal((await indexResponse.json()).schemaVersion, 1)
    const imageResponse = await fetch(`${origin}${runtimeAsset.variants.cards.webPath}`)
    assert.equal(imageResponse.status, 200); assert.equal(imageResponse.headers.get('content-type'), 'image/webp')
    assert.equal((await validateImage(Buffer.from(await imageResponse.arrayBuffer()), 'image/webp')).width, 17)
    assert.equal((await fetch(`${origin}/assets/items/manifests/not-allowed.json`)).status, 404)
    assert.equal((await fetch(`${origin}${runtimeAsset.variants.cards.webPath}`, { method: 'POST' })).status, 405)
    assert.equal((await fetch(`${origin}/assets/items/raw/secrets.json`)).status, 404)
  } finally { await server.close() }
})
test('SSR uses controlled assets, lazy async cards, eager detail and neutral placeholders without primary CategoryGlyph', async () => {
  const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
  try {
    const { ItemThumbnail } = await server.ssrLoadModule('/src/features/items/ItemThumbnail.tsx')
    const { LocaleProvider } = await server.ssrLoadModule('/src/shared/i18n/useLocale.tsx')
    const sample = catalogResult.value.entries[0]
    const render = (entry, detail = false) => renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ItemThumbnail, { entry, detail })))
    const real = render({ ...sample, asset: runtimeAsset, wiki: { primary: { thumbnailUrl: source.originalUrl } } })
    assert.ok(real.includes(runtimeAsset.variants.cards.webPath)); assert.ok(real.includes('loading="lazy"')); assert.ok(real.includes('decoding="async"')); assert.ok(!real.includes('static.wikia'))
    assert.ok(render({ ...sample, asset: runtimeAsset }, true).includes('loading="eager"'))
    const missing = render({ ...sample, asset: null, image: { url: source.originalUrl }, wiki: { primary: { thumbnailUrl: source.originalUrl } } })
    assert.ok(missing.includes('Chưa có hình ảnh')); assert.ok(!missing.includes('<img')); assert.ok(!missing.includes('<svg')); assert.ok(!missing.includes('category-glyph'))
  } finally { await server.close() }
})
test('contextual category/season/spirit filters retain stable IDs through navigation and refresh', () => {
  for (const key of ['season', 'spirit', 'category']) {
    const sample = catalogResult.value.entries.find(e => key === 'category' ? e.category !== 'unknown' : e.item[`${key}Ids`].length)
    const value = key === 'category' ? sample.category : sample.item[`${key}Ids`][0]
    const url = contextualLookupUrl(new URLSearchParams('q=&page=3'), key, value)
    const params = new URL(url, 'https://sky-guide.test').searchParams
    assert.equal(params.get(key), value); assert.equal(params.has('page'), false)
    assert.ok(filterEntries(catalogResult.value.entries, filtersFromParams(params)).some(e => e.id === sample.id))
  }
})

/* global URL */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chunks } from './api.mjs'

const imageMime = /^image\/(png|jpeg|webp|gif|svg\+xml)$/
const kinds = ['primary', 'icon', 'worn-preview', 'alternate-view', 'gallery', 'reference']
const statuses = ['exact', 'high-confidence', 'manual', 'ambiguous', 'unmapped']
const categories = ['hair', 'mask', 'cape', 'outfit', 'head-accessory', 'face-accessory', 'neck-accessory', 'shoes', 'prop', 'instrument', 'music-sheet', 'expression', 'unknown']
const assert = (condition, message) => { if (!condition) throw new Error(message) }
export const bucketOf = id => String(Math.floor(Number(id.replace('tsa-cosmetic-', '')) / 100)).padStart(2, '0')
export function safeUrl(value, host) {
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === host && !url.username && !url.password } catch { return false }
}
export function validateCorpus(corpus, catalogue) {
  const ids = new Set(catalogue.items.map(i => i.id)), media = new Map()
  assert(Object.keys(corpus.entries).length === ids.size, 'Missing catalogue entries')
  for (const record of corpus.records) {
    assert(typeof record.mediaId === 'string' && !media.has(record.mediaId), 'Duplicate or missing media ID')
    assert(record.fileTitle.startsWith('File:') && safeUrl(record.filePageUrl, 'sky-children-of-the-light.fandom.com'), 'Invalid file provenance')
    assert(safeUrl(record.originalUrl, 'static.wikia.nocookie.net') && safeUrl(record.thumbnailUrl, 'static.wikia.nocookie.net'), `Invalid media URL: ${record.fileTitle}`)
    assert(Number.isFinite(record.width) && record.width >= 0 && Number.isFinite(record.height) && record.height >= 0 && typeof record.mime === 'string', 'Invalid media dimensions/type')
    assert(kinds.includes(record.mediaKind) && statuses.includes(record.mappingStatus), 'Invalid media classification')
    assert(record.itemIds.every(id => ids.has(id)) && new Set(record.itemIds).size === record.itemIds.length, 'Invalid item relation')
    assert(record.sourcePage && Number.isSafeInteger(record.sourceRevision), 'Missing source revision')
    assert(record.usageMetadata.permissionStatus === 'unverified' && record.licenseMetadata && record.creditMetadata, 'Missing or overstated permission metadata')
    for (const mapping of record.mappings) assert(mapping.itemIds.every(id => record.itemIds.includes(id)) && kinds.includes(mapping.kind) && mapping.evidence.length, 'Invalid mapping evidence')
    media.set(record.mediaId, record)
  }
  for (const [id, entry] of Object.entries(corpus.entries)) {
    assert(ids.has(id) && (!entry.category || categories.includes(entry.category)), 'Invalid catalogue enrichment')
    const references = [entry.primaryId, ...entry.galleryIds].filter(Boolean)
    assert(new Set(references).size === references.length, 'Duplicate item media')
    for (const ref of references) assert(media.get(ref)?.itemIds.includes(id), `Broken image relation: ${id}/${ref}`)
    if (entry.primaryId) assert(imageMime.test(media.get(entry.primaryId).mime), 'Non-image primary')
    assert(entry.aliases.every(a => typeof a === 'string') && entry.evidence.every(e => Number.isSafeInteger(e.sourceRevision) && safeUrl(e.wikiPageUrl, 'sky-children-of-the-light.fandom.com')), 'Invalid enrichment evidence')
    assert(entry.seasonIds.every(id => catalogue.seasons.some(s => s.id === id)) && entry.spiritIds.every(id => catalogue.spirits.some(s => s.id === id)), 'Invalid enrichment relation')
  }
  return true
}
export function statistics(corpus, discovery, catalogue) {
  const recordsFor = id => corpus.records.filter(m => m.itemIds.includes(id))
  const hasKind = (id, kind) => recordsFor(id).some(m => imageMime.test(m.mime) && m.mappings.some(mapping => mapping.itemIds.includes(id) && mapping.kind === kind))
  const primary = Object.values(corpus.entries).filter(e => e.primaryId).length
  return { schemaVersion: 1, snapshot: discovery.startedAt, catalogueItems: catalogue.items.length,
    wikiPagesScanned: discovery.pages.length, wikiDataModulesScanned: discovery.modules.length, additionalModulesInspected: discovery.inspectedModules?.length ?? 0, wikiItemPagesDiscovered: new Set(Object.values(corpus.entries).flatMap(e => e.evidence.map(v => v.wikiPageUrl))).size,
    itemPageDefinition: 'Canonical source pages linked by mapped item evidence; many Wiki cosmetics share spirit, season or event pages.',
    categoriesScanned: Object.keys(discovery.categories).length, mediaFileTitlesRequested: discovery.requestedFileTitles,
    mediaFilesDiscovered: corpus.records.length, mappedFiles: corpus.records.filter(m => m.itemIds.length).length,
    itemsWithPrimaryImage: primary, itemsWithWornPreview: catalogue.items.filter(i => hasKind(i.id, 'worn-preview')).length,
    itemsWithAlternateViews: catalogue.items.filter(i => hasKind(i.id, 'alternate-view')).length, itemsWithoutImage: catalogue.items.length - primary,
    itemsWithNoMappedMedia: catalogue.items.filter(i => !corpus.records.some(m => m.itemIds.includes(i.id))).length,
    ambiguousMappings: corpus.mappingReport.filter(m => m.status === 'ambiguous').length,
    ambiguousMedia: corpus.records.filter(m => m.mappingStatus === 'ambiguous').length, unmappedMedia: corpus.records.filter(m => m.mappingStatus === 'unmapped').length,
    missingFileTitles: discovery.missing.length, metadataConflicts: corpus.conflicts.length,
    requestFailures: discovery.requestFailures.length, requestRetries: discovery.requestRetries.length,
    byCategory: Object.fromEntries([...new Set(catalogue.lookup.map(l => corpus.entries[l.id].category ?? l.category))].sort().map(category => {
      const rows = catalogue.lookup.filter(l => (corpus.entries[l.id].category ?? l.category) === category)
      return [category, { items: rows.length, primaryImages: rows.filter(l => corpus.entries[l.id].primaryId).length }]
    })),
  }
}
const json = value => `${JSON.stringify(value)}\n`
const hash = value => createHash('sha256').update(json(value)).digest('hex')
async function save(path, value) { await writeFile(path, json(value)) }
export async function publishCorpus(corpus, discovery, catalogue) {
  validateCorpus(corpus, catalogue)
  const version = hash(corpus).slice(0, 16)
  const report = statistics(corpus, discovery, catalogue)
  const audit = 'data/wiki-media', assets = `public/data/wiki-media/${version}`
  await mkdir(audit, { recursive: true }); await mkdir(assets, { recursive: true })
  const files = []
  for (const [i, records] of chunks(corpus.records, 250).entries()) {
    const file = `media-${String(i).padStart(3, '0')}.json`
    await save(`${audit}/${file}`, records); files.push({ file, count: records.length, sha256: hash(records) })
  }
  await save(`${audit}/entries.json`, corpus.entries)
  await save(`${audit}/mappings.json`, corpus.mappingReport)
  await save(`${audit}/conflicts.json`, corpus.conflicts)
  await save(`${audit}/discovery.json`, { snapshot: discovery.startedAt, endpoint: 'https://sky-children-of-the-light.fandom.com/api.php', categories: discovery.categories, pages: discovery.pageSummaries, pageImages: discovery.pageImages, modules: discovery.modules.map(m => ({ title: m.title, revision: m.revision, diagnostics: m.diagnostics })), inspectedModules: discovery.inspectedModules, moduleInventory: discovery.moduleInventory, redirects: discovery.redirects, missingFiles: discovery.missing, requestFailures: discovery.requestFailures, requestRetries: discovery.requestRetries, siteRights: discovery.site.rightsinfo })
  await save(`${audit}/report.json`, report)
  await save(`${audit}/manifest.json`, { schemaVersion: 1, version, files })
  const media = new Map(corpus.records.map(m => [m.mediaId, m]))
  const index = {}, details = {}
  for (const [id, entry] of Object.entries(corpus.entries)) {
    const primary = media.get(entry.primaryId)
    index[id] = { category: entry.category, aliases: entry.aliases, seasonIds: entry.seasonIds, spiritIds: entry.spiritIds, primary: primary ? { mediaId: primary.mediaId, thumbnailUrl: primary.thumbnailUrl, width: primary.thumbnailWidth, height: primary.thumbnailHeight, mediaKind: primary.mappings.find(m => m.itemIds.includes(id))?.kind ?? primary.mediaKind } : null }
    const bucket = bucketOf(id)
    details[bucket] ??= { schemaVersion: 1, version, entries: {}, media: {} }
    details[bucket].entries[id] = entry
    for (const mediaId of [entry.primaryId, ...entry.galleryIds].filter(Boolean)) details[bucket].media[mediaId] = media.get(mediaId)
  }
  await save(`${assets}/index.json`, { schemaVersion: 1, version, entries: index })
  for (const [bucket, data] of Object.entries(details)) await save(`${assets}/items-${bucket}.json`, data)
  // The tiny bundled pointer is published last. Versioned payloads are immutable;
  // cached tabs never combine a new index with an old detail shard.
  await save('src/data/itemLookup/wikiManifest.json', { schemaVersion: 1, version, baseUrl: `/data/wiki-media/${version}`, catalogueItems: catalogue.items.length })
  return report
}
export async function readCorpus() {
  const read = async name => JSON.parse(await readFile(`data/wiki-media/${name}`, 'utf8'))
  const manifest = await read('manifest.json'), records = []
  for (const file of manifest.files) {
    const chunk = await read(file.file)
    assert(chunk.length === file.count && hash(chunk) === file.sha256, `Corrupt media chunk: ${file.file}`)
    records.push(...chunk)
  }
  const corpus = { records, entries: await read('entries.json'), mappingReport: await read('mappings.json'), conflicts: await read('conflicts.json') }
  assert(hash(corpus).slice(0, 16) === manifest.version, 'Corpus checksum mismatch')
  return corpus
}

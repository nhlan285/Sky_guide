/* global console */
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { bucketOf, validateCorpus } from '../wiki/output.mjs'
import { mapLimit } from '../wiki/api.mjs'
import { rankMedia } from '../wiki/map.mjs'
import { optimizeImage } from './images.mjs'
import { directoryStats } from './config.mjs'
import { saveJson, sha256, writeIfChanged } from './io.mjs'

export function rightsFor(record, overrides) {
  const manual = overrides.rights?.[record.mediaId]
  if (manual) {
    if (!['verified', 'restricted', 'unknown'].includes(manual.status) || !manual.reason || manual.status === 'verified' && (!/^https:\/\//.test(manual.evidenceUrl ?? '') || !manual.reviewedAt || !manual.credit || !manual.license)) throw new Error(`Invalid rights override: ${record.mediaId}`)
    return { status: manual.status, evidence: manual }
  }
  const restrictions = Object.entries(record.licenseMetadata).filter(([key]) => /restriction/i.test(key)).map(([, value]) => value.value).filter(Boolean)
  return { status: restrictions.some(v => /all rights reserved|no reuse|not permitted|non.?free/i.test(v)) ? 'restricted' : 'unknown', evidence: null }
}
export function chooseLocalPrimary(records, itemId, overrides = {}) {
  const manual = overrides.assets?.[itemId]
  if (manual) {
    const image = records.find(r => r.mediaId === manual.primaryId)
    if (!manual.reason || !image || !image.itemIds.includes(itemId)) throw new Error(`Invalid primary override: ${itemId}`)
    return image
  }
  return records.filter(r => r.itemIds.length === 1).sort((a, b) => {
    const rank = r => {
      const clean = ['primary', 'icon', 'reference'].includes(r.mediaKind)
      return (/isolated|cutout|render/i.test(r.fileTitle) && clean ? 500 : clean && r.hasAlpha ? 400 : r.mediaKind === 'icon' ? 300 : r.mediaKind === 'primary' ? 250 : r.mediaKind === 'reference' ? 200 : r.mediaKind === 'worn-preview' ? 100 : 50) + rankMedia(r) / 1000
    }
    return rank(b) - rank(a) || a.mediaId.localeCompare(b.mediaId)
  })[0] ?? null
}
const kind = value => value === 'alternate-view' ? 'alternate' : value === 'worn-preview' ? value : 'reference'
export async function buildAssets(corpus, downloads, catalogue, config, overrides, destinations = {}) {
  validateCorpus(corpus, catalogue)
  const normalized = new Map(), available = [], failures = []
  let completed = 0
  const results = await mapLimit(corpus.records, Math.min(4, config.concurrency), async record => {
    const download = downloads.records[record.mediaId]
    if (download?.status !== 'complete') return null
    try {
      if (!normalized.has(download.hash)) normalized.set(download.hash, optimizeImage(download, config))
      const variants = (await normalized.get(download.hash)).variants
      if (++completed % 250 === 0) console.log(`Optimized ${completed} validated source records`)
      return { ...download, ...record, width: download.width, height: download.height, hasAlpha: download.hasAlpha, variants, rights: rightsFor(record, overrides) }
    } catch (e) { failures.push({ url: record.originalUrl, page: record.sourcePage, itemIds: record.itemIds, error: e.message, timestamp: new Date().toISOString() }); return null }
  })
  available.push(...results.filter(Boolean))
  if (failures.length) await saveJson(join(config.failedDir, 'processing.json'), failures)
  if (failures.length) throw new Error(`${failures.length} processing failures; previous manifests preserved. See failed/processing.json`)
  const items = {}, audit = {}, index = {}, details = {}
  for (const item of catalogue.items) {
    const images = available.filter(r => r.itemIds.includes(item.id) && !['ambiguous', 'unmapped'].includes(r.mappingStatus)).map(r => ({ ...r, mediaKind: r.mappings.find(m => m.itemIds.includes(item.id))?.kind ?? r.mediaKind }))
    const primary = chooseLocalPrimary(images, item.id, overrides)
    const makeRecord = (r, isPrimary = false) => ({ mediaId: r.mediaId, sourceUrl: r.originalUrl, filePageUrl: r.filePageUrl, sourcePageUrl: r.wikiPageUrl ?? r.filePageUrl, sourceFilename: r.fileTitle, sourceRevision: r.sourceRevision, crawlTimestamp: r.downloadedAt, uploader: r.uploader, hash: r.hash, width: r.width, height: r.height, hasAlpha: r.hasAlpha, kind: isPrimary ? 'primary' : kind(r.mediaKind), credit: r.rights.evidence?.credit ?? r.uploader ?? null, creditMetadata: r.creditMetadata, licenseMetadata: r.licenseMetadata, rightsStatus: r.rights.status, rightsEvidence: r.rights.evidence, publishingEligible: r.rights.status === 'verified', mappingStatus: r.mappingStatus, variants: r.variants, webPath: r.variants.cards.webPath })
    const gallery = images.filter(r => r !== primary).sort((a, b) => rankMedia(b) - rankMedia(a) || a.mediaId.localeCompare(b.mediaId))
    items[item.id] = { itemId: item.id, primary: primary ? makeRecord(primary, true) : null, gallery: gallery.map(r => makeRecord(r)), sourcePages: [...new Set(images.map(r => r.wikiPageUrl ?? r.filePageUrl))].sort(), updatedAt: images.map(r => r.downloadedAt).sort().at(-1) ?? null }
    audit[item.id] = { ...items[item.id], rawSources: images.map(r => ({ mediaId: r.mediaId, localSourcePath: r.localSourcePath })) }
    index[item.id] = { primary: items[item.id].primary }
    const bucket = bucketOf(item.id); details[bucket] ??= {}; details[bucket][item.id] = items[item.id]
  }
  const version = sha256(JSON.stringify(items)).slice(0, 16)
  const envelope = entries => ({ schemaVersion: 1, version, entries })
  await saveJson(join(config.manifestDir, 'index.json'), envelope(index))
  for (const [bucket, entries] of Object.entries(details)) await saveJson(join(config.manifestDir, `items-${bucket}.json`), envelope(entries))
  await saveJson(join(config.manifestDir, 'items.json'), envelope(audit))
  await saveJson(destinations.storagePath ?? 'src/data/itemLookup/assetStorage.json', { schemaVersion: 1, baseUrl: config.publicBase })
  await saveJson(join(config.metadataDir, 'mappings', 'source-to-hash.json'), available.map(r => ({ mediaId: r.mediaId, sourceUrl: r.originalUrl, hash: r.hash, itemIds: r.itemIds, mappingStatus: r.mappingStatus, rightsStatus: r.rights.status, localSourcePath: r.localSourcePath, normalized: r.variants })))
  const raw = await directoryStats(config.rawDir), processed = await directoryStats(config.processedDir)
  // Local preview is allowed by this task. Public export only includes reviewed
  // media. Discovery/unknown-rights records remain in E: and the audit manifest.
  const publishable = new Map()
  const publicItems = Object.fromEntries(Object.entries(items).map(([id, entry]) => {
    const images = [entry.primary, ...entry.gallery].filter(r => r?.publishingEligible)
    for (const image of images) for (const v of Object.values(image.variants)) publishable.set(v.relativePath, v)
    return [id, { ...entry, primary: entry.primary?.publishingEligible ? entry.primary : null, gallery: entry.gallery.filter(r => r.publishingEligible) }]
  }))
  const selectedBytes = [...publishable.values()].reduce((sum, v) => sum + v.bytes, 0)
  const localStorage = config.publicBase === '/assets/items'
  const copyAllowed = localStorage && selectedBytes <= config.gitLimit
  const publicRoot = destinations.publicRoot ?? 'public/assets/items'
  if (copyAllowed) for (const [relativePath] of publishable) await writeIfChanged(join(publicRoot, relativePath), await readFile(join(config.processedDir, relativePath)))
  const published = !localStorage || copyAllowed ? publicItems : Object.fromEntries(Object.entries(publicItems).map(([id, e]) => [id, { ...e, primary: null, gallery: [] }]))
  await saveJson(join(publicRoot, 'manifests', 'index.json'), envelope(Object.fromEntries(Object.entries(published).map(([id, e]) => [id, { primary: e.primary }]))))
  for (const bucket of Object.keys(details)) await saveJson(join(publicRoot, 'manifests', `items-${bucket}.json`), envelope(Object.fromEntries(Object.entries(published).filter(([id]) => bucketOf(id) === bucket))))
  const report = { catalogueItems: catalogue.items.length, sourcePagesDiscovered: null, mediaCandidates: corpus.records.length, rasterCandidates: corpus.records.filter(r => /^image\/(png|jpeg|webp|gif)$/i.test(r.mime)).length, downloadsAttempted: Object.values(downloads.records).filter(r => r.attempts > 0).length, downloadsSucceeded: available.length, downloadsFailed: Object.values(downloads.records).filter(r => r.status === 'failed').length, unsupportedMediaExcluded: Object.values(downloads.records).filter(r => r.status === 'unsupported').length, remainingDownloads: downloads.remaining, duplicatesDetected: available.length - normalized.size, normalizedAssetsCreated: normalized.size, variantFiles: processed.files, primaryAssetsMapped: Object.values(items).filter(e => e.primary).length, itemsWithGallery: Object.values(items).filter(e => e.gallery.length).length, itemsWithWornPreview: Object.values(items).filter(e => e.gallery.some(r => r.kind === 'worn-preview')).length, wornPreviewsMapped: Object.values(items).flatMap(e => e.gallery).filter(r => r.kind === 'worn-preview').length, alternateImagesMapped: Object.values(items).flatMap(e => e.gallery).filter(r => r.kind === 'alternate').length, ambiguousMappings: corpus.mappingReport.filter(r => r.status === 'ambiguous').length, ambiguousMedia: corpus.records.filter(r => r.mappingStatus === 'ambiguous').length, unmappedFiles: corpus.records.filter(r => r.mappingStatus === 'unmapped').length, itemsWithoutRealImage: Object.values(items).filter(e => !e.primary).length, raw, processed, selectedGitAssets: { count: publishable.size, bytes: selectedBytes, averageBytes: publishable.size ? Math.round(selectedBytes / publishable.size) : 0, largest: [...publishable.values()].sort((a, b) => b.bytes - a.bytes).slice(0, 10), limit: config.gitLimit, copied: copyAllowed }, objectStorageRecommended: processed.bytes > config.gitLimit, processingFailures: failures.length, rights: { verified: available.filter(r => r.rights.status === 'verified').length, unknown: available.filter(r => r.rights.status === 'unknown').length, restricted: available.filter(r => r.rights.status === 'restricted').length }, stopped: downloads.stopped }
  await saveJson(join(config.reportDir, 'assets.json'), report)
  await saveJson(destinations.reportPath ?? 'data/wiki-assets/reports/assets.json', report)
  return report
}

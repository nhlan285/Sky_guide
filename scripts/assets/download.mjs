/* global fetch, AbortSignal, setTimeout, console, URL */
import { readFile, statfs, appendFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import { join } from 'node:path'
import { mapLimit } from '../wiki/api.mjs'
import { assertCapacity, directoryStats } from './config.mjs'
import { readJson, saveJson, sha256, writeIfChanged } from './io.mjs'
import { validateImage } from './images.mjs'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const maxBytes = 40 * 1024 ** 2
function cachedPath(previous, config) {
  if (!/^[a-f0-9]{64}$/.test(previous.hash) || !['png', 'jpeg', 'webp', 'gif'].includes(previous.format) || previous.localSourcePath !== join(config.imageDir, `${previous.hash}.${previous.format}`)) throw new Error('Unsafe raw cache reference')
  return previous.localSourcePath
}
async function resolveFailure(record, config) {
  const path = join(config.failedDir, `${sha256(record.sourceUrl)}.json`)
  const failure = await readJson(path, null)
  if (failure?.status === 'failed') await saveJson(path, { ...failure, status: 'resolved', resolvedAt: new Date().toISOString(), hash: record.hash })
}
export function downloadUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.hostname !== 'static.wikia.nocookie.net' || url.username || url.password) throw new Error('Unsafe source URL')
  return url.href
}
export async function downloadOne(record, config, reserve, release, fetcher = fetch) {
  const key = sha256(record.originalUrl), metadataPath = join(config.metadataDir, 'files', `${key}.json`)
  if (!/^image\/(png|jpeg|webp|gif)$/i.test(record.mime)) {
    const failure = { status: 'unsupported', url: record.originalUrl, filePageUrl: record.filePageUrl, page: record.sourcePage, itemIds: record.itemIds, error: `Discovered non-raster media retained in corpus: ${record.mime}`, httpStatus: null, attempts: 0, retryCount: 0, timestamp: new Date().toISOString() }
    await saveJson(join(config.failedDir, `${key}.json`), failure)
    return failure
  }
  const previous = await readJson(metadataPath, null)
  if (previous?.status === 'failed' && previous.permanent && !config.retryPermanent && previous.sourceRevision === record.sourceRevision && previous.fileTimestamp === record.timestamp) return { ...previous, cached: true }
  if (previous?.status === 'complete' && previous.sourceRevision === record.sourceRevision && previous.fileTimestamp === record.timestamp) {
    try { const bytes = await readFile(cachedPath(previous, config)); if (sha256(bytes) === previous.hash) { await resolveFailure(previous, config); return { ...previous, cached: true } } } catch { /* A missing/corrupt cache reference is repaired from the public source. */ }
  }
  let attempts, httpStatus = null, lastError
  const reservation = maxBytes
  let held = true
  await reserve(reservation, record)
  try {
    for (attempts = 1; attempts <= 4; attempts++) {
      try {
        let url
        try { url = downloadUrl(record.originalUrl) } catch (error) { error.permanent = true; throw error }
        const response = await fetcher(url, { headers: { 'User-Agent': 'SkyGuideAssetCrawler/1.0 (https://github.com/nhlan285/Sky_guide)', Accept: 'image/webp,image/png,image/jpeg,image/gif', ...(previous?.etag ? { 'If-None-Match': previous.etag } : {}), ...(previous?.lastModified ? { 'If-Modified-Since': previous.lastModified } : {}) }, signal: AbortSignal.timeout(30000) })
        httpStatus = response.status
        if (response.status === 304 && previous?.status === 'complete') {
          const bytes = await readFile(cachedPath(previous, config))
          if (sha256(bytes) !== previous.hash) throw new Error('Cached hash mismatch on 304')
          const current = { ...previous, sourceRevision: record.sourceRevision, fileTimestamp: record.timestamp, cached: true }
          await saveJson(metadataPath, current); await resolveFailure(current, config); return current
        }
        if (!response.ok) throw Object.assign(new Error(`HTTP ${response.status}`), { permanent: [400, 401, 403, 404, 410].includes(response.status), retryAfter: Math.min(30000, Number(response.headers.get('retry-after') || 0) * 1000) })
        if (response.url) downloadUrl(response.url)
        if (Number(response.headers.get('content-length')) > maxBytes) throw Object.assign(new Error('IMAGE_TOO_LARGE'), { permanent: true })
        const chunks = []; let size = 0
        for await (const chunk of response.body) { size += chunk.length; if (size > maxBytes) { await response.body.cancel().catch(() => {}); throw Object.assign(new Error('IMAGE_TOO_LARGE'), { permanent: true }) }; chunks.push(chunk) }
        const bytes = Buffer.concat(chunks), contentType = response.headers.get('content-type')
        let image
        try { image = await validateImage(bytes, contentType) } catch (e) { e.permanent = true; throw e }
        const localSourcePath = join(config.imageDir, `${image.hash}.${image.format}`)
        const newFile = await writeIfChanged(localSourcePath, bytes)
        const result = { status: 'complete', sourceUrl: url, filePageUrl: record.filePageUrl, sourcePage: record.sourcePage, sourceFilename: record.fileTitle, sourceRevision: record.sourceRevision, fileRevision: record.fileRevision, fileTimestamp: record.timestamp, uploader: record.uploader, creditMetadata: record.creditMetadata, licenseMetadata: record.licenseMetadata, relatedPages: record.usedOn, downloadedAt: new Date().toISOString(), contentType, etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified'), localSourcePath, attempts, ...image }
        await saveJson(metadataPath, result)
        await resolveFailure(result, config)
        release(reservation, newFile ? bytes.length : 0)
        held = false
        return result
      } catch (e) {
        if (['EACCES', 'EPERM', 'ENOSPC', 'EROFS', 'EMFILE'].includes(e.code)) throw e
        lastError = e; if (e.permanent || attempts === 4) break; await wait(Math.max(e.retryAfter || 0, 1000 * 2 ** (attempts - 1)))
      }
    }
    const failure = { status: 'failed', url: record.originalUrl, sourceRevision: record.sourceRevision, fileTimestamp: record.timestamp, permanent: Boolean(lastError.permanent), filePageUrl: record.filePageUrl, page: record.sourcePage, itemIds: record.itemIds, error: lastError.message, httpStatus, attempts, retryCount: attempts - 1, timestamp: new Date().toISOString() }
    await saveJson(metadataPath, failure)
    await saveJson(join(config.failedDir, `${key}.json`), failure)
    await appendFile(join(config.logDir, 'failures.jsonl'), `${JSON.stringify(failure)}\n`)
    return failure
  } finally { if (held) release(reservation, 0) }
}
export async function downloadAll(records, config) {
  let usage = (await directoryStats(config.rawDir)).bytes, reserved = 0, stopped = null, finished = 0
  const reservations = new Map()
  // A synchronous reservation update after statfs prevents concurrent workers
  // from all spending the same remaining capacity.
  const reserve = async (bytes, record) => {
    const disk = await statfs(config.root), free = Number(disk.bavail) * Number(disk.bsize)
    try { assertCapacity({ usage: usage + reserved, additional: bytes, free: free - reserved, config }) } catch (error) { error.attemptedFile = record.originalUrl; throw error }
    reserved += bytes; reservations.set(bytes, (reservations.get(bytes) ?? 0) + 1)
  }
  const release = (bytes, added) => { if ((reservations.get(bytes) ?? 0) > 0) { reserved -= bytes; reservations.set(bytes, reservations.get(bytes) - 1); usage += added } }
  const result = await mapLimit(records, config.concurrency, async record => {
    if (stopped) return { status: 'pending', url: record.originalUrl }
    try { const download = await downloadOne(record, config, reserve, release); if (++finished % 100 === 0) console.log(`Download ${finished}/${records.length}: ${download.status}`); return download } catch (error) {
      stopped = { status: error.code ?? 'DOWNLOAD_FAILED', usage, limit: config.cacheLimit, attemptedFile: error.attemptedFile ?? record.originalUrl, error: error.message }
      return { status: 'pending', url: record.originalUrl }
    }
  })
  const checkpoint = { completedAt: new Date().toISOString(), stopped, remaining: result.filter(r => r.status === 'pending').length, records: Object.fromEntries(records.map((r, i) => [r.mediaId, result[i]])) }
  await saveJson(join(config.metadataDir, 'files', 'downloads.json'), checkpoint)
  if (stopped) { stopped.remaining = checkpoint.remaining; await saveJson(join(config.reportDir, 'cache-stop.json'), stopped) }
  return checkpoint
}

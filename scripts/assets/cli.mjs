/* global process, console */
import { readFile, statfs, rm, realpath, appendFile } from 'node:fs/promises'
import { join, resolve, win32 } from 'node:path'
import { configuration, preflight, directoryStats, assertCapacity } from './config.mjs'
import { readJson, saveJson, sha256 } from './io.mjs'
import { downloadAll } from './download.mjs'
import { buildAssets } from './manifest.mjs'
import { createClient, mapLimit } from '../wiki/api.mjs'
import { discover } from '../wiki/discover.mjs'
import { loadCatalogue } from '../wiki/source.mjs'
import { normalizeCorpus } from '../wiki/map.mjs'
import { validateCorpus } from '../wiki/output.mjs'

const config = configuration()
const command = process.argv[2]
const snapshotPath = join(config.metadataDir, 'pages', 'discovery.json')
const corpusPath = join(config.metadataDir, 'mappings', 'corpus.json')
const downloadPath = join(config.metadataDir, 'files', 'downloads.json')
const overrides = await readJson('data/wiki-assets/item-overrides.json', {})
const display = value => console.log(JSON.stringify(value, null, 2))
let storageReady = false
try {
  const ready = await preflight(config, undefined, { inspectOnly: ['stats', 'clean-raw'].includes(command) })
  storageReady = true
  display(ready)
  await saveJson(join(config.reportDir, 'preflight.json'), ready)
  await appendFile(join(config.logDir, 'preflight.jsonl'), `${JSON.stringify({ command, timestamp: new Date().toISOString(), ...ready })}\n`)
  if (command === 'preflight') { /* The preflight itself is the operation. */ }
  else if (command === 'discover') {
    const catalogue = await loadCatalogue()
    let snapshot = await readJson(snapshotPath, null)
    const importArg = process.argv.find(arg => arg.startsWith('--import-snapshot='))
    if (importArg) {
      if (snapshot) throw new Error('Snapshot already exists; import is bootstrap only')
      snapshot = await readJson(resolve(importArg.slice('--import-snapshot='.length)))
      if (!snapshot.pages?.length || !snapshot.files?.length || !snapshot.modules?.length || !snapshot.startedAt) throw new Error('Invalid complete discovery snapshot')
      snapshot.importedFrom = importArg.slice('--import-snapshot='.length)
    }
    if (!snapshot || process.argv.includes('--refresh')) {
      const statePath = join(config.metadataDir, 'pages', 'checkpoint.json')
      let state = await readJson(statePath, null)
      if (!state || process.argv.includes('--refresh')) state = { startedAt: new Date().toISOString(), id: new Date().toISOString().replaceAll(/[:.]/g, '-') }
      await saveJson(statePath, state)
      let usage = ready.existingCacheBytes
      const client = createClient(join(config.responseDir, state.id), { beforeStore: async bytes => {
        const disk = await statfs(config.root)
        assertCapacity({ usage, additional: bytes, free: Number(disk.bavail) * Number(disk.bsize), config }); usage += bytes
      } })
      try { snapshot = { ...await discover(client, catalogue), startedAt: state.startedAt, requestRetries: client.retries, requestFailures: client.failures } }
      catch (e) { await saveJson(join(config.failedDir, 'discovery.json'), { error: e.message, status: e.code ?? 'DISCOVERY_FAILED', requests: client.failures, retries: client.retries, timestamp: new Date().toISOString(), checkpoint: state }); throw e }
    }
    const corpus = normalizeCorpus(snapshot, catalogue, overrides)
    validateCorpus(corpus, catalogue)
    await saveJson(snapshotPath, snapshot); await saveJson(corpusPath, corpus)
    const report = { startedAt: snapshot.startedAt, importedFrom: snapshot.importedFrom ?? null, sourcePages: snapshot.pages.length, categories: Object.keys(snapshot.categories).length, mediaCandidates: corpus.records.length, missingFiles: snapshot.missing, failures: snapshot.requestFailures, retries: snapshot.requestRetries }
    await saveJson(join(config.reportDir, 'discovery.json'), report)
    await saveJson('data/wiki-assets/reports/discovery.json', report)
    display(report)
  }
  else if (command === 'download') {
    config.retryPermanent = process.argv.includes('--retry-permanent')
    const corpus = await readJson(corpusPath)
    const result = await downloadAll(corpus.records, config)
    display({ attempted: Object.values(result.records).filter(r => r.attempts > 0).length, successful: Object.values(result.records).filter(r => r.status === 'complete').length, failures: Object.values(result.records).filter(r => r.status === 'failed').length, unsupported: Object.values(result.records).filter(r => r.status === 'unsupported').length, remaining: result.remaining, stopped: result.stopped })
    if (result.stopped) process.exitCode = 1
  }
  else if (command === 'build') {
    const report = await buildAssets(await readJson(corpusPath), await readJson(downloadPath), await loadCatalogue(), config, overrides)
    report.sourcePagesDiscovered = (await readJson(snapshotPath)).pages.length
    await saveJson(join(config.reportDir, 'assets.json'), report); await saveJson('data/wiki-assets/reports/assets.json', report)
    display(report)
    if (report.processingFailures) process.exitCode = 1
  }
  else if (command === 'validate') {
    const corpus = await readJson(corpusPath); validateCorpus(corpus, await loadCatalogue())
    const manifest = await readJson(join(config.manifestDir, 'items.json'))
    let count = 0
    const expected = new Map()
    for (const [id, entry] of Object.entries(manifest.entries)) {
      if (entry.itemId !== id) throw new Error(`Invalid item relation: ${id}`)
      for (const image of [entry.primary, ...entry.gallery].filter(Boolean)) {
        if (!image.sourceUrl || !image.sourcePageUrl || !image.sourceFilename || !image.sourceRevision || !image.crawlTimestamp || !['verified', 'unknown', 'restricted'].includes(image.rightsStatus) || !['exact', 'high-confidence', 'manual'].includes(image.mappingStatus)) throw new Error(`Invalid provenance/mapping: ${id}`)
        for (const v of Object.values(image.variants)) {
          if (!/^(thumbnails|cards|detail)\/[a-f0-9]{64}\.webp$/.test(v.relativePath) || v.webPath !== `${config.publicBase}/${v.relativePath}` || !v.width || !v.height) throw new Error(`Unsafe asset: ${id}`)
          const previous = expected.get(v.relativePath)
          if (previous && (previous.hash !== v.hash || previous.width !== v.width || previous.height !== v.height)) throw new Error('Conflicting variant metadata')
          expected.set(v.relativePath, { ...v, hasAlpha: image.hasAlpha })
        }
        count++
      }
    }
    // Include normalized media that has no confident item assignment. Discovery
    // coverage and mapping eligibility are independent, so validate both sets.
    for (const source of await readJson(join(config.metadataDir, 'mappings', 'source-to-hash.json'))) {
      for (const variant of Object.values(source.normalized)) {
        if (!/^(thumbnails|cards|detail)\/[a-f0-9]{64}\.webp$/.test(variant.relativePath) || variant.webPath !== `${config.publicBase}/${variant.relativePath}`) throw new Error('Unsafe unmapped variant')
        if (!expected.has(variant.relativePath)) expected.set(variant.relativePath, { ...variant, hasAlpha: false })
      }
    }
    const { validateImage } = await import('./images.mjs')
    await mapLimit([...expected.values()], Math.min(4, config.concurrency), async v => {
      const bytes = await readFile(join(config.processedDir, v.relativePath))
      if (sha256(bytes) !== v.hash) throw new Error(`Asset hash mismatch: ${v.relativePath}`)
      const decoded = await validateImage(bytes, 'image/webp')
      if (decoded.width !== v.width || decoded.height !== v.height || v.hasAlpha && !decoded.hasAlpha) throw new Error('Invalid dimensions/alpha')
    })
    const result = { status: 'PASS', itemEntries: Object.keys(manifest.entries).length, assetReferences: count, variantFilesValidated: expected.size }
    await saveJson(join(config.reportDir, 'validation.json'), result); display(result)
  }
  else if (command === 'stats') {
    display({ ...await readJson(join(config.reportDir, 'assets.json'), {}), assetRoot: config.root, freeBytes: ready.freeBytes, cacheLimitBytes: config.cacheLimit, raw: await directoryStats(config.rawDir), processed: await directoryStats(config.processedDir) })
  }
  else if (command === 'clean-raw') {
    if (!process.argv.includes('--confirm-delete-raw')) throw new Error('Destructive cleanup requires --confirm-delete-raw. Only raw/ is deleted.')
    const expected = win32.join(config.root, 'raw')
    if (win32.normalize(await realpath(config.rawDir)).toLowerCase() !== expected.toLowerCase() || expected.toLowerCase() === config.root.toLowerCase()) throw new Error('Unsafe raw cleanup target')
    await directoryStats(config.rawDir) // Reject descendant symlinks before recursion.
    await rm(config.rawDir, { recursive: true }); display({ deleted: config.rawDir, preserved: ['processed', 'manifests', 'metadata', 'reports'] })
  }
  else throw new Error(`Unknown asset command: ${command}`)
  await appendFile(join(config.logDir, 'commands.jsonl'), `${JSON.stringify({ command, timestamp: new Date().toISOString(), exitCode: process.exitCode ?? 0 })}\n`)
} catch (error) {
  if (storageReady) await saveJson(join(config.failedDir, `command-${command}.json`), { command, error: error.message, timestamp: new Date().toISOString() })
  console.error(`Asset pipeline stopped: ${error.message}. No fallback storage is used.`); process.exitCode = 1
}

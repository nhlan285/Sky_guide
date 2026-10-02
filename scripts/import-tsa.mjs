import { readFile, mkdir, writeFile, rename } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { Buffer } from 'node:buffer'
import { fetchSources } from './tsa/fetch.mjs'
import { normalizeSources } from './tsa/normalize.mjs'
import { catalogVersion, generatedAt, normalizationVersion, repository, revision } from './tsa/source.mjs'

// Stage, validate, then publish a complete immutable release. Failures leave the previous release untouched.
const root = resolve(import.meta.dirname, '..')
const target = join(root, 'data/public', catalogVersion)
const stage = join(root, '.catalogue-stage', catalogVersion)
const { sources, paths } = await fetchSources()
const normalized = normalizeSources(sources, revision)
await mkdir(stage, { recursive: true })
const manifest = { schemaVersion: 1, catalogVersion, generatedAt, datasets: {}, provenance: null, aliases: null, tombstones: null, assetManifestVersion: null,
  source: { repository, revision, normalizationVersion, sourcePaths: paths, transport: 'public-repository', status: 'pinned-snapshot' }, importReport: normalized.report }
const files = new Map()
for (const key of ['items', 'lookup', 'spirits', 'seasons', 'provenance']) {
  const bytes = JSON.stringify({ schemaVersion: 1, dataVersion: catalogVersion, generatedAt, sourceIds: ['K15'], records: normalized[key], fixture: false }) + '\n'
  const entry = { path: `${key}.json`, dataVersion: catalogVersion, sha256: createHash('sha256').update(bytes).digest('hex') }
  if (key === 'provenance') manifest.provenance = entry
  else manifest.datasets[key] = entry
  files.set(entry.path, bytes)
}
files.set('manifest.json', JSON.stringify(manifest, null, 2) + '\n')
for (const [path, bytes] of files) await writeFile(join(stage, path), bytes)
let existing
try { existing = await readFile(join(target, 'manifest.json'), 'utf8') } catch { /* First publication. */ }
if (existing) {
  for (const [path, bytes] of files) {
    if (await readFile(join(target, path), 'utf8') !== bytes) throw new Error('Immutable release differs: bump normalization/catalogue version before publishing changes.')
  }
} else {
  await mkdir(join(root, 'data/public'), { recursive: true })
  await rename(stage, target)
}
await mkdir(join(root, 'public/licenses'), { recursive: true })
await writeFile(join(root, 'public/licenses/thatskyapplication-utility.txt'), `ThatSkyApplication packages/utility\nUpstream: https://github.com/${repository}\nRevision: ${revision}\nAdapted structured definitions and English labels; no upstream media.\n\n${sources.get('packages/utility/LICENSE')}`)
process.stdout.write(JSON.stringify({ ...normalized.report, seasons: normalized.seasons.length, spirits: normalized.spirits.length, catalogVersion, bytes: [...files.values()].reduce((sum, bytes) => sum + Buffer.byteLength(bytes), 0) }, null, 2) + '\n')

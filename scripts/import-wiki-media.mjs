/* global process, console */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createClient } from './wiki/api.mjs'
import { discover } from './wiki/discover.mjs'
import { loadCatalogue } from './wiki/source.mjs'
import { normalizeCorpus } from './wiki/map.mjs'
import { publishCorpus } from './wiki/output.mjs'

const root = resolve('.cache/wiki-media')
await mkdir(root, { recursive: true })
let snapshot
try { snapshot = JSON.parse(await readFile(`${root}/current.json`, 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
if (!snapshot || process.argv.includes('--refresh')) {
  snapshot = { startedAt: new Date().toISOString(), id: new Date().toISOString().replaceAll(/[:.]/g, '-') }
  await writeFile(`${root}/current.json`, JSON.stringify(snapshot))
}
const client = createClient(`${root}/${snapshot.id}`)
try {
  const catalogue = await loadCatalogue()
  const result = await discover(client, catalogue)
  const discovery = { ...result, startedAt: snapshot.startedAt, requestRetries: client.retries, requestFailures: client.failures }
  await writeFile(`${root}/discovery.json`, JSON.stringify(discovery))
  console.log(`Discovery complete: ${result.pages.length} pages, ${result.files.length} files. ${JSON.stringify(client.stats())}`)
  const overrides = JSON.parse(await readFile('scripts/wiki/overrides.json', 'utf8'))
  const corpus = normalizeCorpus(discovery, catalogue, overrides)
  console.log(JSON.stringify(await publishCorpus(corpus, discovery, catalogue), null, 2))
} catch (error) {
  await mkdir('data/quarantine/wiki-media', { recursive: true })
  await writeFile('data/quarantine/wiki-media/failures.json', JSON.stringify({ snapshot, error: error.message, requestFailures: client.failures, retries: client.retries }, null, 2))
  console.error(error)
  process.exitCode = 1
}

import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { repository, revision } from './source.mjs'

export const cache = join(tmpdir(), `sky-guide-tsa-${revision.slice(0, 7)}`)
const basePaths = ['cosmetics.ts', 'locales/en-gb.ts', 'season.ts', 'utility/spirits.ts', 'utility/functions.ts', 'models/season.ts', 'models/spirits.ts', 'catalogue.ts'].map(p => `packages/utility/source/${p}`)
const hashBlob = bytes => createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
async function get(url) {
  const response = await globalThis.fetch(url, { signal: globalThis.AbortSignal.timeout(30000), headers: { 'User-Agent': 'Sky-Guide-public-catalogue-import' } })
  if (!response.ok) throw new Error(`Upstream HTTP ${response.status}: ${url}`)
  return Buffer.from(await response.arrayBuffer())
}
export async function fetchSources() {
  await mkdir(cache, { recursive: true })
  const treeFile = join(cache, 'tree.json')
  let tree
  try { tree = JSON.parse(await readFile(treeFile, 'utf8')) } catch {
    tree = JSON.parse((await get(`https://api.github.com/repos/${repository}/git/trees/${revision}?recursive=1`)).toString())
    await writeFile(treeFile, JSON.stringify(tree))
  }
  if (tree.sha !== revision || tree.truncated || !Array.isArray(tree.tree)) throw new Error('Invalid pinned public source tree')
  const paths = tree.tree.filter(x => x.type === 'blob' && (basePaths.includes(x.path) || x.path === 'packages/utility/LICENSE' ||
    /^packages\/utility\/source\/kingdom\/seasons\/.+\.ts$/.test(x.path) ||
    /^packages\/utility\/source\/kingdom\/realms\/[^/]+\/spirits\/[^/]+\.ts$/.test(x.path)))
    .sort((a, b) => a.path.localeCompare(b.path, 'en'))
  if (paths.length < 200 || !basePaths.every(p => paths.some(x => x.path === p))) throw new Error('Incomplete source selection')
  const sources = new Map()
  let next = 0
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < paths.length) {
      const entry = paths[next++]
      const file = join(cache, entry.path.replaceAll('/', '_'))
      let bytes
      try { bytes = await readFile(file) } catch { /* Cache miss. */ }
      if (!bytes || hashBlob(bytes) !== entry.sha) {
        bytes = await get(`https://raw.githubusercontent.com/${repository}/${revision}/${entry.path}`)
        if (hashBlob(bytes) !== entry.sha) throw new Error(`Source checksum mismatch: ${entry.path}`)
        await writeFile(file, bytes)
      }
      sources.set(entry.path, bytes.toString('utf8'))
    }
  }))
  return { sources, paths: paths.map(({ path, sha }) => ({ path, gitBlobSha: sha })) }
}

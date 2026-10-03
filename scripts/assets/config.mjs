/* global process, URL */
import { win32, join } from 'node:path'
import { loadEnvFile } from 'node:process'
import { mkdir, readdir, stat, statfs, writeFile, unlink, realpath } from 'node:fs/promises'

export const GiB = 1024 ** 3
try { loadEnvFile() } catch (e) { if (e.code !== 'ENOENT') throw e }
export function configuration(env = process.env) {
  const root = win32.normalize(env.SKY_ASSET_ROOT || 'E:\\SkyGuideAssets')
  if (!/^E:\\/i.test(root) || root === 'E:\\' || root.startsWith('\\\\') || /(?:^|\\)(?:\.cache|\.vscode|node_modules|Users|AppData|Temp)(?:\\|$)/i.test(root)) throw new Error('ASSET_ROOT_INVALID: asset storage must be a dedicated absolute E: directory; no fallback is allowed')
  const number = (key, fallback) => { const n = Number(env[key] ?? fallback); if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid ${key}`); return n }
  const publicBase = (env.SKY_ASSET_PUBLIC_BASE_URL || '/assets/items').replace(/\/$/, '')
  if (publicBase !== '/assets/items') {
    const url = new URL(publicBase)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || /(?:^|\.)(fandom\.com|wikia\.nocookie\.net|nocookie\.net)$/i.test(url.hostname)) throw new Error('Invalid owned asset storage base')
  }
  const concurrency = number('SKY_ASSET_CONCURRENCY', 4)
  if (!Number.isInteger(concurrency) || concurrency > 8) throw new Error('SKY_ASSET_CONCURRENCY must be an integer between 1 and 8')
  return { root, publicBase, rawDir: join(root, 'raw'), imageDir: join(root, 'raw', 'images'), responseDir: join(root, 'raw', 'responses'), metadataDir: join(root, 'metadata'), processedDir: join(root, 'processed'), manifestDir: join(root, 'manifests'), reportDir: join(root, 'reports'), failedDir: join(root, 'failed'), logDir: join(root, 'logs'), cacheLimit: number('SKY_ASSET_CACHE_LIMIT_GB', 15) * GiB, minFree: number('SKY_ASSET_MIN_FREE_GB', 20) * GiB, concurrency, gitLimit: number('SKY_ASSET_GIT_LIMIT_MB', 64) * 1024 ** 2 }
}
export async function directoryStats(dir) {
  let files = 0, bytes = 0, largest = []
  async function scan(path) {
    let entries
    try { entries = await readdir(path, { withFileTypes: true }) } catch (e) { if (e.code === 'ENOENT') return; throw e }
    for (const entry of entries) {
      const file = join(path, entry.name)
      if (entry.isSymbolicLink()) throw new Error(`Unsafe symlink in asset store: ${file}`)
      if (entry.isDirectory()) await scan(file)
      else { const size = (await stat(file)).size; files++; bytes += size; largest.push({ path: file, bytes: size }); largest.sort((a, b) => b.bytes - a.bytes); largest = largest.slice(0, 10) }
    }
  }
  await scan(dir)
  return { files, bytes, averageBytes: files ? Math.round(bytes / files) : 0, largest }
}
export function assertCapacity({ usage, additional, free, config }) {
  if (usage + additional > config.cacheLimit) throw Object.assign(new Error('CACHE_LIMIT_REACHED'), { code: 'CACHE_LIMIT_REACHED', usage, limit: config.cacheLimit })
  if (free - additional < config.minFree) throw Object.assign(new Error('MINIMUM_FREE_SPACE_REACHED'), { code: 'MINIMUM_FREE_SPACE_REACHED', free, minimum: config.minFree })
}
export async function preflight(config, io = { mkdir, statfs, writeFile, unlink, realpath, directoryStats }, options = {}) {
  const drive = await io.statfs('E:\\') // Fail here if E: does not exist. Never use cwd/TEMP.
  const free = Number(drive.bavail) * Number(drive.bsize)
  const cache = await io.directoryStats(config.rawDir)
  if (!options.inspectOnly) assertCapacity({ usage: cache.bytes, additional: 0, free, config })
  const dirs = ['raw/images', 'raw/responses', 'metadata/pages', 'metadata/files', 'metadata/mappings', 'processed/thumbnails', 'processed/cards', 'processed/detail', 'manifests', 'reports', 'failed', 'logs']
  await io.mkdir(config.root, { recursive: true })
  if (win32.normalize(await io.realpath(config.root)).toLowerCase() !== config.root.toLowerCase()) throw new Error('ASSET_ROOT_INVALID: junction or symlink root rejected')
  for (const dir of dirs) {
    const path = join(config.root, dir)
    await io.mkdir(path, { recursive: true })
    if (win32.normalize(await io.realpath(path)).toLowerCase() !== win32.normalize(path).toLowerCase()) throw new Error(`Unsafe symlink/junction directory: ${path}`)
  }
  const probe = join(config.root, '.write-probe')
  await io.writeFile(probe, 'preflight'); await io.unlink(probe)
  return { assetRoot: config.root, drive: 'E:', freeBytes: free, existingCacheBytes: cache.bytes, cacheLimitBytes: config.cacheLimit, minimumFreeBytes: config.minFree, status: options.inspectOnly ? 'INSPECT_OR_CLEANUP_ONLY' : 'READY' }
}

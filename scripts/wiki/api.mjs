/* global setTimeout, URLSearchParams, fetch, AbortSignal, console */
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { join } from 'node:path'

export const endpoint = 'https://sky-children-of-the-light.fandom.com/api.php'
export const wikiUrl = title => `https://sky-children-of-the-light.fandom.com/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}`
export const titleKey = title => title.replaceAll('_', ' ').trim()
export const pagesOf = response => Array.isArray(response.query?.pages) ? response.query.pages : Object.values(response.query?.pages ?? {})
export const chunks = (values, size) => Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, (i + 1) * size))
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
export async function mapLimit(values, limit, fn) {
  let cursor = 0
  const result = new Array(values.length)
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) { const i = cursor++; result[i] = await fn(values[i], i) }
  }))
  return result
}
export async function paginate(request, params) {
  const responses = [], seen = new Set()
  let continuation = {}
  do {
    const response = await request({ ...params, ...continuation })
    responses.push(response)
    continuation = response.continue
    if (continuation) {
      const key = JSON.stringify(continuation)
      if (seen.has(key)) throw new Error('Repeated MediaWiki continuation token')
      seen.add(key)
    }
  } while (continuation)
  return responses
}
export function canonicalTitle(title, responses) {
  const redirects = new Map(responses.flatMap(r => [...(r.query?.normalized ?? []), ...(r.query?.redirects ?? [])]).map(r => [titleKey(r.from), titleKey(r.to)]).filter(([from, to]) => from !== to))
  let current = titleKey(title)
  const seen = new Set()
  while (redirects.has(current)) {
    if (seen.has(current)) throw new Error(`Redirect cycle: ${title}`)
    seen.add(current); current = redirects.get(current)
  }
  return current
}
export function createClient(cacheDir) {
  let nextRequest = 0, count = 0, cached = 0
  const failures = [], retries = []
  async function request(params) {
    const query = new URLSearchParams(Object.entries({ action: 'query', format: 'json', formatversion: '2', ...params }).sort(([a], [b]) => a.localeCompare(b)))
    const url = `${endpoint}?${query}`
    const path = join(cacheDir, `${createHash('sha256').update(url).digest('hex')}.json`)
    try { const stored = JSON.parse(await readFile(path, 'utf8')); cached++; return stored } catch (error) { if (error.code !== 'ENOENT') throw error }
    await mkdir(cacheDir, { recursive: true })
    for (let attempt = 0; attempt < 4; attempt++) {
      const start = Math.max(Date.now(), nextRequest); nextRequest = start + 250
      await sleep(Math.max(0, start - Date.now()))
      try {
        count++
        const response = await fetch(url, { headers: { 'User-Agent': 'SkyGuideMediaImporter/1.0 (https://github.com/nhlan285/Sky_guide)' }, signal: AbortSignal.timeout(45000) })
        if (!response.ok) {
          const error = new Error(`HTTP ${response.status}`)
          error.retryAfter = Number(response.headers.get('retry-after')) * 1000
          throw error
        }
        const json = await response.json()
        if (json.error) throw new Error(`${json.error.code}: ${json.error.info}`)
        if (json.warnings) throw new Error(`Unexpected API warning: ${JSON.stringify(json.warnings)}`)
        await writeFile(`${path}.tmp`, JSON.stringify(json)); await rename(`${path}.tmp`, path)
        if (count % 40 === 0) console.log(`API: ${count} network requests, ${cached} cached`)
        return json
      } catch (error) {
        const failure = { url, attempt: attempt + 1, message: error.message }
        if (attempt === 3) { failures.push(failure); throw error }
        retries.push(failure)
        await sleep(Math.min(60000, Math.max(error.retryAfter || 0, 1000 * 2 ** attempt)))
      }
    }
  }
  return { request, failures, retries, stats: () => ({ network: count, cached }) }
}

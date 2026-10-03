/* global URL */
import { readFile } from 'node:fs/promises'
export async function loadCatalogue() {
  const base = new URL('../../data/public/tsa-v1-74007cf878ef/', import.meta.url)
  const [items, lookup, spirits, seasons] = await Promise.all(['items', 'lookup', 'spirits', 'seasons'].map(async name => JSON.parse(await readFile(new URL(`${name}.json`, base), 'utf8')).records))
  return { items, lookup, spirits, seasons }
}

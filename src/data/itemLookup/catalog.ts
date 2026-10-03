import manifest from '../../../data/public/tsa-v1-74007cf878ef/manifest.json' with { type: 'json' }
import items from '../../../data/public/tsa-v1-74007cf878ef/items.json' with { type: 'json' }
import lookup from '../../../data/public/tsa-v1-74007cf878ef/lookup.json' with { type: 'json' }
import spirits from '../../../data/public/tsa-v1-74007cf878ef/spirits.json' with { type: 'json' }
import seasons from '../../../data/public/tsa-v1-74007cf878ef/seasons.json' with { type: 'json' }
import provenance from '../../../data/public/tsa-v1-74007cf878ef/provenance.json' with { type: 'json' }
import { readCatalog } from './release.ts'
import rawImages from './images.json' with { type: 'json' }
import { validateImageRegistry } from './images.ts'
import rawMedia from './media.json' with { type: 'json' }
import { validateMediaRegistry } from './media.ts'

// Loaded once in the Items route chunk. No upstream request or per-keystroke fetch.
const result = readCatalog(manifest, { items, lookup, spirits, seasons, provenance })
const imageResult = validateImageRegistry(rawImages, new Set(result.valid ? result.value.entries.map(entry => entry.id) : []))
const imagesByItem = new Map(imageResult.valid ? imageResult.value.records.map(record => [record.itemId, record.image]) : [])
const mediaResult = validateMediaRegistry(rawMedia, new Set(result.valid ? result.value.entries.map(entry => entry.id) : []))
const mediaByItem = new Map(mediaResult.valid ? mediaResult.value.records.map(record => [record.itemId, record.images]) : [])
// Curated presentation overlay leaves the immutable factual source release intact.
export const catalogResult = !result.valid ? result : !imageResult.valid ? imageResult : !mediaResult.valid ? mediaResult : {
  valid: true as const,
  value: { ...result.value, entries: result.value.entries.map(entry => ({ ...entry, image: imagesByItem.get(entry.id) ?? entry.image ?? null, images: mediaByItem.get(entry.id) ?? entry.images ?? null })) },
}

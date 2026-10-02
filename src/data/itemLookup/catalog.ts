import manifest from '../../../data/public/tsa-v1-74007cf878ef/manifest.json' with { type: 'json' }
import items from '../../../data/public/tsa-v1-74007cf878ef/items.json' with { type: 'json' }
import lookup from '../../../data/public/tsa-v1-74007cf878ef/lookup.json' with { type: 'json' }
import spirits from '../../../data/public/tsa-v1-74007cf878ef/spirits.json' with { type: 'json' }
import seasons from '../../../data/public/tsa-v1-74007cf878ef/seasons.json' with { type: 'json' }
import provenance from '../../../data/public/tsa-v1-74007cf878ef/provenance.json' with { type: 'json' }
import { readCatalog } from './release.ts'

// Loaded once in the Items route chunk. No upstream request or per-keystroke fetch.
export const catalogResult = readCatalog(manifest, { items, lookup, spirits, seasons, provenance })

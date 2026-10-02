import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import process from 'node:process'
import { URL } from 'node:url'
import { catalogResult } from '../src/data/itemLookup/catalog.ts'
import { catalogVersion } from './tsa/source.mjs'

if (!catalogResult.valid) throw new Error(`Invalid public catalogue: ${JSON.stringify(catalogResult.errors.slice(0, 5))}`)
const root = new URL(`../data/public/${catalogVersion}/`, import.meta.url)
for (const entry of [...Object.values(catalogResult.value.manifest.datasets), catalogResult.value.manifest.provenance]) {
  const bytes = await readFile(new URL(entry.path, root))
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Catalogue checksum mismatch: ${entry.path}`)
}
process.stdout.write(`Validated pinned public catalogue: ${catalogResult.value.entries.length} items\n`)

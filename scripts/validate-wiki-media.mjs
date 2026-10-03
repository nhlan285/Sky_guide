/* global console */
import { readFile } from 'node:fs/promises'
import { loadCatalogue } from './wiki/source.mjs'
import { readCorpus, validateCorpus, bucketOf } from './wiki/output.mjs'
import { parseWikiIndex, parseWikiShard } from '../src/data/itemLookup/wiki.ts'
const catalogue = await loadCatalogue()
const corpus = await readCorpus()
validateCorpus(corpus, catalogue)
const manifest = JSON.parse(await readFile('src/data/itemLookup/wikiManifest.json', 'utf8'))
const read = async name => JSON.parse(await readFile(`public${manifest.baseUrl}/${name}.json`, 'utf8'))
const index = await read('index')
const ids = new Set(catalogue.items.map(i => i.id))
parseWikiIndex(index, manifest.version, ids)
if (index.version !== manifest.version || Object.keys(index.entries).length !== catalogue.items.length) throw new Error('Invalid frontend index')
for (const bucket of new Set(catalogue.items.map(i => bucketOf(i.id)))) {
  const detail = await read(`items-${bucket}`)
  parseWikiShard(detail, manifest.version, ids)
  if (detail.version !== manifest.version) throw new Error('Mixed snapshot versions')
  for (const [id, entry] of Object.entries(detail.entries)) {
    if (JSON.stringify(entry) !== JSON.stringify(corpus.entries[id])) throw new Error(`Detail mismatch: ${id}`)
    if ((index.entries[id].primary?.mediaId ?? null) !== entry.primaryId) throw new Error(`Index mismatch: ${id}`)
    for (const field of ['category', 'aliases', 'seasonIds', 'spiritIds']) if (JSON.stringify(index.entries[id][field]) !== JSON.stringify(entry[field])) throw new Error(`Enrichment mismatch: ${id}/${field}`)
    if (entry.primaryId && index.entries[id].primary.thumbnailUrl !== detail.media[entry.primaryId].thumbnailUrl) throw new Error(`Thumbnail mismatch: ${id}`)
    for (const ref of [entry.primaryId, ...entry.galleryIds].filter(Boolean)) {
      const record = corpus.records.find(m => m.mediaId === ref)
      if (JSON.stringify(record) !== JSON.stringify(detail.media[ref])) throw new Error(`Media mismatch: ${ref}`)
    }
  }
}
console.log(`Wiki media valid: ${catalogue.items.length} items, ${corpus.records.length} files; audit and frontend agree.`)

import { useEffect, useMemo, useState } from 'react'
import manifest from '../../data/itemLookup/wikiManifest.json'
import { catalogResult } from '../../data/itemLookup/catalog.ts'
import { enrichEntries, parseWikiIndex, parseWikiShard, wikiBucket } from '../../data/itemLookup/wiki.ts'
import type { WikiIndex, WikiShard } from '../../data/itemLookup/wiki.ts'

const entries = catalogResult.valid ? catalogResult.value.entries : []
const ids = new Set(entries.map(e => e.id))
let indexPromise: Promise<WikiIndex> | undefined
const shardPromises = new Map<string, Promise<WikiShard>>()
async function json(name: string): Promise<unknown> {
  const response = await fetch(`${manifest.baseUrl}/${name}.json`)
  if (!response.ok) throw new Error(`Wiki metadata HTTP ${response.status}`)
  return response.json()
}
function loadIndex() {
  indexPromise ??= json('index').then(data => parseWikiIndex(data, manifest.version, ids)).catch(error => { indexPromise = undefined; throw error })
  return indexPromise
}
export function useWikiCatalogue() {
  const [index, setIndex] = useState<WikiIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    loadIndex().then(value => { if (live) { setIndex(value); setFailed(false) } }, () => { if (live) setFailed(true) })
    return () => { live = false }
  }, [attempt])
  return { entries: useMemo(() => enrichEntries(entries, index), [index]), failed, retry: () => setAttempt(a => a + 1) }
}
export function useWikiDetail(id: string) {
  const [state, setState] = useState<{ id: string; shard: WikiShard | null; failed: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    const bucket = wikiBucket(id)
    if (!shardPromises.has(bucket)) shardPromises.set(bucket, json(`items-${bucket}`).then(data => parseWikiShard(data, manifest.version, ids)).catch(error => { shardPromises.delete(bucket); throw error }))
    shardPromises.get(bucket)!.then(shard => { if (live) setState({ id, shard, failed: false }) }, () => { if (live) setState({ id, shard: null, failed: true }) })
    return () => { live = false }
  }, [id, attempt])
  return { detail: state?.id === id ? state.shard?.entries[id] : undefined, media: state?.id === id ? state.shard?.media : undefined, failed: state?.id === id && state.failed, retry: () => setAttempt(a => a + 1) }
}

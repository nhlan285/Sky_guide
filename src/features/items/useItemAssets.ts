import { useEffect, useState } from 'react'
import { catalogResult } from '../../data/itemLookup/catalog.ts'
import { parseAssetIndex, parseAssetShard } from '../../data/itemLookup/assets.ts'
import type { AssetIndex, AssetShard } from '../../data/itemLookup/assets.ts'
import { wikiBucket } from '../../data/itemLookup/wiki.ts'

const ids = new Set(catalogResult.valid ? catalogResult.value.entries.map(e => e.id) : [])
let indexPromise: Promise<AssetIndex> | undefined
const shards = new Map<string, Promise<AssetShard>>()
async function json(name: string) {
  const response = await fetch(`/assets/items/manifests/${name}.json`)
  if (!response.ok) throw new Error(`Asset manifest HTTP ${response.status}`)
  return response.json() as Promise<unknown>
}
function index() {
  indexPromise ??= json('index').then(value => parseAssetIndex(value, ids)).catch(e => { indexPromise = undefined; throw e })
  return indexPromise
}
export function useAssetIndex() {
  const [value, setValue] = useState<AssetIndex | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => { let live = true; index().then(v => { if (live) { setValue(v); setFailed(false) } }, () => { if (live) setFailed(true) }); return () => { live = false } }, [attempt])
  return { value, failed, retry: () => { indexPromise = undefined; shards.clear(); setAttempt(a => a + 1) } }
}
export function useItemAssets(id: string) {
  const [state, setState] = useState<{ id: string; value: AssetShard | null; failed: boolean } | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    const bucket = wikiBucket(id)
    if (!shards.has(bucket)) shards.set(bucket, index().then(i => json(`items-${bucket}`).then(v => parseAssetShard(v, ids, i.version))).catch(e => { indexPromise = undefined; shards.delete(bucket); throw e }))
    shards.get(bucket)!.then(value => { if (live) setState({ id, value, failed: false }) }, () => { if (live) setState({ id, value: null, failed: true }) })
    return () => { live = false }
  }, [id, attempt])
  return { value: state?.id === id ? state.value?.entries[id] : undefined, failed: state?.id === id && state.failed, retry: () => setAttempt(a => a + 1) }
}

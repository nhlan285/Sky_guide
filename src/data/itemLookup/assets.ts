import storage from './assetStorage.json' with { type: 'json' }
export type AssetKind = 'primary' | 'worn-preview' | 'alternate' | 'reference'
export interface AssetVariant { webPath: string; width: number; height: number; hash: string; bytes: number }
export interface ItemAsset {
  mediaId: string; hash: string; width: number; height: number; hasAlpha: boolean; kind: AssetKind
  sourceUrl: string; sourcePageUrl: string; filePageUrl: string; sourceFilename: string; sourceRevision: number; crawlTimestamp: string
  uploader: string | null; credit: string | null; rightsStatus: 'verified' | 'unknown' | 'restricted'; publishingEligible: boolean
  licenseMetadata: Record<string, { value?: string }>; creditMetadata: Record<string, { value?: string }>
  mappingStatus: 'exact' | 'high-confidence' | 'manual'; variants: { thumbnails: AssetVariant; cards: AssetVariant; detail: AssetVariant }
}
export interface ItemAssets { itemId: string; primary: ItemAsset | null; gallery: ItemAsset[]; sourcePages: string[]; updatedAt: string | null }
export interface AssetIndex { schemaVersion: 1; version: string; entries: Record<string, { primary: ItemAsset | null }> }
export interface AssetShard { schemaVersion: 1; version: string; entries: Record<string, ItemAssets> }
const object = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
export function controlledAssetPath(value: unknown): value is string {
  if (typeof value !== 'string' || !value.startsWith(`${storage.baseUrl}/`)) return false
  return /^(thumbnails|cards|detail)\/[a-f0-9]{64}\.webp$/.test(value.slice(storage.baseUrl.length + 1))
}
function https(value: unknown) { try { const url = new URL(String(value)); return url.protocol === 'https:' && !url.username && !url.password } catch { return false } }
export function validAsset(value: unknown): value is ItemAsset {
  if (!object(value) || typeof value.mediaId !== 'string' || typeof value.hash !== 'string' || !/^[a-f0-9]{64}$/.test(value.hash) || typeof value.width !== 'number' || value.width <= 0 || typeof value.height !== 'number' || value.height <= 0 || typeof value.hasAlpha !== 'boolean' || !['primary', 'worn-preview', 'alternate', 'reference'].includes(String(value.kind)) || !['verified', 'unknown', 'restricted'].includes(String(value.rightsStatus)) || value.publishingEligible !== (value.rightsStatus === 'verified') || !['exact', 'high-confidence', 'manual'].includes(String(value.mappingStatus)) || !https(value.sourceUrl) || !https(value.sourcePageUrl) || !https(value.filePageUrl) || typeof value.sourceFilename !== 'string' || !Number.isSafeInteger(value.sourceRevision) || typeof value.crawlTimestamp !== 'string' || !object(value.licenseMetadata) || !object(value.creditMetadata) || !object(value.variants)) return false
  return ['thumbnails', 'cards', 'detail'].every(key => { const v = value.variants as Record<string, unknown>; const variant = v[key]; return object(variant) && controlledAssetPath(variant.webPath) && variant.webPath.startsWith(`${storage.baseUrl}/${key}/`) && typeof variant.width === 'number' && variant.width > 0 && typeof variant.height === 'number' && variant.height > 0 && typeof variant.hash === 'string' && /^[a-f0-9]{64}$/.test(variant.hash) && typeof variant.bytes === 'number' && variant.bytes > 0 })
}
function envelope(value: unknown, ids: ReadonlySet<string>) {
  if (!object(value) || value.schemaVersion !== 1 || typeof value.version !== 'string' || !/^[a-f0-9]{16}$/.test(value.version) || !object(value.entries) || Object.keys(value.entries).some(id => !ids.has(id))) throw new Error('Invalid item asset manifest')
  return value as { schemaVersion: 1; version: string; entries: Record<string, unknown> }
}
export function parseAssetIndex(value: unknown, ids: ReadonlySet<string>): AssetIndex {
  const result = envelope(value, ids)
  if (Object.keys(result.entries).length !== ids.size || Object.values(result.entries).some(e => !object(e) || e.primary !== null && !validAsset(e.primary))) throw new Error('Invalid item asset index')
  return result as AssetIndex
}
export function parseAssetShard(value: unknown, ids: ReadonlySet<string>, version?: string): AssetShard {
  const result = envelope(value, ids)
  if (version && result.version !== version) throw new Error('Mixed item asset versions')
  for (const [id, e] of Object.entries(result.entries)) {
    if (!object(e) || e.itemId !== id || e.primary !== null && !validAsset(e.primary) || !Array.isArray(e.gallery) || !e.gallery.every(validAsset) || !Array.isArray(e.sourcePages) || !e.sourcePages.every(https)) throw new Error('Invalid item asset detail')
  }
  return result as AssetShard
}
export function selectItemAsset(asset: ItemAsset | null | undefined, detail = false, failedPath: string | null = null): string | null {
  if (!asset || !validAsset(asset)) return null
  const path = detail ? asset.variants.detail.webPath : asset.variants.cards.webPath
  return path !== failedPath ? path : null
}

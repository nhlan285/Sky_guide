import type { Category, LookupEntry } from './model.ts'
import { categories } from './model.ts'

export const mediaKinds = ['primary', 'icon', 'worn-preview', 'alternate-view', 'gallery', 'reference'] as const
export type MediaKind = typeof mediaKinds[number]
export interface WikiThumbnail { mediaId: string; thumbnailUrl: string; width: number; height: number; mediaKind: MediaKind }
export interface WikiSummary { category: Category | null; aliases: string[]; seasonIds: string[]; spiritIds: string[]; primary: WikiThumbnail | null }
export interface WikiIndex { schemaVersion: 1; version: string; entries: Record<string, WikiSummary> }
export interface WikiEvidence { sourcePage: string; sourceRevision: number; sourceField: string; wikiPageUrl: string; category: string; spirit?: string | null; season?: string | null; event?: string | null }
export interface WikiMedia extends WikiThumbnail {
  originalUrl: string; fileTitle: string; filePageUrl: string; mime: string; uploader: string | null; timestamp: string | null
  sourcePage: string; sourceRevision: number; itemIds: string[]
  licenseMetadata: Record<string, { value?: string }>; creditMetadata: Record<string, { value?: string }>
  usageMetadata: { mode: 'external-reference'; permissionStatus: 'unverified'; note: string }
  mappings: { itemIds: string[]; kind: MediaKind }[]
}
export interface WikiDetail { primaryId: string | null; galleryIds: string[]; aliases: string[]; evidence: WikiEvidence[]; category: Category | null }
export interface WikiShard { schemaVersion: 1; version: string; entries: Record<string, WikiDetail>; media: Record<string, WikiMedia> }
const object = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string')
export function wikiImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'static.wikia.nocookie.net' && !url.username && !url.password } catch { return false }
}
function wikiPageUrl(value: unknown) {
  if (typeof value !== 'string') return false
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'sky-children-of-the-light.fandom.com' && !url.username && !url.password } catch { return false }
}
function validThumbnail(value: unknown): value is WikiThumbnail {
  return object(value) && typeof value.mediaId === 'string' && wikiImageUrl(value.thumbnailUrl) && typeof value.width === 'number' && value.width > 0 && typeof value.height === 'number' && value.height > 0 && mediaKinds.includes(value.mediaKind as MediaKind)
}
export function parseWikiIndex(value: unknown, version: string, ids: ReadonlySet<string>): WikiIndex {
  if (!object(value) || value.schemaVersion !== 1 || value.version !== version || !object(value.entries) || Object.keys(value.entries).length !== ids.size) throw new Error('Invalid Wiki index')
  for (const [id, entry] of Object.entries(value.entries)) {
    if (!ids.has(id) || !object(entry) || !strings(entry.aliases) || !strings(entry.seasonIds) || !entry.seasonIds.every(id => /^tsa-season-\d+$/.test(id)) || !strings(entry.spiritIds) || !entry.spiritIds.every(id => /^tsa-spirit-\d+$/.test(id)) || entry.category !== null && !categories.includes(entry.category as Category) || entry.primary !== null && !validThumbnail(entry.primary)) throw new Error('Invalid Wiki item')
  }
  return value as unknown as WikiIndex
}
export function parseWikiShard(value: unknown, version: string, ids: ReadonlySet<string>): WikiShard {
  if (!object(value) || value.schemaVersion !== 1 || value.version !== version || !object(value.entries) || !object(value.media)) throw new Error('Invalid Wiki details')
  for (const [id, media] of Object.entries(value.media)) {
    if (!validThumbnail(media) || !object(media) || media.mediaId !== id || !wikiImageUrl(media.originalUrl) || !wikiPageUrl(media.filePageUrl) || typeof media.fileTitle !== 'string' || typeof media.mime !== 'string' || !/^image\//.test(media.mime) || !strings(media.itemIds) || !media.itemIds.every(itemId => ids.has(itemId)) || !Number.isSafeInteger(media.sourceRevision) || !object(media.licenseMetadata) || !object(media.creditMetadata) || !object(media.usageMetadata) || media.usageMetadata.permissionStatus !== 'unverified' || !Array.isArray(media.mappings) || !media.mappings.every(m => object(m) && strings(m.itemIds) && mediaKinds.includes(m.kind as MediaKind))) throw new Error('Invalid Wiki media')
  }
  for (const [id, entry] of Object.entries(value.entries)) {
    if (!ids.has(id) || !object(entry) || !strings(entry.galleryIds) || !strings(entry.aliases) || !Array.isArray(entry.evidence) || !entry.evidence.every(e => object(e) && wikiPageUrl(e.wikiPageUrl) && Number.isSafeInteger(e.sourceRevision)) || entry.primaryId !== null && typeof entry.primaryId !== 'string') throw new Error('Invalid Wiki detail')
    for (const ref of [entry.primaryId, ...entry.galleryIds].filter(Boolean) as string[]) {
      const media = value.media[ref]
      if (!object(media) || !strings(media.itemIds) || !media.itemIds.includes(id)) throw new Error('Broken Wiki media relation')
    }
  }
  return value as unknown as WikiShard
}
export function enrichEntries(entries: readonly LookupEntry[], index: WikiIndex | null): LookupEntry[] {
  return entries.map(entry => {
    const wiki = index?.entries[entry.id]
    return wiki ? { ...entry, wiki, item: { ...entry.item, seasonIds: entry.item.seasonIds.length ? entry.item.seasonIds : wiki.seasonIds, spiritIds: entry.item.spiritIds.length ? entry.item.spiritIds : wiki.spiritIds }, category: entry.category === 'unknown' && wiki.category ? wiki.category : entry.category, categoryEvidence: entry.category === 'unknown' && wiki.category ? 'Sky Wiki structured item metadata; source revision in media credits.' : entry.categoryEvidence } : entry
  })
}
export function selectWikiImage(media: WikiThumbnail | WikiMedia | null | undefined, detail = false, failedUrl: string | null = null): string | null {
  if (!media) return null
  const url = detail && 'originalUrl' in media && media.width <= 1600 && media.width * media.height <= 3000000 ? media.originalUrl : media.thumbnailUrl
  return wikiImageUrl(url) && url !== failedUrl ? url : null
}
export const wikiBucket = (id: string) => String(Math.floor(Number(id.replace('tsa-cosmetic-', '')) / 100)).padStart(2, '0')

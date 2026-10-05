import { publicMedia, safeHttps } from '../data/domain/media.ts'
import type { MediaRecord, Revocations } from '../data/domain/media.ts'
import { validateDateTime } from '../data/core/index.ts'

export interface ObjectStorage {
  // Binary upload/transform is intentionally outside this read contract.
  // Presigning, credentials and SDKs live only in the selected server adapter.
  resolveDelivery(storageKey: string): Promise<{ url: string; expiresAt: string | null }>
}
export interface RevocationRegistry { current(): Promise<Revocations> }

export async function resolveMediaDelivery(media: MediaRecord, storage: ObjectStorage, registry: RevocationRegistry, now: () => number = Date.now) {
  try {
    if (!publicMedia(media, await registry.current())) return null
    const delivery = await storage.resolveDelivery(media.storageKey)
    if (!safeHttps(delivery.url).valid || delivery.expiresAt !== null && (!validateDateTime(delivery.expiresAt).valid || Date.parse(delivery.expiresAt) <= now())) return null
    // A restore or concurrent withdrawal may revoke between lookup and signing.
    const projection = publicMedia(media, await registry.current())
    return projection ? { media: projection, delivery: { url: delivery.url, expiresAt: delivery.expiresAt }, cacheControl: 'no-store' as const } : null
  } catch {
    // Missing rights ledger/storage is unavailable, never a permissive fallback.
    return null
  }
}

import type { ItemCatalog } from '../itemLookup/release.ts'

export type SourceHealth = 'healthy' | 'delayed' | 'stale' | 'offline'
export interface Freshness {
  health: SourceHealth
  lastSuccessAt: string
  validUntil: string | null
}
export interface PublicSnapshot {
  catalog: ItemCatalog
  freshness: Freshness
}
// Adapters return a validated, immutable, allowlisted projection from one release.
// Provider credentials, query builders and transaction objects stay server-side.
export interface DomainRepository {
  readCatalog(): Promise<PublicSnapshot | null>
}
export interface LiveEventsContract {
  schemaVersion: 1
  scheduleVersion: string
  generatedAt: string
  serverTime: string
  validUntil: string | null
  health: SourceHealth
  active: EventOccurrenceContract[]
  upcoming: EventOccurrenceContract[]
}
export interface EventOccurrenceContract {
  id: string; eventId: string; startsAt: string; endsAt: string
  timezone: 'America/Los_Angeles'
  sourceType: 'official' | 'community' | 'calculated' | 'prediction'
  confidence: 'confirmed' | 'tentative'
  provenanceIds: string[]
}

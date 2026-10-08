import { validateSourceRecord } from '../core/index.ts'
import type { ID, SourceRegistry, ValidationError } from '../core/index.ts'
import { validateSeasonEvent } from './seasons.ts'
import type { CatalogContext, SeasonEvent } from './types.ts'

export type EventSourceType = 'official' | 'community' | 'calculated'
export type ReviewedEventFields = Omit<SeasonEvent, 'updatedAt' | 'recordStatus'>
export interface EventReview {
  sourceType: EventSourceType
  fields: ReviewedEventFields
  sourcePins: Readonly<Record<ID, { sourceId: string; sourceUrl: string | null; sourceRevision: string | null; retrievedAt: string }>>
}
export interface ManualEventContext {
  catalog: CatalogContext
  eventIds: ReadonlySet<ID>
  sourceRegistry: SourceRegistry
  sources: ReadonlyMap<ID, unknown>
  reviews: ReadonlyMap<ID, EventReview>
}
export interface StagedEvent { event: SeasonEvent; sourceType: EventSourceType; reviewId: ID }
type Report = Pick<ValidationError, 'code' | 'path'>
export type ManualEventResult =
  | { status: 'staged'; candidates: StagedEvent[]; reports: [] }
  | { status: 'quarantined'; candidates: null; reports: Report[] }
export const MAX_MANUAL_EVENT_BYTES = 100_000
const reject = (code: ValidationError['code'], path: Report['path'] = []): ManualEventResult => ({ status: 'quarantined', candidates: null, reports: [{ code, path }] })
const stable = (value: unknown): string => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.fromEntries(Object.entries(entry).sort(([a], [b]) => a.localeCompare(b))) : entry)
const reviewedFields = (event: SeasonEvent): ReviewedEventFields => ({ id: event.id, kind: event.kind, name: event.name, startsAt: event.startsAt, endsAt: event.endsAt, timeStatus: event.timeStatus, summary: event.summary, spiritIds: event.spiritIds, itemIds: event.itemIds, realmIds: event.realmIds, mapIds: event.mapIds, officialArticleIds: event.officialArticleIds, provenanceIds: event.provenanceIds, fieldProvenance: event.fieldProvenance, fixture: event.fixture })

// Private atomic staging. The file cannot register sources, create review evidence,
// replace a live schedule, or promote date precision. No fetch/write/publication.
export function stageManualEvents(text: unknown, context: ManualEventContext): ManualEventResult {
  if (typeof text !== 'string' || !text || text.length > MAX_MANUAL_EVENT_BYTES || new TextEncoder().encode(text).byteLength > MAX_MANUAL_EVENT_BYTES) return reject('invalid_value')
  if (!context?.catalog || !(context.eventIds instanceof Set) || !(context.sourceRegistry instanceof Set) || !(context.sources instanceof Map) || !(context.reviews instanceof Map)) return reject('invalid_value', ['context'])
  if (!['provenanceIds', 'spiritIds', 'itemIds', 'realmIds', 'mapIds', 'articleIds'].every(key => context.catalog[key as keyof CatalogContext] instanceof Set)) return reject('invalid_value', ['context'])
  let input: unknown
  try { input = JSON.parse(text) } catch { return reject('invalid_value') }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reject('invalid_type')
  const envelope = input as Record<string, unknown>
  if (envelope.schemaVersion !== 1) return reject('invalid_value', ['schemaVersion'])
  if (!Array.isArray(envelope.events) || !envelope.events.length || envelope.events.length > 50) return reject('invalid_value', ['events'])
  const candidates: StagedEvent[] = [], reports: Report[] = [], ids = new Set<ID>()
  for (const [index, raw] of envelope.events.entries()) {
    const add = (code: Report['code'], field: string) => reports.push({ code, path: ['events', index, field] })
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { add('invalid_type', 'event'); continue }
    const entry = raw as Record<string, unknown>
    const result = validateSeasonEvent(entry.event, context.catalog)
    if (!result.valid) { reports.push(...result.errors.map(({ code, path }) => ({ code, path: ['events', index, 'event', ...path] }))); continue }
    const event = result.value
    if (event.recordStatus !== 'draft') add('invalid_value', 'recordStatus')
    if (!context.eventIds.has(event.id)) add('unknown_reference', 'id')
    if (ids.has(event.id)) add('duplicate_id', 'id')
    ids.add(event.id)
    if (!event.provenanceIds.length) add('invalid_relationship', 'provenanceIds')
    if (Object.values(event.fieldProvenance).flat().some(id => !event.provenanceIds.includes(id))) add('invalid_relationship', 'fieldProvenance')
    if (event.summary && event.summary.length > 1_000 || [event.name.default, ...Object.values(event.name.translations)].some(name => !name.trim() || name.length > 280)) add('invalid_value', 'text')
    const review = typeof entry.reviewId === 'string' ? context.reviews.get(entry.reviewId) : undefined
    if (!review || !review.sourcePins || !['official', 'community', 'calculated'].includes(review.sourceType) || stable(review.fields) !== stable(reviewedFields(event))) { add('invalid_relationship', 'reviewId'); continue }
    // Review covers every source and field (including null/date-only values and
    // FK mappings), so an input's own claim of official status has no authority.
    for (const id of event.provenanceIds) {
      const source = validateSourceRecord(context.sources.get(id), context.sourceRegistry)
      const pin = review.sourcePins[id]
      let validUrl = false
      if (source.valid && source.value.sourceUrl) {
        try { const url = new URL(source.value.sourceUrl); validUrl = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash } catch { /* fail closed */ }
      }
      if (!source.valid || !pin || stable(pin) !== stable({ sourceId: source.value.sourceId, sourceUrl: source.value.sourceUrl, sourceRevision: source.value.sourceRevision, retrievedAt: source.value.retrievedAt }) || source.value.id !== id || source.value.verificationStatus !== 'verified' || !validUrl || !source.value.attribution.trim() || !source.value.licenseNote.trim() || !source.value.transformNote.trim()) add('invalid_relationship', 'provenanceIds')
    }
    candidates.push({ event, sourceType: review.sourceType, reviewId: entry.reviewId as ID })
  }
  return reports.length ? { status: 'quarantined', candidates: null, reports } : { status: 'staged', candidates, reports: [] }
}

// The caller retains its accepted version on any failed batch; staging success
// still requires a separate canonical approval/public projection step.
export function retainEventDraft(previous: readonly StagedEvent[], result: ManualEventResult): readonly StagedEvent[] {
  return result.status === 'staged' ? result.candidates : previous
}

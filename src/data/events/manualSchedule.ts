import snapshot from './reviewed-schedule.json' with { type: 'json' }
import { validateSeasonEvents } from '../catalog/seasons.ts'
import type { CatalogContext } from '../catalog/types.ts'
import { validateSourceRecord } from '../core/index.ts'
import type { PartialTime } from '../core/index.ts'

const source = validateSourceRecord(snapshot.source, new Set(['K06']))
const expectedUrl = 'https://www.thatskygame.com/news/this-month-in-sky-october-2026-edition/'
if (!source.valid || source.value.sourceUrl !== expectedUrl || source.value.verificationStatus !== 'verified' || snapshot.sourceType !== 'official' || !/^[a-f0-9]{64}$/.test(snapshot.sourceHash)) throw new Error('Invalid manual schedule source.')
const provenanceIds = new Set([source.value.id])
const context: CatalogContext = {
  provenanceIds, itemIds: new Set(), spiritIds: new Set(), treeIds: new Set(), nodeIds: new Set(), seasonIds: new Set(), realmIds: new Set(), mapIds: new Set(), articleIds: new Set(), assetIds: new Set(), ruleIds: new Set(), iapProductIds: new Set(), visitIds: new Set(),
}
const parsed = validateSeasonEvents(snapshot.records, context)
if (!parsed.valid || parsed.value.some(record => record.fixture || record.recordStatus !== 'draft' || !record.id.startsWith('tgc-oct2026-'))) throw new Error('Invalid manual schedule projection.')

// Separate source-scoped manual projection. This does not approve canonical
// import, define recurrence, assert current activity or fabricate precise ends.
export const manualSchedule = { version: snapshot.version, source: source.value, records: parsed.value, publicationDate: snapshot.sourcePublicationDate }
export const reviewedAnnouncement = { title: snapshot.sourceHeadline, publicationDate: manualSchedule.publicationDate, source: manualSchedule.source }
export const eventDisplayZones = ['America/Los_Angeles', 'Asia/Ho_Chi_Minh', 'UTC'] as const
export type EventDisplayZone = typeof eventDisplayZones[number]
export function formatScheduleTime(time: PartialTime | null, zone: EventDisplayZone, locale: string): string | null {
  if (!time) return null
  if (time.precision !== 'instant') return time.value // Calendar dates never shift timezone.
  return new Intl.DateTimeFormat(locale, { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(time.value))
}

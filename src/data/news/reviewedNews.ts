import hotfix from './hotfix-sample.json' with { type: 'json' }
import { reviewedAnnouncement } from '../events/manualSchedule.ts'
import { validatePartialTime, validateSourceRecord } from '../core/index.ts'
import type { PartialTime, SourceRecord } from '../core/index.ts'

export type NewsKind = 'announcement' | 'patch-note'
export interface ReviewedNewsEntry {
  id: string
  kind: NewsKind
  title: string
  date: PartialTime
  dateMeaning: 'publication' | 'release'
  version: string | null
  platforms: string[]
  summaryOwnWords: string | null
  publicationInstant: null
  updatedInstant: null
  canonicalArticleId: null
  source: SourceRecord
}

const source = validateSourceRecord(hotfix.source, new Set(['K06']))
const releaseDate = validatePartialTime(hotfix.releaseDate)
const monthlyDate = validatePartialTime({ value: reviewedAnnouncement.publicationDate, precision: 'date', timezone: null, rawLabel: null })
const hotfixUrl = 'https://thatgamecompany.helpshift.com/hc/en/17-sky-children-of-the-light/faq/1467-hotfix-34-4---august-10-2026---playstation-ios/'
if (!source.valid || source.value.sourceUrl !== hotfixUrl || source.value.verificationStatus !== 'verified' || !releaseDate.valid || releaseDate.value.precision !== 'date' || !monthlyDate.valid || hotfix.publicationInstant !== null || hotfix.updatedInstant !== null || hotfix.canonicalArticleId !== null) throw new Error('Invalid reviewed news metadata.')

// Source-scoped reviewed metadata, separate from canonical Article imports and
// live feeds. Retrieval time is never promoted to publication or modification.
export const reviewedNews: ReviewedNewsEntry[] = [
  { id: 'monthly-oct2026', kind: 'announcement', title: reviewedAnnouncement.title, date: monthlyDate.value, dateMeaning: 'publication', version: null, platforms: [], summaryOwnWords: null, publicationInstant: null, updatedInstant: null, canonicalArticleId: null, source: reviewedAnnouncement.source },
  { id: 'hotfix-34-4-reviewed', kind: 'patch-note', title: hotfix.title, date: releaseDate.value, dateMeaning: 'release', version: hotfix.version, platforms: hotfix.platforms, summaryOwnWords: hotfix.summaryOwnWords, publicationInstant: null, updatedInstant: null, canonicalArticleId: null, source: source.value },
]

export function filterReviewedNews(query: string, kind: NewsKind | 'all'): ReviewedNewsEntry[] {
  const search = query.trim().toLocaleLowerCase()
  return reviewedNews.filter(entry => (kind === 'all' || entry.kind === kind) && `${entry.title} ${entry.platforms.join(' ')} ${entry.version ?? ''}`.toLocaleLowerCase().includes(search))
}

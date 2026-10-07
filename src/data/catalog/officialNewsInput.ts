import { enumeration, failure, nullable, object, validateDateTime, validateId, validatePartialTime, validateProvenanceIds, validateSourceRecord, compareInstants } from '../core/index.ts'
import type { DateTime, ID, PartialTime, SourceRecord, SourceRegistry, ValidationError, ValidationResult } from '../core/index.ts'
import { boolean, nonBlank } from './shared.ts'

export interface OfficialArticleDraft {
  id: ID; revision: string; category: 'official'; title: string; summary: string
  sourceProvenanceIds: ID[]; officialEvidenceIds: ID[]
  factualStatus: 'official' | 'corrected'; spoiler: boolean; publishedAt: DateTime | null
  updatedAt: DateTime; recordStatus: 'draft'; fixture: boolean
}
export interface RegisteredOfficialEvidence { provenanceId: ID; publicationTime: PartialTime | null }
export interface ManualOfficialNewsContext {
  articleIds: ReadonlySet<ID>; sourceRegistry: SourceRegistry
  sources: ReadonlyMap<ID, unknown>; officialEvidence: ReadonlyMap<ID, RegisteredOfficialEvidence>
}
type Report = Pick<ValidationError, 'code' | 'path'>
export type ManualOfficialNewsResult =
  | { status: 'staged'; candidateArticles: OfficialArticleDraft[]; provenance: SourceRecord[]; reports: [] }
  | { status: 'quarantined'; candidateArticles: null; reports: Report[] }
export const MAX_MANUAL_NEWS_BYTES = 100_000
const quarantine = (errors: readonly ValidationError[]): ManualOfficialNewsResult => ({ status: 'quarantined', candidateArticles: null, reports: errors.map(({code,path}) => ({code,path})) })
const reject = (code: ValidationError['code'], path: (string | number)[] = []): ManualOfficialNewsResult => ({status:'quarantined',candidateArticles:null,reports:[{code,path}]})
const bounded = (limit: number) => (input: unknown): ValidationResult<string> => {
  const parsed = nonBlank(input)
  return parsed.valid && parsed.value.length > limit ? failure('invalid_value','Text exceeds the manual input limit.') : parsed
}
const officialUrl = (value: string | null) => {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'thatgamecompany.helpshift.com' && !url.port && !url.username && !url.password && !url.search && !url.hash && /^\/hc\/en\/17-sky-children-of-the-light\/faq\/\d+(?:-[^/]*)?\/$/.test(url.pathname)
  } catch { return false }
}

// Pure private draft staging: never writes, fetches, approves or exports publicly.
export function stageManualOfficialNews(text: unknown, context: ManualOfficialNewsContext): ManualOfficialNewsResult {
  if (typeof text !== 'string' || !text || text.length > MAX_MANUAL_NEWS_BYTES || new TextEncoder().encode(text).byteLength > MAX_MANUAL_NEWS_BYTES) return reject('invalid_value')
  if (!(context?.articleIds instanceof Set) || !(context.sourceRegistry instanceof Set) || !(context.sources instanceof Map) || !(context.officialEvidence instanceof Map)) return reject('invalid_value',['context'])
  let input: unknown
  try { input = JSON.parse(text) } catch { return reject('invalid_value') }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return reject('invalid_type')
  const envelope = input as Record<string, unknown>
  if (envelope.schemaVersion !== 1) return reject('invalid_value',['schemaVersion'])
  if (!Array.isArray(envelope.articles) || !envelope.articles.length || envelope.articles.length > 50) return reject('invalid_value',['articles'])
  const candidates: OfficialArticleDraft[] = [], usedSources = new Map<ID,SourceRecord>(), ids = new Set<ID>(), errors: ValidationError[] = []
  for (const [index, raw] of envelope.articles.entries()) {
    const parsed = object<OfficialArticleDraft>(raw, {
      id: validateId, revision: bounded(200), category: enumeration(['official']), title: bounded(280), summary: bounded(1_000),
      sourceProvenanceIds: value => validateProvenanceIds(value,new Set(context.sources.keys())),
      officialEvidenceIds: value => validateProvenanceIds(value,new Set(context.officialEvidence.keys())),
      factualStatus: enumeration(['official','corrected']), spoiler: boolean, publishedAt: nullable(validateDateTime),
      updatedAt: validateDateTime, recordStatus: enumeration(['draft']), fixture: boolean,
    })
    const add = (code: ValidationError['code'], field: string) => errors.push({code,path:['articles',index,field],message:'Manual draft failed its registered contract.'})
    if (!parsed.valid) { errors.push(...parsed.errors.map(error=>({...error,path:['articles',index,...error.path]}))); continue }
    const article = parsed.value
    if (!context.articleIds.has(article.id)) add('unknown_reference','id')
    if (ids.has(article.id)) add('duplicate_id','id')
    ids.add(article.id)
    for (const id of article.sourceProvenanceIds) {
      const source = validateSourceRecord(context.sources.get(id),context.sourceRegistry)
      if (!source.valid || source.value.id !== id || source.value.sourceId !== 'K06' || source.value.verificationStatus !== 'verified' || !officialUrl(source.value.sourceUrl) || !source.value.sourceRecordKey?.trim() || (source.value.sourceRevision !== null && !source.value.sourceRevision.trim()) || !source.value.attribution.trim() || !source.value.licenseNote.trim() || !source.value.transformNote.trim()) {
        add('invalid_relationship','sourceProvenanceIds'); continue
      }
      usedSources.set(id,source.value)
    }
    let matchedInstant = false
    const supportedInstants: string[] = []
    for (const id of article.officialEvidenceIds) {
      const evidence = context.officialEvidence.get(id)!
      if (!evidence || !article.sourceProvenanceIds.includes(evidence.provenanceId) || !usedSources.has(evidence.provenanceId)) { add('invalid_relationship','officialEvidenceIds'); continue }
      if (evidence.publicationTime !== null) {
        const time = validatePartialTime(evidence.publicationTime)
        if (!time.valid) { add('invalid_relationship','officialEvidenceIds'); continue }
        if (time.value.precision === 'instant') {
          const instant = time.value.value
          if (compareInstants(instant, usedSources.get(evidence.provenanceId)!.retrievedAt) > 0) add('invalid_relationship','officialEvidenceIds')
          else {
            if (!supportedInstants.some(value=>compareInstants(value,instant)===0)) supportedInstants.push(instant)
            if (article.publishedAt !== null && compareInstants(instant,article.publishedAt)===0) matchedInstant = true
          }
        }
      }
    }
    if (supportedInstants.length > 1) add('invalid_relationship','officialEvidenceIds')
    if (article.publishedAt !== null && !matchedInstant) add('invalid_relationship','publishedAt')
    candidates.push(article)
  }
  return errors.length ? quarantine(errors) : {status:'staged',candidateArticles:candidates,provenance:[...usedSources.values()],reports:[]}
}

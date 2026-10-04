import type { DomainRepository } from '../data/domain/repository.ts'
import type { Item, Spirit } from '../data/catalog/types.ts'

function itemProjection(item: Item) {
  return { id: item.id, name: item.name, slot: item.slot, rawSlot: item.rawSlot,
    seasonIds: item.seasonIds, spiritIds: item.spiritIds, acquisitionOptions: item.acquisitionOptions,
    dyeStatus: item.dyeStatus, provenanceIds: item.provenanceIds,
    fieldProvenance: item.fieldProvenance ?? {}, updatedAt: item.updatedAt }
}
function spiritProjection(spirit: Spirit) {
  return { id: spirit.id, name: spirit.name, category: spirit.category, realmId: spirit.realmId,
    seasonIds: spirit.seasonIds, treeIds: spirit.treeIds, provenanceIds: spirit.provenanceIds,
    fieldProvenance: spirit.fieldProvenance ?? {}, updatedAt: spirit.updatedAt }
}
const response = (body: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } })
const error = (code: string, status: number) => response({ schemaVersion: 1, error: { code } }, status)
const natural = (value: string | null, fallback: number) => value === null ? fallback : /^(0|[1-9]\d*)$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null

// Not mounted in Vercel until the foundation review/provider gate. The same Web
// Request/Response handler can be mounted by any host without exposing a DB SDK.
export function createDomainApi(repository: DomainRepository, now: () => number = Date.now) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET') return response({ schemaVersion: 1, error: { code: 'method_not_allowed' } }, 405, { Allow: 'GET' })
    const url = new URL(request.url)
    if (/^\/api\/events(?:\/[^/]+)?$/.test(url.pathname)) return error('source_unavailable', 503)
    const route = /^\/api\/(items|spirits)(?:\/([^/]+))?$/.exec(url.pathname)
    if (!route) return error('not_found', 404)
    const [, kind, rawId] = route
    let id: string | undefined
    try { id = rawId ? decodeURIComponent(rawId) : undefined } catch { return error('invalid_query', 400) }
    if (id && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/.test(id)) return error('invalid_query', 400)
    const params = url.searchParams
    const allowed = id ? ['version'] : kind === 'items' ? ['version', 'offset', 'limit', 'q', 'slot', 'season', 'spirit'] : ['version', 'offset', 'limit', 'q', 'season']
    for (const name of params.keys()) if (!allowed.includes(name) || params.getAll(name).length !== 1) return error('invalid_query', 400)
    const offset = natural(params.get('offset'), 0)
    const limit = natural(params.get('limit'), 50)
    if (offset === null || limit === null || limit < 1 || limit > 100 || offset > 0 && !params.get('version') || [...params.values()].some(value => value.length > 200)) return error('invalid_query', 400)
    const slot = params.get('slot')
    if (slot && !['mask', 'hair', 'cape', 'top', 'bottom', 'accessory', 'unknown'].includes(slot)) return error('invalid_query', 400)
    try {
      const snapshot = await repository.readCatalog()
      if (!snapshot) return error('source_unavailable', 503)
      const { catalog, freshness } = snapshot
      const version = catalog.manifest.catalogVersion
      if (params.has('version') && params.get('version') !== version) return error('version_mismatch', 409)
      // Defence against an incorrectly implemented adapter; full payload/checksum
      // validation is a required repository boundary, tested by adapter parity.
      if ([...catalog.entries.map(entry => entry.item), ...catalog.spirits].some(record => record.fixture || record.recordStatus !== 'published')) return error('source_unavailable', 503)
      const serverTime = new Date(now()).toISOString()
      const health = freshness.health === 'offline' ? 'offline' : freshness.validUntil === null || Date.parse(freshness.validUntil) <= Date.parse(serverTime) ? 'stale' : freshness.health
      const meta = { schemaVersion: 1, catalogVersion: version, generatedAt: catalog.manifest.generatedAt, serverTime,
        freshness: { health, lastSuccessAt: freshness.lastSuccessAt, validUntil: freshness.validUntil },
        provenance: catalog.provenance.map(source => ({ id: source.id, sourceId: source.sourceId, sourceUrl: source.sourceUrl,
          sourceRevision: source.sourceRevision, retrievedAt: source.retrievedAt, observedAt: source.observedAt,
          attribution: source.attribution, licenseNote: source.licenseNote, verificationStatus: source.verificationStatus })) }
      if (id) {
        const record = kind === 'items' ? catalog.entries.find(entry => entry.id === id)?.item : catalog.spirits.find(spirit => spirit.id === id)
        if (!record) return error('not_found', 404)
        return response({ ...meta, data: kind === 'items' ? itemProjection(record as Item) : spiritProjection(record as Spirit) })
      }
      const query = (params.get('q') ?? '').trim().toLowerCase()
      const season = params.get('season')
      const spirit = params.get('spirit')
      const records = kind === 'items'
        ? catalog.entries.map(entry => entry.item).filter(item => (!slot || item.slot === slot) && (!spirit || item.spiritIds.includes(spirit))).map(itemProjection)
        : catalog.spirits.map(spiritProjection)
      const filtered = records.filter(record => (!query || `${record.name.default} ${record.id}`.toLowerCase().includes(query)) && (!season || record.seasonIds.includes(season)))
        .sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      const end = offset + limit
      return response({ ...meta, data: filtered.slice(offset, end), page: { offset, limit, total: filtered.length, nextOffset: end < filtered.length ? end : null } })
    } catch {
      // Never disclose raw provider errors, SQL, keys, or private evidence.
      return error('source_unavailable', 503)
    }
  }
}

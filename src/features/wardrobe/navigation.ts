import { validateId } from '../../data/core/index.ts'

const lookupKeys = ['q', 'category', 'slot', 'season', 'spirit', 'acquisition', 'page']
function lookupContext(search: string) {
  const source = new URLSearchParams(search)
  const result = new URLSearchParams()
  for (const key of lookupKeys) { const value = source.get(key); if (value) result.set(key, value) }
  return result
}
export function wardrobeItemUrl(id: string, search: string): string {
  const params = lookupContext(search)
  params.set('item', id)
  return `/wardrobe?${params}`
}
export function wardrobeItemIntent(search: string) {
  const params = new URLSearchParams(search)
  const rawId = params.get('item')
  const id = rawId !== null && rawId.length <= 200 && validateId(rawId).valid ? rawId : null
  const context = lookupContext(search).toString()
  const suffix = context ? `?${context}` : ''
  return { requested: params.has('item'), id, returnUrl: id ? `/items/${encodeURIComponent(id)}${suffix}` : `/items${suffix}` }
}

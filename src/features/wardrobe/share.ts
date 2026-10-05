import { validateOutfitSnapshot, validateSelection } from '../../data/wardrobe/index.ts'
import type { OutfitSnapshot, WardrobePackage } from '../../data/wardrobe/index.ts'
import { resolveRules } from './engine.ts'

export const MAX_SHARE_FRAGMENT = 2048
export const MAX_SHARE_BYTES = 16_384
const PREFIX = '#outfit=v1.'
export type ShareIssue = 'invalid' | 'version' | 'too_large' | 'unsupported'
export type ShareResult<T> = { ok: true; value: T } | { ok: false; issue: ShareIssue }
const fail = (issue: ShareIssue): { ok: false; issue: ShareIssue } => ({ ok: false, issue })

async function boundedBytes(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array | null> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > limit) { await reader.cancel(); return null }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length }
  return result
}
function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}
export async function encodeOutfitShare(input: unknown, pkg: WardrobePackage): Promise<ShareResult<string>> {
  const parsed = validateSelection(input, pkg)
  if (!parsed.valid || resolveRules(parsed.value, pkg).issue) return fail('invalid')
  const raw = new TextEncoder().encode(JSON.stringify({ ...parsed.value, catalogVersion: pkg.revision }))
  if (raw.byteLength > MAX_SHARE_BYTES) return fail('too_large')
  if (typeof CompressionStream === 'undefined') return fail('unsupported')
  try {
    const compressed = await boundedBytes(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip')), MAX_SHARE_FRAGMENT)
    if (!compressed) return fail('too_large')
    const fragment = PREFIX + base64url(compressed)
    return fragment.length <= MAX_SHARE_FRAGMENT ? { ok: true, value: fragment } : fail('too_large')
  } catch { return fail('unsupported') }
}
export async function decodeOutfitShare(fragment: string, pkg: WardrobePackage): Promise<ShareResult<OutfitSnapshot>> {
  if (fragment.length > MAX_SHARE_FRAGMENT) return fail('too_large')
  if (!fragment.startsWith(PREFIX)) return fail(fragment.startsWith('#outfit=') ? 'version' : 'invalid')
  const encoded = fragment.slice(PREFIX.length)
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded) || encoded.length % 4 === 1) return fail('invalid')
  if (typeof DecompressionStream === 'undefined') return fail('unsupported')
  try {
    const bytes = Uint8Array.from(atob(encoded.replaceAll('-', '+').replaceAll('_', '/')), char => char.charCodeAt(0))
    if (base64url(bytes) !== encoded) return fail('invalid')
    const raw = await boundedBytes(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')), MAX_SHARE_BYTES)
    if (!raw) return fail('too_large')
    const input: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw))
    if (!input || typeof input !== 'object' || Array.isArray(input)) return fail('invalid')
    if (!('schemaVersion' in input) || input.schemaVersion !== 1 || !('catalogVersion' in input) || input.catalogVersion !== pkg.revision) return fail('version')
    const parsed = validateOutfitSnapshot({ ...input, id: null, name: null, savedAt: null }, pkg)
    if (!parsed.valid || resolveRules(parsed.value, pkg).issue) return fail('invalid')
    return { ok: true, value: parsed.value }
  } catch { return fail('invalid') }
}
export function outfitShareUrl(origin: string, fragment: string): string | null {
  try {
    const base = new URL(origin)
    if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || fragment.length > MAX_SHARE_FRAGMENT || !fragment.startsWith(PREFIX)) return null
    const url = `${base.origin}/wardrobe${fragment}`
    return url.length <= 4096 ? url : null
  } catch { return null }
}

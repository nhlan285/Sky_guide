import sharp from 'sharp'
import { Buffer } from 'node:buffer'
import { readFile, statfs } from 'node:fs/promises'
import { join } from 'node:path'
import { sha256, saveJson, readJson, writeIfChanged } from './io.mjs'
import { createAssetStore } from './storage.mjs'

export const variants = { thumbnails: 256, cards: 512, detail: 1024 }
export const processingVersion = 'webp-lossless-alpha-v2'
export function signature(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpeg'
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'webp'
  if (/^GIF8[79]a/.test(bytes.subarray(0, 6).toString())) return 'gif'
  // SVG is retained as discovered metadata, but never served untrusted/unsanitized.
  throw new Error('INVALID_IMAGE_SIGNATURE: HTML, SVG or unsupported/corrupt binary')
}
export async function validateImage(bytes, contentType) {
  if (!bytes.length || !/^image\/(png|jpeg|webp|gif)(?:;|$)/i.test(contentType ?? '')) throw new Error('INVALID_IMAGE_CONTENT_TYPE')
  const format = signature(bytes)
  const pipeline = sharp(bytes, { limitInputPixels: 80_000_000, failOn: 'warning' })
  const metadata = await pipeline.metadata()
  if (!metadata.width || !metadata.height || metadata.format !== format) throw new Error('INVALID_IMAGE_DIMENSIONS_OR_FORMAT')
  await pipeline.clone().raw().toBuffer() // Actually decode; metadata alone accepts truncated files.
  return { format, width: metadata.width, height: metadata.height, hasAlpha: Boolean(metadata.hasAlpha), pages: metadata.pages ?? 1, hash: sha256(bytes), bytes: bytes.length }
}
export function assetName(hash, variant) {
  if (!/^[a-f0-9]{64}$/.test(hash) || !(variant in variants)) throw new Error('Invalid normalized asset identity')
  return `${sha256(`${processingVersion}:${hash}`)}.webp` // Shared content + transform identity, immutable across recipe changes.
}
export async function optimizeImage(download, config) {
  const store = createAssetStore(config)
  if (!/^[a-f0-9]{64}$/.test(download.hash) || !['png', 'jpeg', 'webp', 'gif'].includes(download.format) || download.localSourcePath !== join(config.imageDir, `${download.hash}.${download.format}`)) throw new Error('Unsafe raw cache reference')
  const path = join(config.metadataDir, 'files', `optimized-${download.hash}.json`)
  const existing = await readJson(path, null)
  if (existing?.processingVersion === processingVersion) {
    try { for (const output of Object.values(existing.variants)) { const reference = store.reference(output.relativePath); if (sha256(await readFile(reference.localPath)) !== output.hash) throw new Error('corrupt'); output.webPath = reference.webPath }; return existing } catch { /* Rebuild missing/corrupted variants from validated raw bytes. */ }
  }
  const bytes = await readFile(download.localSourcePath)
  if (sha256(bytes) !== download.hash) throw new Error('RAW_HASH_MISMATCH')
  await validateImage(bytes, download.contentType)
  const outputs = {}
  for (const [variant, size] of Object.entries(variants)) {
    const result = await sharp(bytes, { failOn: 'warning' }).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).webp({ quality: 90, alphaQuality: 100, lossless: download.hasAlpha, effort: 4 }).toBuffer({ resolveWithObject: true })
    const relativePath = `${variant}/${assetName(download.hash, variant)}`
    const disk = await statfs(config.root)
    if (Number(disk.bavail) * Number(disk.bsize) - result.data.length < config.minFree) throw new Error('MINIMUM_FREE_SPACE_REACHED during optimization')
    await writeIfChanged(join(config.processedDir, relativePath), result.data)
    outputs[variant] = { relativePath, webPath: store.reference(relativePath).webPath, hash: sha256(result.data), width: result.info.width, height: result.info.height, bytes: result.data.length }
  }
  const result = { hash: download.hash, processingVersion, variants: outputs }
  await saveJson(path, result)
  return result
}

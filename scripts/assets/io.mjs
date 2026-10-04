import { createHash, randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { dirname } from 'node:path'
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
export async function readJson(path, fallback) { try { return JSON.parse(await readFile(path, 'utf8')) } catch (e) { if (e.code === 'ENOENT' && fallback !== undefined) return fallback; throw e } }
export async function writeIfChanged(path, bytes) {
  await mkdir(dirname(path), { recursive: true })
  try { if ((await readFile(path)).equals(Buffer.from(bytes))) return false } catch (e) { if (e.code !== 'ENOENT') throw e }
  const temporary = `${path}.${randomUUID()}.tmp`
  await writeFile(temporary, bytes); await rename(temporary, path); return true
}
export const saveJson = (path, value) => writeIfChanged(path, `${JSON.stringify(value)}\n`)

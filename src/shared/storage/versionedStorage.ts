import type { ValidationResult } from '../../data/core/index.ts'

export interface KeyStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
export type StorageIssue = 'unavailable' | 'corrupt' | 'future_version' | 'migration_failed' | 'write_failed' | 'invalid_value'
export interface StoredState<T> { value: T; persistence: 'persistent' | 'memory'; issue: StorageIssue | null }
export interface VersionedStorageOptions<T> {
  key: string; version: number; defaultValue: T; maxChars: number
  storage: () => KeyStorage
  validate: (value: unknown) => ValidationResult<T>
  migrate?: (value: unknown, fromVersion: number) => ValidationResult<T>
  legacy?: (raw: string) => ValidationResult<T>
}

export function createVersionedStorage<T>(options: VersionedStorageOptions<T>) {
  if (!options.key || !Number.isSafeInteger(options.version) || options.version < 1 || !Number.isSafeInteger(options.maxChars) || options.maxChars < 1 || !options.validate(options.defaultValue).valid) throw new Error('Invalid local storage contract')
  let memory = structuredClone(options.defaultValue)
  let issue: StorageIssue | null = null
  let memoryOnly = false
  let futureVersion = false
  let dirty = false
  const state = (): StoredState<T> => ({ value: structuredClone(memory), persistence: memoryOnly ? 'memory' : 'persistent', issue })
  const fallback = (reason: StorageIssue) => { issue = reason; memoryOnly = true; return state() }
  function persist(value: T): StoredState<T> {
    memory = structuredClone(value)
    dirty = true
    if (futureVersion) return fallback('future_version')
    let target: KeyStorage
    let existing: string | null
    try { target = options.storage(); existing = target.getItem(options.key) } catch { return fallback('unavailable') }
    if (existing !== null && existing.length > options.maxChars) return fallback('corrupt')
    if (existing !== null && existing.length <= options.maxChars) {
      try {
        const envelope: unknown = JSON.parse(existing)
        if (envelope && typeof envelope === 'object' && 'version' in envelope && typeof envelope.version === 'number' && envelope.version > options.version) {
          futureVersion = true
          return fallback('future_version')
        }
      } catch { /* An explicit save may replace corrupt data with a validated value. */ }
    }
    try {
      const encoded = JSON.stringify({ version: options.version, value })
      if (encoded.length > options.maxChars) return fallback('write_failed')
      target.setItem(options.key, encoded)
      memoryOnly = false; issue = null; dirty = false
      return state()
    } catch { return fallback('write_failed') }
  }
  function read(): StoredState<T> {
    // Preserve unsaved work; explicit retry/reset can recover persistence.
    if (memoryOnly) return state()
    let raw: string | null
    try { raw = options.storage().getItem(options.key) } catch { return fallback('unavailable') }
    if (raw === null) { memory = structuredClone(options.defaultValue); issue = null; return state() }
    if (raw.length > options.maxChars) return fallback('corrupt')
    try {
      const legacy = options.legacy?.(raw)
      if (legacy?.valid) return persist(legacy.value)
      const decoded: unknown = JSON.parse(raw)
      if (!decoded || typeof decoded !== 'object' || !('version' in decoded) || !('value' in decoded) || typeof decoded.version !== 'number' || !Number.isSafeInteger(decoded.version) || decoded.version < 1) return fallback('corrupt')
      if (decoded.version > options.version) { futureVersion = true; return fallback('future_version') }
      if (decoded.version < options.version) {
        const migrated = options.migrate?.(decoded.value, decoded.version)
        if (!migrated?.valid) return fallback('migration_failed')
        const checked = options.validate(migrated.value)
        return checked.valid ? persist(checked.value) : fallback('migration_failed')
      }
      const checked = options.validate(decoded.value)
      if (!checked.valid) return fallback('corrupt')
      memory = structuredClone(checked.value); issue = null
      return state()
    } catch { return fallback('corrupt') }
  }
  function write(input: unknown): StoredState<T> {
    const checked = options.validate(input)
    if (!checked.valid) { issue = 'invalid_value'; return state() }
    // Detect a future envelope even if the caller writes before its first read.
    if (!memoryOnly) read()
    return persist(checked.value)
  }
  function reset(): StoredState<T> {
    memory = structuredClone(options.defaultValue)
    try {
      options.storage().removeItem(options.key)
      futureVersion = false; memoryOnly = false; issue = null; dirty = false
      return state()
    } catch { return fallback('write_failed') }
  }
  return { read, write, reset, retry: () => {
    if (dirty) return persist(memory)
    memoryOnly = false; futureVersion = false
    return read()
  } }
}

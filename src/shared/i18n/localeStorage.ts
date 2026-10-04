import { enumeration } from '../../data/core/validation.ts'
import { createVersionedStorage } from '../storage/versionedStorage.ts'
import type { KeyStorage } from '../storage/versionedStorage.ts'

export const localeStorageKey = 'sky-guide-locale'
const validateLocale = enumeration(['vi', 'en'] as const)
export const createLocaleStorage = (storage: () => KeyStorage) => createVersionedStorage({
  key: localeStorageKey, version: 1, defaultValue: 'vi' as const, maxChars: 256,
  storage, validate: validateLocale, legacy: validateLocale,
})

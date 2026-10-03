import { join } from 'node:path'

// This adapter constructs references only. It never uploads. An operator can
// later sync processed/ into an owned bucket without changing content keys.
export function createAssetStore(config) {
  const baseUrl = config.publicBase ?? '/assets/items'
  return {
    kind: baseUrl.startsWith('/') ? 'local' : 'owned-object-storage',
    baseUrl,
    reference(relativePath) {
      if (!/^(thumbnails|cards|detail)\/[a-f0-9]{64}\.webp$/.test(relativePath)) throw new Error('Invalid storage key')
      return { localPath: join(config.processedDir, relativePath), webPath: `${baseUrl}/${relativePath}` }
    },
  }
}

import raw from '../../../data/public/tsa-v1-74007cf878ef/manifest.json' with { type: 'json' }
import { validateImportSummary, validateManifest } from './release.ts'

const manifest = validateManifest(raw)
const summary = validateImportSummary(raw.importReport)
export const catalogueSummary = manifest.valid && summary.valid ? { ...summary.value, generatedAt: manifest.value.generatedAt, version: manifest.value.catalogVersion, revision: raw.source.revision, repository: raw.source.repository } : null

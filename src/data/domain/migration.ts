import { failure, success, validateId } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import type { Item } from '../catalog/types.ts'
import type { EntityRef } from './identity.ts'

// Option IDs are item-scoped, matching the existing payload validator. This is a
// contract key, not a SQL migration or proof that deferred modules exist.
export function acquisitionOptionKey(itemId: string, optionId: string): ValidationResult<readonly [string, string]> {
  return validateId(itemId).valid && validateId(optionId).valid
    ? success([itemId, optionId] as const) : failure('invalid_value', 'Invalid acquisition identity.')
}
export function validateAcquisitionOptionKeys(items: readonly Pick<Item, 'id' | 'acquisitionOptions'>[]): ValidationResult<readonly (readonly [string, string])[]> {
  const seen = new Set<string>()
  const keys: (readonly [string, string])[] = []
  for (const item of items) for (const option of item.acquisitionOptions) {
    const key = acquisitionOptionKey(item.id, option.id)
    if (!key.valid) return key
    const encoded = JSON.stringify(key.value)
    if (seen.has(encoded)) return failure('duplicate_id', 'Duplicate item-scoped acquisition identity.')
    seen.add(encoded); keys.push(key.value)
  }
  return success(keys)
}

// Realm is a typed Location subtype with the SAME ID. Unknown geography cannot
// be resolved by names or by accepting an arbitrary location registry.
export function realmLocationRef(realmId: string | null, realmIds: ReadonlySet<string>): ValidationResult<EntityRef | null> {
  if (realmId === null) return success(null)
  if (!validateId(realmId).valid || !realmIds.has(realmId)) return failure('unknown_reference', 'Realm subtype reference must resolve.')
  return success({ kind: 'location', id: realmId })
}

type Preservation = `${'column' | 'join' | 'derived' | 'deferred' | 'future' | 'excluded'}:${string}`
// Review inventory, not dynamic persistence/EAV. Future DDL must implement these
// explicit owners and preserve nulls/order/source labels. Tests cover actual K15
// field coverage and canonical round-trip parity; no SQL execution is claimed.
export const migrationFieldOwnership: Record<string, Record<string, Preservation>> = {
  item: {
    id: 'column:item.id', sourceKeys: 'join:item_source_key + source_crosswalk',
    name: 'column:item.name_default + item_translation', slot: 'column:item.slot', rawSlot: 'column:item.raw_slot',
    accessoryAnchor: 'column:item.accessory_anchor', seasonIds: 'join:item_season(position)', spiritIds: 'join:item_spirit(position)',
    acquisitionOptions: 'join:acquisition_option(item_id,option_id,position)', assetIds: 'future:item_asset(position)',
    dyeRegions: 'future:item_dye_region(position,typed-schema)', dyeStatus: 'column:item.dye_status',
    ruleIds: 'future:item_compatibility_rule(position)', compatibility: 'future:item_compatibility(typed-schema)',
    provenanceIds: 'join:identity_provenance(position)', fieldProvenance: 'join:field_provenance(position)',
    updatedAt: 'column:domain_identity.updated_at', recordStatus: 'column:item.record_status', fixture: 'column:domain_identity.fixture',
  },
  acquisitionOption: {
    id: 'column:acquisition_option.option_id scoped by item_id', kind: 'column:acquisition_option.kind',
    costs: 'join:acquisition_cost(item_id,option_id,position)', costStatus: 'column:acquisition_option.cost_status',
    friendshipNodeId: 'deferred:acquisition_option.friendship_node_id exact domain ID',
    iapProductId: 'deferred:acquisition_option.iap_product_id exact domain ID',
    validFrom: 'column:acquisition_option.valid_from value/precision/timezone/raw_label',
    validTo: 'column:acquisition_option.valid_to value/precision/timezone/raw_label',
    provenanceIds: 'join:acquisition_provenance(item_id,option_id,position)',
  },
  lookup: {
    id: 'join:item.id', upstreamId: 'column:item_k15.upstream_id', identifier: 'column:item_k15.identifier',
    category: 'column:item_k15.category', categoryEvidence: 'column:item_k15.category_evidence',
    offers: 'join:acquisition_source_offer(item_id,option_id)', image: 'future:item_media compatibility image projection',
    images: 'future:item_media primary/reference projection',
  },
  offer: { id: 'join:acquisition_option.option_id scoped by item_id', acquisition: 'column:acquisition_source_offer.acquisition',
    seasonPass: 'column:acquisition_source_offer.season_pass', bundle: 'column:acquisition_source_offer.bundle',
    money: 'column:acquisition_source_offer.raw_money unknown currency/market', sourceUrl: 'column:acquisition_source_offer.source_url' },
  spirit: {
    id: 'column:spirit.id', name: 'column:spirit.name_default + spirit_translation', category: 'column:spirit.category',
    realmId: 'deferred:spirit.realm_id exact Realm subtype ID', seasonIds: 'join:spirit_season(position)', treeIds: 'future:spirit_tree(position)',
    provenanceIds: 'join:identity_provenance(position)', fieldProvenance: 'join:field_provenance(position)',
    updatedAt: 'column:domain_identity.updated_at', recordStatus: 'column:spirit.record_status', fixture: 'column:domain_identity.fixture',
  },
  season: {
    id: 'column:season.id', kind: 'column:season.kind', name: 'column:season.name_default + season_translation',
    startsAt: 'column:season.starts_at value/precision/timezone/raw_label', endsAt: 'column:season.ends_at value/precision/timezone/raw_label',
    timeStatus: 'column:season.time_status', summary: 'column:season.summary',
    spiritIds: 'join:season_spirit(position)', itemIds: 'join:season_item(position)', realmIds: 'future:season_realm(position)',
    mapIds: 'future:season_map(position)', officialArticleIds: 'future:season_article(position)',
    provenanceIds: 'join:identity_provenance(position)', fieldProvenance: 'join:field_provenance(position)',
    updatedAt: 'column:domain_identity.updated_at', recordStatus: 'column:season.record_status', fixture: 'column:domain_identity.fixture',
  },
  provenance: {
    id: 'column:provenance.id', sourceId: 'join:source_registry.id', sourceUrl: 'column:provenance.source_url',
    sourceRecordKey: 'column:provenance.source_record_key', sourceRevision: 'column:provenance.source_revision',
    retrievedAt: 'column:provenance.retrieved_at', observedAt: 'column:provenance.observed_at', attribution: 'column:provenance.attribution',
    licenseNote: 'column:provenance.license_note', transformNote: 'column:provenance.transform_note', verificationStatus: 'column:provenance.verification_status',
  },
  currencyAmount: { currency: 'column:acquisition_cost.currency', sourceCurrencyLabel: 'column:acquisition_cost.source_currency_label', amount: 'column:acquisition_cost.amount nullable integer' },
  partialTime: { value: 'column:typed time value', precision: 'column:typed time precision', timezone: 'column:typed time timezone', rawLabel: 'column:typed time raw_label' },
  localizedText: { default: 'column:owner.name_default', translations: 'join:owner_translation(locale,text)' },
  envelope: { schemaVersion: 'column:release_dataset.schema_version', dataVersion: 'column:release_dataset.data_version',
    generatedAt: 'column:release_dataset.generated_at', sourceIds: 'join:release_source(dataset,position)', records: 'derived:typed versioned public rows in preserved order', fixture: 'column:release_dataset.fixture false' },
  manifest: { schemaVersion: 'column:public_release.schema_version', catalogVersion: 'column:public_release.catalog_version',
    generatedAt: 'column:public_release.generated_at', datasets: 'join:release_dataset(path,data_version,sha256)',
    provenance: 'join:release_dataset provenance', aliases: 'future:alias versioned public projection', tombstones: 'future:tombstone versioned public projection',
    assetManifestVersion: 'future:release_media_version nullable', source: 'join:release_source_snapshot', importReport: 'column:release_import_summary typed counters' },
  snapshotSource: { repository: 'column:release_source_snapshot.repository', revision: 'column:release_source_snapshot.revision',
    normalizationVersion: 'column:release_source_snapshot.normalization_version', sourcePaths: 'join:release_source_path(position,path,git_blob_sha)',
    transport: 'column:release_source_snapshot.transport', status: 'column:release_source_snapshot.status' },
  sourcePath: { path: 'column:release_source_path.path', gitBlobSha: 'column:release_source_path.git_blob_sha' },
  importReport: { accepted: 'column:release_import_summary.accepted', excluded: 'column:release_import_summary.excluded',
    unknownCategory: 'column:release_import_summary.unknown_category', unknownCost: 'column:release_import_summary.unknown_cost', rejected: 'column:release_import_summary.rejected_empty only successful public K15 reports' },
  datasetEntry: { path: 'column:release_dataset.path', dataVersion: 'column:release_dataset.data_version', sha256: 'column:release_dataset.sha256 exact canonical bytes' },
}

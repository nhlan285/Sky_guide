import type { CurrencyAmount, DateTime, ID, PartialTime, Validator } from '../core/index.ts'

export interface CatalogContext {
  provenanceIds: ReadonlySet<ID>
  itemIds: ReadonlySet<ID>
  spiritIds: ReadonlySet<ID>
  treeIds: ReadonlySet<ID>
  nodeIds: ReadonlySet<ID>
  seasonIds: ReadonlySet<ID>
  realmIds: ReadonlySet<ID>
  mapIds: ReadonlySet<ID>
  articleIds: ReadonlySet<ID>
  assetIds: ReadonlySet<ID>
  ruleIds: ReadonlySet<ID>
  iapProductIds: ReadonlySet<ID>
  visitIds: ReadonlySet<ID>
}

export type FieldProvenance = Record<string, ID[]>
export interface DomainMetadata {
  provenanceIds: ID[]
  updatedAt: DateTime
  recordStatus: 'draft' | 'reviewed' | 'published' | 'retired'
  fixture: boolean
}
export interface LocalizedText {
  default: string
  translations: Record<string, string>
}
export type CostStatus = 'known' | 'unknown' | 'free'
export interface AcquisitionOption {
  id: ID
  kind: 'spirit_tree' | 'iap' | 'other' | 'unknown'
  costs: CurrencyAmount[]
  costStatus: CostStatus
  friendshipNodeId: ID | null
  iapProductId: ID | null
  validFrom: PartialTime | null
  validTo: PartialTime | null
  provenanceIds: ID[]
}

// Dye/compatibility schemas remain owned by P2-D04; supplied validators project them.
export interface ItemMetadataValidators<D extends object = object, C extends object = object> {
  dyeRegion?: Validator<D>
  compatibility?: Validator<C>
}
export interface Item<D extends object = object, C extends object = object> extends DomainMetadata {
  id: ID
  sourceKeys: Record<string, string>
  name: LocalizedText
  slot: 'mask' | 'hair' | 'cape' | 'top' | 'bottom' | 'accessory' | 'unknown'
  rawSlot: string | null
  accessoryAnchor: string | null
  seasonIds: ID[]
  spiritIds: ID[]
  acquisitionOptions: AcquisitionOption[]
  assetIds: ID[]
  dyeRegions: D[]
  dyeStatus: 'known' | 'unknown' | 'unsupported'
  ruleIds: ID[]
  compatibility: C | null
  fieldProvenance?: FieldProvenance
}
export interface Spirit extends DomainMetadata {
  id: ID
  name: LocalizedText
  category: 'regular' | 'seasonal' | 'unknown'
  realmId: ID | null
  seasonIds: ID[]
  treeIds: ID[]
  fieldProvenance?: FieldProvenance
}
export interface FriendshipTree extends DomainMetadata {
  id: ID
  spiritId: ID
  variant: 'regular' | 'traveling' | 'unknown'
  visitId: ID | null
  nodeIds: ID[]
  fieldProvenance?: FieldProvenance
}
export interface FriendshipNode extends DomainMetadata {
  id: ID
  treeId: ID
  itemId: ID | null
  label: string
  parentNodeIds: ID[]
  costs: CurrencyAmount[]
  costStatus: CostStatus
  optional: boolean | null
  fieldProvenance?: FieldProvenance
}
export interface SeasonEvent extends DomainMetadata {
  id: ID
  kind: 'season' | 'event'
  name: LocalizedText
  startsAt: PartialTime | null
  endsAt: PartialTime | null
  timeStatus: 'confirmed' | 'tentative' | 'unknown'
  summary: string | null
  spiritIds: ID[]
  itemIds: ID[]
  realmIds: ID[]
  mapIds: ID[]
  officialArticleIds: ID[]
  fieldProvenance: FieldProvenance
}
export type Season = SeasonEvent & { kind: 'season' }
export type Event = SeasonEvent & { kind: 'event' }
export interface TravelingSpiritVisit extends DomainMetadata {
  id: ID
  spiritId: ID
  startsAt: PartialTime
  endsAt: PartialTime | null
  status: 'confirmed' | 'disputed'
  treeId: ID | null
  fieldProvenance: FieldProvenance
}
export interface TravelingSpiritPrediction extends DomainMetadata {
  id: ID
  candidateSpiritIds: ID[]
  targetWindow: { start: PartialTime | null; end: PartialTime | null }
  methodDescription: string
  generatedAt: DateTime
  inputDataVersion: string
  confidenceLabel: string | null
  fieldProvenance?: FieldProvenance
}

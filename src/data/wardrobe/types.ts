import type { ID, DateTime } from '../core/index.ts'
import type { LocalizedText } from '../catalog/types.ts'

export const SLOTS = ['mask', 'hair', 'cape', 'top', 'bottom', 'accessory'] as const
export type Slot = typeof SLOTS[number]
export interface Asset {
  id: ID; kind: 'geometric_placeholder' | 'wiki_icon' | 'map_image' | 'paper_doll_layer' | 'model_3d'
  path: string | null; revision: string; sourceId: ID | null; provenanceIds: ID[]
  placeholder: boolean; fixture: boolean
  legalStatus: 'self_created_placeholder' | 'pending_legal_confirmation' | 'permission_confirmed' | 'not_permitted'
  rightsEvidenceRef: string | null; credit: string; renderer: 'svg' | 'image_2d' | 'future_3d'; capabilities: string[]
}
export interface SlotPolicy { slot: Slot; maxItems: number; overflow: 'reject' }
export interface WardrobeConfig {
  id: ID; revision: string; modelId: ID; modelRevision: string
  slotPolicies: SlotPolicy[]; silhouetteBindingIds: ID[]; fixture: boolean
}
export interface SizeEntry {
  code: string; modelId: ID; modelRevision: string; scaleX: number; scaleY: number
  fixture: boolean; provenanceIds: ID[]
}
export interface LayerBinding {
  id: ID; revision: string; itemId: ID | null; modelId: ID; modelRevision: string
  slot: Slot; anchorName: string; assetId: ID; assetRevision: string
  pivotX: number; pivotY: number; scale: number; rotationDeg: number; zIndex: number
  calibrationRevision: string; fixture: boolean; provenanceIds: ID[]
}
export interface AnchorEntry {
  id: ID; modelId: ID; modelRevision: string; sizeCode: string; slot: Slot; anchorName: string
  assetId: ID; assetRevision: string; bindingId: ID; bindingRevision: string
  calibrationRevision: string; x: number; y: number; fixture: boolean; provenanceIds: ID[]
}
export interface WardrobeRule {
  id: ID; triggerItemIds: ID[]; effect: 'set_effective_size' | 'reject_combination'
  targetSizeCode: string | null; priority: number; reason: string; fixture: boolean; provenanceIds: ID[]
}
export interface DyeRegion {
  id: ID; label: LocalizedText; maskAssetId: ID | null
  allowedColors: string[] | null; support: 'known' | 'demo' | 'unknown'
}
// An editor projection, independent of catalog prices/acquisition/source claims.
export interface WardrobeItem {
  id: ID; name: LocalizedText; slot: Slot; assetIds: ID[]; dyeRegions: DyeRegion[]; fixture: boolean
}
export interface WardrobePackage {
  id: ID; revision: string; config: WardrobeConfig; assets: Asset[]; items: WardrobeItem[]
  sizes: SizeEntry[]; anchors: AnchorEntry[]; bindings: LayerBinding[]; rules: WardrobeRule[]
}
export interface WardrobeSelection {
  schemaVersion: number; baseSizeCode: string
  equippedBySlot: Record<Slot, ID[]>; dyeByItemRegion: Record<ID, Record<ID, string>>
}
export interface OutfitSnapshot extends WardrobeSelection {
  catalogVersion: string; id: ID | null; name: string | null; savedAt: DateTime | null
}
export interface WardrobeContext { provenanceIds: ReadonlySet<ID>; sourceIds: ReadonlySet<ID> }

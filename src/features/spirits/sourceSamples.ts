import reviewed from './reviewed-samples.json' with { type: 'json' }
import { calculateFriendshipPath } from '../../data/catalog/friendshipInput.ts'
import { validateFriendshipGraph } from '../../data/catalog/friendship.ts'
import type { CatalogContext } from '../../data/catalog/types.ts'

// Source-scoped research samples. No canonical catalogue ID/crosswalk, published
// release, item FK, historical end instant or image permission is invented.
const treeId = 'wiki-k02-pointing-110293-regular'
const spiritId = 'wiki-k02-pointing-candlemaker'
const provenanceId = 'wiki-k02-reviewed-20261005'
const nodeId = (key: string) => `${treeId}-${key.toLowerCase()}`
const meta = { fixture: false, recordStatus: 'draft', updatedAt: '2026-10-05T00:14:11.687Z', provenanceIds: [provenanceId] }
export const sourceTreeContext: CatalogContext = {
  provenanceIds: new Set([provenanceId]), spiritIds: new Set([spiritId]), itemIds: new Set(),
  treeIds: new Set(), nodeIds: new Set(), seasonIds: new Set(), realmIds: new Set(), mapIds: new Set(),
  articleIds: new Set(), assetIds: new Set(), ruleIds: new Set(), iapProductIds: new Set(), visitIds: new Set(),
}
const rawGraph = {
  trees: [{ ...meta, id: treeId, spiritId, variant: 'regular', visitId: null, nodeIds: reviewed.sample.nodes.map(node => nodeId(node.sourceNodeKey)) }],
  nodes: reviewed.sample.nodes.map(node => ({
    ...meta, id: nodeId(node.sourceNodeKey), treeId, itemId: null, label: node.rawValue,
    parentNodeIds: node.parentSourceNodeKeys.map(nodeId), costs: node.costs,
    costStatus: node.costStatus, optional: node.optional,
    fieldProvenance: { parentNodeIds: [provenanceId], costs: [provenanceId] },
  })),
}
const parsed = validateFriendshipGraph(rawGraph, sourceTreeContext)
if (!parsed.valid) throw new Error('Invalid reviewed source tree sample.')
export const sourceTree = parsed.value
export const treeSample = reviewed.sample
export const treeSourceUrl = reviewed.treeSourceUrl
export const sourceVisits = reviewed.visits.map(visit => ({ ...visit, id: `wiki-k03-leaping-${visit.sourceVisitKey.toLowerCase().replace('#', '-')}` }))
export const visitSourceUrl = reviewed.visitSourceUrl
export const sampleAttribution = reviewed.attribution.textSource
export const sampleLicenseNote = reviewed.attribution.licenseNote
export const sourceNodeKey = (id: string) => reviewed.sample.nodes.find(node => nodeId(node.sourceNodeKey) === id)?.sourceNodeKey ?? id
export function estimateSourcePath(ids: string[]) {
  return calculateFriendshipPath(sourceTree, sourceTreeContext, { treeId, nodeIds: ids })
}

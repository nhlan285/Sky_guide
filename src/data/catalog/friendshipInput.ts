import { failure, object, success, validateId } from '../core/index.ts'
import type { CurrencyAmount, ID, ValidationError, ValidationResult } from '../core/index.ts'
import { validateFriendshipGraph } from './friendship.ts'
import type { FriendshipGraph } from './friendship.ts'
import type { CatalogContext } from './types.ts'
import { array, reference } from './shared.ts'

export interface FriendshipInput {
  schemaVersion: 1
  graph: FriendshipGraph
}

/** Accept parsed manual JSON, never infer canonical IDs, edges or prices. */
export function validateFriendshipInput(input: unknown, context: CatalogContext): ValidationResult<FriendshipInput> {
  const result = object<FriendshipInput>(input, {
    schemaVersion: value => value === 1 ? success(1) : failure('invalid_value', 'Unsupported friendship input version.'),
    graph: value => validateFriendshipGraph(value, context),
  })
  if (!result.valid) return result
  if (!result.value.graph.trees.length || !result.value.graph.nodes.length) {
    return failure('invalid_value', 'Manual input requires a nonempty tree and node bundle.')
  }
  const errors: ValidationError[] = []
  for (const key of ['trees', 'nodes'] as const) {
    result.value.graph[key].forEach((record, index) => {
      if (record.recordStatus !== 'draft') errors.push({
        path: ['graph', key, index, 'recordStatus'], code: 'invalid_value',
        message: 'Manual input must stage draft records; validation does not approve publication.',
      })
    })
  }
  return errors.length ? { valid: false, errors } : result
}

interface PathSelection {
  treeId: ID
  nodeIds: ID[]
}

export interface FriendshipPathCost {
  treeId: ID
  selectedNodeIds: ID[]
  includedNodeIds: ID[]
  knownSubtotal: Array<CurrencyAmount & { amount: number }>
  complete: boolean
  missingCostNodeIds: ID[]
}

/** Revalidate at the boundary. A subtotal is never a conversion or official price. */
export function calculateFriendshipPath(
  input: unknown, context: CatalogContext, selection: unknown,
): ValidationResult<FriendshipPathCost> {
  const graph = validateFriendshipGraph(input, context)
  if (!graph.valid) return graph
  const { trees, nodes } = graph.value
  const selected = object<PathSelection>(selection, {
    treeId: reference(new Set(trees.map(tree => tree.id))),
    nodeIds: array(validateId),
  })
  if (!selected.valid) return selected
  if (!selected.value.nodeIds.length) return failure('invalid_value', 'Select at least one node for a path estimate.')
  const nodeMap = new Map(nodes.map(node => [node.id, node]))
  const errors: ValidationError[] = []
  selected.value.nodeIds.forEach((id, index) => {
    const node = nodeMap.get(id)
    if (!node || node.treeId !== selected.value.treeId) errors.push({
      path: ['nodeIds', index], code: node ? 'invalid_relationship' : 'unknown_reference',
      message: 'Selected node must exist in the selected tree.',
    })
  })
  if (errors.length) return { valid: false, errors }

  const included = new Set<ID>()
  const pending = [...selected.value.nodeIds]
  while (pending.length) {
    const id = pending.pop()!
    if (included.has(id)) continue
    included.add(id)
    for (const parent of nodeMap.get(id)!.parentNodeIds) pending.push(parent)
  }
  const totals = new Map<string, CurrencyAmount & { amount: number }>()
  const missing: ID[] = []
  const includedNodeIds = [...included].sort()
  for (const id of includedNodeIds) {
    const node = nodeMap.get(id)!
    if (node.costStatus === 'unknown' || node.costs.some(cost => cost.amount === null)) missing.push(id)
    for (const cost of node.costs) {
      if (cost.amount === null) continue
      // Raw labels distinguish AC, event currencies and unreviewed aliases.
      const key = JSON.stringify([cost.currency, cost.sourceCurrencyLabel])
      const amount = (totals.get(key)?.amount ?? 0) + cost.amount
      if (!Number.isSafeInteger(amount)) return failure('invalid_value', 'Path subtotal exceeds safe integer precision.')
      totals.set(key, { ...cost, amount })
    }
  }
  return success({
    treeId: selected.value.treeId,
    selectedNodeIds: [...new Set(selected.value.nodeIds)].sort(),
    includedNodeIds,
    knownSubtotal: [...totals.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([, cost]) => cost),
    complete: !missing.length,
    missingCostNodeIds: missing,
  })
}

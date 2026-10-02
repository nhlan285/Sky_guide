import { enumeration, nullable, object, success, validateCurrencyAmount, validateId, validateString } from '../core/index.ts'
import type { ID, ValidationError, ValidationResult } from '../core/index.ts'
import type { CatalogContext, FriendshipNode, FriendshipTree } from './types.ts'
import { array, boolean, costsConsistent, metadataFields, reference, references, unique, withFieldProvenance } from './shared.ts'

export function validateFriendshipTree(input: unknown, context: CatalogContext): ValidationResult<FriendshipTree> {
  return withFieldProvenance(input, object<Omit<FriendshipTree, 'fieldProvenance'>>(input, {
    ...metadataFields(input, context),
    id: validateId,
    spiritId: reference(context.spiritIds),
    variant: enumeration(['regular', 'traveling', 'unknown']),
    visitId: nullable(reference(context.visitIds)),
    nodeIds: references(context.nodeIds),
  }), context)
}
export function validateFriendshipNode(input: unknown, context: CatalogContext): ValidationResult<FriendshipNode> {
  return withFieldProvenance(input, costsConsistent(object<Omit<FriendshipNode, 'fieldProvenance'>>(input, {
    ...metadataFields(input, context),
    id: validateId,
    treeId: reference(context.treeIds),
    itemId: nullable(reference(context.itemIds)),
    label: validateString,
    parentNodeIds: references(context.nodeIds),
    costs: array(validateCurrencyAmount),
    costStatus: enumeration(['known', 'unknown', 'free']),
    optional: nullable(boolean),
  })), context)
}
export interface FriendshipGraph {
  trees: FriendshipTree[]
  nodes: FriendshipNode[]
}

// Bootstrap only IDs from this bundle; full validators still validate every record.
function bundleIds(input: unknown, key: string): ReadonlySet<ID> {
  const ids = new Set<ID>()
  if (input === null || typeof input !== 'object' || !Object.hasOwn(input, key)) return ids
  const entries = Reflect.get(input, key)
  if (!Array.isArray(entries)) return ids
  for (const entry of entries) {
    if (entry === null || typeof entry !== 'object' || !Object.hasOwn(entry, 'id')) continue
    const result = validateId(Reflect.get(entry, 'id'))
    if (result.valid) ids.add(result.value)
  }
  return ids
}
export function validateFriendshipGraph(input: unknown, context: CatalogContext): ValidationResult<FriendshipGraph> {
  const localContext = { ...context, treeIds: bundleIds(input, 'trees'), nodeIds: bundleIds(input, 'nodes') }
  const result = object<FriendshipGraph>(input, {
    trees: unique(value => validateFriendshipTree(value, localContext)),
    nodes: unique(value => validateFriendshipNode(value, localContext)),
  })
  if (!result.valid) return result
  const { trees, nodes } = result.value
  const treeMap = new Map(trees.map(tree => [tree.id, tree]))
  const nodeMap = new Map(nodes.map((node, index) => [node.id, { node, index }]))
  const errors: ValidationError[] = []
  for (const [index, tree] of trees.entries()) {
    for (const [nodeIndex, id] of tree.nodeIds.entries()) {
      if (nodeMap.get(id)?.node.treeId !== tree.id) errors.push({
        path: ['trees', index, 'nodeIds', nodeIndex], code: 'invalid_relationship',
        message: 'Listed node must belong to this tree.',
      })
    }
  }
  for (const [index, node] of nodes.entries()) {
    if (!treeMap.get(node.treeId)?.nodeIds.includes(node.id)) errors.push({
      path: ['nodes', index, 'treeId'], code: 'invalid_relationship',
      message: 'Node must be listed by its owning tree.',
    })
    for (const [parentIndex, id] of node.parentNodeIds.entries()) {
      if (nodeMap.get(id)?.node.treeId !== node.treeId) errors.push({
        path: ['nodes', index, 'parentNodeIds', parentIndex], code: 'invalid_relationship',
        message: 'Parent must belong to the same tree.',
      })
    }
  }
  // Iterative DFS prevents stack overflow on long chains and reports back-edge paths.
  const state = new Map<ID, 'visiting' | 'done'>()
  for (const [rootIndex, root] of nodes.entries()) {
    if (state.has(root.id)) continue
    state.set(root.id, 'visiting')
    const stack = [{ node: root, index: rootIndex, nextParent: 0 }]
    while (stack.length) {
      const frame = stack[stack.length - 1]
      if (frame.nextParent >= frame.node.parentNodeIds.length) {
        state.set(frame.node.id, 'done')
        stack.pop()
        continue
      }
      const parentIndex = frame.nextParent++
      const parent = nodeMap.get(frame.node.parentNodeIds[parentIndex])
      if (!parent || parent.node.treeId !== frame.node.treeId) continue
      if (state.get(parent.node.id) === 'visiting') errors.push({
        path: ['nodes', frame.index, 'parentNodeIds', parentIndex],
        code: 'cyclic_graph', message: 'Parent relationship creates a cycle, including self-parenting.',
      })
      else if (!state.has(parent.node.id)) {
        state.set(parent.node.id, 'visiting')
        stack.push({ node: parent.node, index: parent.index, nextParent: 0 })
      }
    }
  }
  return errors.length ? { valid: false, errors } : success(result.value)
}

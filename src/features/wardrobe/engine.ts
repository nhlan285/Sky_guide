import { SLOTS, validateSelection } from '../../data/wardrobe/index.ts'
import { validateCompatibleOutfitSnapshot } from './compatibility.ts'
import type { Slot, WardrobePackage, WardrobeSelection } from '../../data/wardrobe/index.ts'

export type WardrobeIssue = 'invalid_action' | 'capacity_exceeded' | 'invalid_dye' | 'rejected_combination' | 'rule_conflict' | 'revision_mismatch'
export interface WardrobeState {
  selection: WardrobeSelection; configRevision: string; packageRevision: string
  effectiveSizeCode: string; appliedRuleIds: string[]; issue: WardrobeIssue | null; issueRuleIds: string[]
}
export type WardrobeAction =
  | { type: 'restore_outfit'; snapshot: unknown }
  | { type: 'equip'; slot: Slot; itemId: string }
  | { type: 'replace'; slot: Slot; itemId: string; replacedItemId: string }
  | { type: 'unequip'; slot: Slot; itemId: string }
  | { type: 'reset_slot'; slot: Slot }
  | { type: 'reset_outfit' }
  | { type: 'set_base_size'; sizeCode: string }
  | { type: 'set_dye'; itemId: string; regionId: string; color: string }
  | { type: 'reset_region'; itemId: string; regionId: string }
  | { type: 'reset_item_colors'; itemId: string }
  | { type: 'random_outfit'; seed: number }

export const compareIds = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0
export function resolveRules(selection: WardrobeSelection, pkg: WardrobePackage) {
  const equipped = new Set(Object.values(selection.equippedBySlot).flat())
  const active = pkg.rules.filter(rule => rule.triggerItemIds.every(id => equipped.has(id)))
    .sort((a, b) => b.priority - a.priority || compareIds(a.id, b.id))
  const sizes = active.filter(rule => rule.effect === 'set_effective_size')
  // Stable preview selection does not make a rule conflict valid.
  const conflict = sizes.some((rule, index) => sizes.slice(index + 1).some(other => rule.priority === other.priority && rule.targetSizeCode !== other.targetSizeCode))
  return {
    effectiveSizeCode: sizes[0]?.targetSizeCode ?? selection.baseSizeCode,
    appliedRuleIds: active.map(rule => rule.id),
    issue: conflict ? 'rule_conflict' as const : active.some(rule => rule.effect === 'reject_combination') ? 'rejected_combination' as const : null,
  }
}
export function createWardrobeState(pkg: WardrobePackage, baseSizeCode: string): WardrobeState {
  const selection: WardrobeSelection = {
    schemaVersion: 1, baseSizeCode, equippedBySlot: { mask: [], hair: [], cape: [], top: [], bottom: [], accessory: [] }, dyeByItemRegion: {},
  }
  if (!validateSelection(selection, pkg).valid) throw new Error('Invalid initial wardrobe configuration.')
  return { selection, configRevision: pkg.config.revision, packageRevision: pkg.revision, issueRuleIds: [], ...resolveRules(selection, pkg) }
}
function withoutColors(colors: WardrobeSelection['dyeByItemRegion'], ids: readonly string[]) {
  return Object.fromEntries(Object.entries(colors).filter(([id]) => !ids.includes(id)))
}

export function wardrobeReducer(state: WardrobeState, action: WardrobeAction, pkg: WardrobePackage): WardrobeState {
  const reject = (issue: WardrobeIssue, issueRuleIds: string[] = []): WardrobeState => ({ ...state, issue, issueRuleIds })
  if (state.configRevision !== pkg.config.revision || state.packageRevision !== pkg.revision) return reject('revision_mismatch')
  let selection = state.selection
  if ('slot' in action && !SLOTS.includes(action.slot)) return reject('invalid_action')
  switch (action.type) {
    case 'restore_outfit': {
      const restored = validateCompatibleOutfitSnapshot(action.snapshot, pkg)
      if (!restored.valid) return reject('invalid_action')
      const { schemaVersion, baseSizeCode, equippedBySlot, dyeByItemRegion } = restored.value
      selection = { schemaVersion, baseSizeCode, equippedBySlot, dyeByItemRegion }
      break
    }
    case 'equip':
    case 'replace': {
      const item = pkg.items.find(entry => entry.id === action.itemId && entry.slot === action.slot)
      const policy = pkg.config.slotPolicies.find(entry => entry.slot === action.slot)
      if (!item || !policy) return reject('invalid_action')
      const ids = selection.equippedBySlot[action.slot]
      if (ids.includes(item.id)) return { ...state, issue: null, issueRuleIds: [] }
      if (action.type === 'replace' && !ids.includes(action.replacedItemId)) return reject('invalid_action')
      if (action.type === 'equip' && ids.length >= policy.maxItems) return reject('capacity_exceeded')
      const next = action.type === 'replace' ? ids.map(id => id === action.replacedItemId ? item.id : id) : [...ids, item.id]
      selection = { ...selection, equippedBySlot: { ...selection.equippedBySlot, [action.slot]: next } }
      break
    }
    case 'unequip': {
      if (!selection.equippedBySlot[action.slot].includes(action.itemId)) return reject('invalid_action')
      selection = { ...selection, equippedBySlot: { ...selection.equippedBySlot, [action.slot]: selection.equippedBySlot[action.slot].filter(id => id !== action.itemId) } }
      break
    }
    case 'reset_slot': {
      selection = { ...selection, dyeByItemRegion: withoutColors(selection.dyeByItemRegion, pkg.items.filter(item => item.slot === action.slot).map(item => item.id)), equippedBySlot: { ...selection.equippedBySlot, [action.slot]: [] } }
      break
    }
    case 'reset_outfit': return createWardrobeState(pkg, selection.baseSizeCode)
    case 'set_base_size': selection = { ...selection, baseSizeCode: action.sizeCode }; break
    case 'set_dye': {
      if (typeof action.color !== 'string' || !Object.values(selection.equippedBySlot).flat().includes(action.itemId)) return reject('invalid_dye')
      selection = { ...selection, dyeByItemRegion: { ...selection.dyeByItemRegion,
        [action.itemId]: { ...selection.dyeByItemRegion[action.itemId], [action.regionId]: action.color.toLowerCase() } } }
      break
    }
    case 'reset_region': {
      if (!pkg.items.some(item => item.id === action.itemId && item.dyeRegions.some(region => region.id === action.regionId))) return reject('invalid_dye')
      const regions = Object.fromEntries(Object.entries(selection.dyeByItemRegion[action.itemId] ?? {}).filter(([id]) => id !== action.regionId))
      selection = { ...selection, dyeByItemRegion: Object.keys(regions).length
        ? { ...selection.dyeByItemRegion, [action.itemId]: regions } : withoutColors(selection.dyeByItemRegion, [action.itemId]) }
      break
    }
    case 'reset_item_colors': {
      if (!pkg.items.some(item => item.id === action.itemId)) return reject('invalid_dye')
      selection = { ...selection, dyeByItemRegion: withoutColors(selection.dyeByItemRegion, [action.itemId]) }
      break
    }
    case 'random_outfit': {
      if (!Number.isSafeInteger(action.seed)) return reject('invalid_action')
      // Seeded choices are repeatable. Every candidate still passes capacity/rules.
      let seed = action.seed >>> 0
      let next = createWardrobeState(pkg, selection.baseSizeCode)
      for (const slot of SLOTS) {
        const options = pkg.items.filter(item => item.slot === slot)
        if (!options.length) continue
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        const start = seed % options.length
        for (let index = 0; index < options.length; index++) {
          const candidate = wardrobeReducer(next, { type: 'equip', slot, itemId: options[(start + index) % options.length].id }, pkg)
          if (candidate.issue === null) { next = candidate; break }
        }
      }
      return next
    }
    default: return reject('invalid_action')
  }
  const validation = validateSelection(selection, pkg)
  if (!validation.valid) return reject(action.type === 'set_dye' || action.type === 'reset_region' ? 'invalid_dye' : 'invalid_action')
  const resolved = resolveRules(validation.value, pkg)
  if (resolved.issue) return reject(resolved.issue, resolved.appliedRuleIds)
  return { ...state, selection: validation.value, issueRuleIds: [], ...resolved }
}

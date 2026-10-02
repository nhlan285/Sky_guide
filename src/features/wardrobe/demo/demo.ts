import raw from './manifest.json'
import type { WardrobePackage } from '../../../data/wardrobe/index.ts'
import { validateDemoManifest } from './validation.ts'
import type { DemoGeometry } from './validation.ts'

// Explicit production demo entry point. Never reads test fixtures/public catalog.
const result = validateDemoManifest(raw)
if (!result.valid) throw new Error('Invalid self-created wardrobe demo package.')
export const demoPackage: WardrobePackage = result.value
export const demoGeometry: ReadonlyMap<string, DemoGeometry> = new Map(result.value.geometry.map(entry => [entry.assetId, entry]))
export const demoDefaultSize = 'fixture-demo-size-2'
export const demoPalette = ['#6599a2', '#d5ab78', '#b28691', '#7f8fba', '#a7b99a', '#e5ded2'] as const

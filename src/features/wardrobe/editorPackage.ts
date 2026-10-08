import pilot from './catalog-pilot.json' with { type: 'json' }
import { demoPackage, demoGeometry } from './demo/demo.ts'
import { buildCatalogPilot } from './catalogPilot.ts'

const result = buildCatalogPilot(demoPackage, demoGeometry, pilot.records)
export const editorPackage = result.pkg
export const editorGeometry = result.geometry

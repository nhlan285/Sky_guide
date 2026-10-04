import { enumeration, failure, nullable, object, success, validateId, validateString } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import type { CatalogContext, DomainMetadata, LocalizedText } from './types.ts'
import { metadataFields, nonBlank, reference, references, unique, validateLocalizedText } from './shared.ts'

export interface Realm extends DomainMetadata { id: string; name: LocalizedText }
export interface GuideMap extends Realm {
  realmId: string | null; seasonIds: string[]; assetId: string | null; revision: string
  coordinateSystem: 'normalized_top_left' | 'none'; width: number | null; height: number | null
}
export interface MapMarker extends DomainMetadata {
  id: string; mapId: string; mapRevision: string; kind: 'shrine' | 'child_of_light' | 'route_point'
  label: LocalizedText; x: number | null; y: number | null; description: string | null
}
export interface GuideRoute extends DomainMetadata {
  id: string; title: LocalizedText; realmIds: string[]; seasonIds: string[]; mapIds: string[]
  scope: 'eden' | 'season' | 'other'; stepIds: string[]; contentVersion: string
  verifiedForVersion: string | null; spoilerLevel: 'none' | 'spoiler'
}
export interface RouteStep extends DomainMetadata {
  id: string; routeId: string; order: number; body: string; mapMarkerId: string | null
  sourceTimestamp: string | null; caution: string | null
}
export interface Geography { realms: Realm[]; maps: GuideMap[]; markers: MapMarker[]; routes: GuideRoute[]; steps: RouteStep[] }
const positive = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value > 0 ? success(value) : failure('invalid_value', 'Expected a finite positive dimension.')
const coordinate = (value: unknown) => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? success(value) : failure('invalid_value', 'Expected a normalized coordinate.')
const order = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? success(value) : failure('invalid_value', 'Expected nonnegative step order.')

export function validateRealm(input: unknown, context: CatalogContext): ValidationResult<Realm> {
  return object<Realm>(input, { ...metadataFields(input, context), id: validateId, name: validateLocalizedText })
}
export function validateGuideMap(input: unknown, context: CatalogContext): ValidationResult<GuideMap> {
  const result = object<GuideMap>(input, { ...metadataFields(input, context), id: validateId, name: validateLocalizedText,
    realmId: nullable(reference(context.realmIds)), seasonIds: references(context.seasonIds), assetId: nullable(reference(context.assetIds)),
    revision: nonBlank, coordinateSystem: enumeration(['normalized_top_left', 'none']), width: nullable(positive), height: nullable(positive) })
  if (!result.valid) return result
  if ((result.value.width === null) !== (result.value.height === null)) return failure('invalid_relationship', 'Map dimensions must be both known or both unknown.')
  return result
}
export function validateMapMarker(input: unknown, context: CatalogContext, maps: ReadonlyMap<string, GuideMap>): ValidationResult<MapMarker> {
  const result = object<MapMarker>(input, { ...metadataFields(input, context), id: validateId, mapId: reference(new Set(maps.keys())), mapRevision: nonBlank,
    kind: enumeration(['shrine', 'child_of_light', 'route_point']), label: validateLocalizedText, x: nullable(coordinate), y: nullable(coordinate), description: nullable(validateString) })
  if (!result.valid) return result
  const value = result.value
  const map = maps.get(value.mapId)!
  if (value.mapRevision !== map.revision) return failure('invalid_relationship', 'Marker calibration belongs to another map revision.')
  if ((value.x === null) !== (value.y === null)) return failure('invalid_relationship', 'Marker coordinates must be both known or both unknown.')
  if (value.x !== null && (map.coordinateSystem === 'none' || map.assetId === null)) return failure('invalid_relationship', 'Text-only map cannot carry calibrated image coordinates.')
  return result
}
export function validateGuideRoute(input: unknown, context: CatalogContext, stepIds: ReadonlySet<string>): ValidationResult<GuideRoute> {
  return object<GuideRoute>(input, { ...metadataFields(input, context), id: validateId, title: validateLocalizedText,
    realmIds: references(context.realmIds), seasonIds: references(context.seasonIds), mapIds: references(context.mapIds),
    scope: enumeration(['eden', 'season', 'other']), stepIds: references(stepIds), contentVersion: nonBlank,
    verifiedForVersion: nullable(nonBlank), spoilerLevel: enumeration(['none', 'spoiler']) })
}
export function validateRouteStep(input: unknown, context: CatalogContext, routes: ReadonlyMap<string, GuideRoute>, markers: ReadonlyMap<string, MapMarker>): ValidationResult<RouteStep> {
  const result = object<RouteStep>(input, { ...metadataFields(input, context), id: validateId, routeId: reference(new Set(routes.keys())),
    order, body: nonBlank, mapMarkerId: nullable(reference(new Set(markers.keys()))), sourceTimestamp: nullable(validateString), caution: nullable(validateString) })
  if (!result.valid) return result
  const value = result.value
  if (value.mapMarkerId && !routes.get(value.routeId)!.mapIds.includes(markers.get(value.mapMarkerId)!.mapId)) return failure('invalid_relationship', 'Step marker must belong to a map on its route.')
  return result
}

export function validateGeography(input: unknown, context: CatalogContext): ValidationResult<Geography> {
  if (!input || typeof input !== 'object') return failure('invalid_type', 'Expected geography bundle.')
  const source = input as Record<string, unknown>
  const ids = (values: unknown): Set<string> => new Set(Array.isArray(values) ? values.flatMap(value => value && typeof value === 'object' && typeof value.id === 'string' ? [value.id] : []) : [])
  const local = { ...context, realmIds: ids(source.realms), mapIds: ids(source.maps) }
  const realms = unique(value => validateRealm(value, local))(source.realms)
  const maps = unique(value => validateGuideMap(value, local))(source.maps)
  if (!realms.valid) return realms
  if (!maps.valid) return maps
  const markers = unique(value => validateMapMarker(value, local, new Map(maps.value.map(map => [map.id, map]))))(source.markers)
  const routes = unique(value => validateGuideRoute(value, local, ids(source.steps)))(source.routes)
  if (!markers.valid) return markers
  if (!routes.valid) return routes
  const steps = unique(value => validateRouteStep(value, local, new Map(routes.value.map(route => [route.id, route])), new Map(markers.value.map(marker => [marker.id, marker]))))(source.steps)
  if (!steps.valid) return steps
  for (const route of routes.value) {
    const members = steps.value.filter(step => step.routeId === route.id)
    if (members.length !== route.stepIds.length || members.some(step => !route.stepIds.includes(step.id)) || new Set(members.map(step => step.order)).size !== members.length) return failure('invalid_relationship', 'Route step membership/order must be unique and consistent in both directions.')
    const sorted = [...members].sort((a, b) => a.order - b.order).map(step => step.id)
    if (sorted.some((id, index) => route.stepIds[index] !== id)) return failure('invalid_relationship', 'Route step list disagrees with step order.')
  }
  return success({ realms: realms.value, maps: maps.value, markers: markers.value, routes: routes.value, steps: steps.value })
}

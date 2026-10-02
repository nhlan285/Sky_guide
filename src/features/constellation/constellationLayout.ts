import type { ViewportClass } from './starGeneration.ts'

export type FeatureId = 'items' | 'ts' | 'seasons' | 'wardrobe' | 'maps' | 'news' | 'events'
export const features: readonly FeatureId[] = ['items', 'ts', 'seasons', 'wardrobe', 'maps', 'news', 'events']
export const destinations: Record<FeatureId, string> = {
  items: 'item-lookup', ts: 'traveling-spirit', seasons: 'season-event',
  wardrobe: 'wardrobe', maps: 'maps-routes', news: 'official-news', events: 'season-event',
}
export const edges: readonly (readonly [FeatureId, FeatureId])[] = [
  ['ts', 'items'], ['items', 'seasons'], ['wardrobe', 'maps'], ['news', 'events'],
]
type Point = readonly [number, number]
interface Composition {
  width: number; height: number; title: Point; nodes: Record<FeatureId, Point>
}
export const compositions: Record<ViewportClass, Composition> = {
  compact: {
    width: 360, height: 930, title: [180, 600],
    nodes: { items: [70, 220], ts: [185, 145], seasons: [120, 315], wardrobe: [290, 390], maps: [220, 470], news: [85, 755], events: [235, 815] },
  },
  tablet: {
    width: 800, height: 900, title: [390, 530],
    nodes: { items: [140, 240], ts: [290, 170], seasons: [200, 350], wardrobe: [650, 290], maps: [620, 410], news: [570, 720], events: [680, 780] },
  },
  wide: {
    width: 1200, height: 800, title: [600, 425],
    nodes: { items: [250, 240], ts: [410, 150], seasons: [330, 345], wardrobe: [935, 275], maps: [850, 410], news: [815, 620], events: [980, 660] },
  },
}

export function connectionPath(from: Point, to: Point) {
  const bend = (to[0] - from[0]) * 0.04
  return `M ${from[0]} ${from[1]} Q ${(from[0] + to[0]) / 2 + bend} ${(from[1] + to[1]) / 2 - bend} ${to[0]} ${to[1]}`
}

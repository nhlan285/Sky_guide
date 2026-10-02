import type { ViewportClass } from './starGeneration.ts'

export type FeatureId = 'items' | 'ts' | 'seasons' | 'wardrobe' | 'maps' | 'news' | 'events'
export const features: readonly FeatureId[] = ['items', 'ts', 'seasons', 'wardrobe', 'maps', 'news', 'events']
export const destinations: Record<FeatureId, string> = {
  items: '/items', ts: '/hub#traveling-spirit', seasons: '/hub#season-event',
  wardrobe: '/wardrobe', maps: '/hub#maps-routes', news: '/hub#official-news', events: '/hub#season-event',
}
export const edges: readonly (readonly [FeatureId, FeatureId])[] = [
  ['ts', 'items'], ['items', 'seasons'], ['wardrobe', 'maps'], ['news', 'events'],
]
type Point = readonly [number, number]
interface Composition {
  width: number; height: number; title: Point; nodes: Record<FeatureId, Point>
}
export type CompositionName = ViewportClass | 'portrait-short' | 'landscape' | 'micro'
export const compositions: Record<CompositionName, Composition> = {
  compact: {
    width: 360, height: 680, title: [180, 455],
    nodes: { items: [75, 145], ts: [180, 55], seasons: [110, 245], wardrobe: [285, 155], maps: [275, 265], news: [90, 590], events: [270, 590] },
  },
  tablet: {
    width: 800, height: 700, title: [400, 370],
    nodes: { items: [120, 180], ts: [240, 80], seasons: [120, 325], wardrobe: [660, 175], maps: [680, 340], news: [510, 575], events: [680, 600] },
  },
  wide: {
    width: 1200, height: 700, title: [600, 355],
    nodes: { items: [235, 190], ts: [390, 90], seasons: [220, 340], wardrobe: [955, 200], maps: [1010, 345], news: [810, 570], events: [1010, 585] },
  },
  'portrait-short': {
    width: 360, height: 440, title: [180, 277],
    nodes: { items: [75, 105], ts: [180, 32], seasons: [80, 177], wardrobe: [285, 105], maps: [280, 177], news: [90, 387], events: [270, 387] },
  },
  landscape: {
    width: 800, height: 300, title: [400, 150],
    nodes: { items: [105, 145], ts: [205, 60], seasons: [180, 230], wardrobe: [605, 65], maps: [705, 145], news: [580, 230], events: [715, 240] },
  },
  micro: {
    width: 360, height: 240, title: [180, 28],
    nodes: { items: [60, 90], ts: [180, 90], seasons: [300, 90], wardrobe: [60, 153], maps: [180, 153], news: [300, 153], events: [180, 216] },
  },
}

// Scene rectangle excludes the toolbar, disclosure and safe-area padding.
export function compositionForViewport(width: number, height: number) {
  const name: CompositionName = width < 640
    ? height < 340 ? 'micro' : height < 500 ? 'portrait-short' : 'compact'
    : height < 480 || width / height > 2 ? 'landscape' : width < 1100 ? 'tablet' : 'wide'
  const preset = compositions[name]
  const nodes = { ...preset.nodes }
  features.forEach(feature => {
    const point = preset.nodes[feature]
    nodes[feature] = [point[0] / preset.width * width, point[1] / preset.height * height]
  })
  if (name === 'micro') {
    const rows = [84, (84 + height - 24) / 2, height - 24]
    features.forEach((feature, index) => { nodes[feature] = [width * (index === 6 ? .5 : [1 / 6, .5, 5 / 6][index % 3]), rows[Math.floor(index / 3)]] })
  }
  return { name, width, height, title: [preset.title[0] / preset.width * width, name === 'micro' ? 28 : preset.title[1] / preset.height * height] as Point, nodes }
}

export function connectionPath(from: Point, to: Point) {
  const bend = (to[0] - from[0]) * 0.04
  return `M ${from[0]} ${from[1]} Q ${(from[0] + to[0]) / 2 + bend} ${(from[1] + to[1]) / 2 - bend} ${to[0]} ${to[1]}`
}

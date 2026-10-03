export const features = ['items', 'seasons', 'ts', 'news', 'maps', 'wardrobe'] as const
export type FeatureId = typeof features[number]
export const destinations: Record<FeatureId, string> = {
  items: '/items', seasons: '/hub#season-event', ts: '/hub#traveling-spirit',
  news: '/hub#official-news', maps: '/hub#maps-routes', wardrobe: '/wardrobe',
}

export interface LocalStar { id: string; x: number; y: number; radius: number }
export interface Cluster {
  id: FeatureId
  stars: readonly LocalStar[]
  edges: readonly (readonly [string, string])[]
  dust: readonly (readonly [number, number])[]
}

// Original abstract silhouettes. Every endpoint is resolved from a local star;
// neither DOM labels nor the viewport participate in the SVG geometry.
export const clusters: readonly Cluster[] = [
  { id: 'items', stars: [
    { id: 'a', x: 18, y: 65, radius: 1.7 }, { id: 'b', x: 48, y: 59, radius: 2.1 },
    { id: 'c', x: 70, y: 24, radius: 2.8 }, { id: 'd', x: 30, y: 22, radius: 1.2 },
    { id: 'e', x: 80, y: 76, radius: 1.4 },
  ], edges: [['a', 'b'], ['b', 'c'], ['b', 'e']], dust: [[23, 42], [61, 83], [86, 40]] },
  { id: 'seasons', stars: [
    { id: 'a', x: 23, y: 18, radius: 2.7 }, { id: 'b', x: 40, y: 48, radius: 1.3 },
    { id: 'c', x: 28, y: 74, radius: 1.8 }, { id: 'd', x: 70, y: 68, radius: 2.1 },
    { id: 'e', x: 80, y: 39, radius: 1.2 },
  ], edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']], dust: [[54, 24], [59, 84], [13, 49]] },
  { id: 'ts', stars: [
    { id: 'a', x: 15, y: 33, radius: 1.5 }, { id: 'b', x: 50, y: 22, radius: 2.7 },
    { id: 'c', x: 63, y: 48, radius: 1.3 }, { id: 'd', x: 78, y: 78, radius: 2 },
  ], edges: [['a', 'b'], ['b', 'c'], ['c', 'd']], dust: [[23, 69], [78, 24], [47, 80]] },
  { id: 'news', stars: [
    { id: 'a', x: 17, y: 60, radius: 1.4 }, { id: 'b', x: 39, y: 34, radius: 2 },
    { id: 'c', x: 58, y: 57, radius: 2.8 }, { id: 'd', x: 83, y: 26, radius: 1.5 },
    { id: 'e', x: 71, y: 82, radius: 1.2 },
  ], edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['c', 'e']], dust: [[22, 25], [44, 79], [85, 59]] },
  { id: 'maps', stars: [
    { id: 'a', x: 15, y: 76, radius: 1.5 }, { id: 'b', x: 29, y: 44, radius: 1.8 },
    { id: 'c', x: 48, y: 57, radius: 1.3 }, { id: 'd', x: 65, y: 23, radius: 2.8 },
    { id: 'e', x: 84, y: 46, radius: 1.7 }, { id: 'f', x: 71, y: 79, radius: 1.2 },
  ], edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f']], dust: [[19, 21], [46, 85], [86, 65]] },
  { id: 'wardrobe', stars: [
    { id: 'a', x: 49, y: 17, radius: 2.8 }, { id: 'b', x: 19, y: 53, radius: 1.8 },
    { id: 'c', x: 40, y: 80, radius: 1.3 }, { id: 'd', x: 75, y: 67, radius: 2 },
    { id: 'e', x: 80, y: 34, radius: 1.2 },
  ], edges: [['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e']], dust: [[34, 36], [57, 55], [15, 78]] },
]

type Point = readonly [number, number]
export type CompositionName = 'wide' | 'desktop' | 'tablet' | 'portrait' | 'landscape' | 'compact'
interface Preset { title: Point; clusters: Record<FeatureId, Point> }
// Positions are group centers in normalized scene space, never star endpoints.
export const compositions: Record<CompositionName, Preset> = {
  wide: { title: [.5, .49], clusters: { items: [.22, .23], seasons: [.12, .57], ts: [.7, .16], news: [.32, .81], maps: [.87, .48], wardrobe: [.73, .8] } },
  desktop: { title: [.49, .49], clusters: { items: [.23, .2], seasons: [.13, .55], ts: [.74, .2], news: [.3, .83], maps: [.86, .56], wardrobe: [.7, .81] } },
  tablet: { title: [.5, .49], clusters: { items: [.27, .16], seasons: [.16, .42], ts: [.76, .23], news: [.23, .78], maps: [.83, .64], wardrobe: [.61, .87] } },
  portrait: { title: [.5, .5], clusters: { items: [.53, .1], seasons: [.23, .29], ts: [.78, .27], news: [.22, .71], maps: [.77, .73], wardrobe: [.51, .91] } },
  landscape: { title: [.5, .17], clusters: { items: [.1, .49], seasons: [.26, .72], ts: [.42, .57], news: [.58, .75], maps: [.74, .5], wardrobe: [.9, .72] } },
  compact: { title: [.5, .14], clusters: { items: [.17, .44], seasons: [.5, .48], ts: [.83, .42], news: [.17, .8], maps: [.5, .84], wardrobe: [.83, .78] } },
}

export function compositionForViewport(width: number, height: number) {
  const name: CompositionName = width < 640
    ? height < 360 ? 'compact' : 'portrait'
    : height < 480 || width / height > 2.2 ? 'landscape'
      : width < 1100 ? 'tablet' : width < 1600 ? 'desktop' : 'wide'
  const preset = compositions[name]
  const inline = name === 'compact'
  const clusterWidth = Math.min(name === 'portrait' ? 144 : inline ? 112 : 176,
    width * (name === 'portrait' ? .38 : inline ? .3 : name === 'landscape' ? .15 : .22))
  const clusterHeight = Math.max(44, Math.min(inline ? 60 : 156,
    height * (name === 'portrait' ? .16 : inline ? .26 : name === 'landscape' ? .38 : .22)))
  const titleWidth = name === 'portrait' ? width * .9 : inline ? width * .96 : name === 'landscape' ? width * .64 : width * .42
  const titleHeight = inline || name === 'landscape' ? 52 : name === 'portrait' ? Math.min(140, height * .24) : Math.min(200, height * .28)
  const positions = { ...preset.clusters }
  for (const id of features) positions[id] = [preset.clusters[id][0] * width, preset.clusters[id][1] * height]
  return {
    name, inline, clusterWidth, clusterHeight, titleWidth, titleHeight,
    title: [preset.title[0] * width, preset.title[1] * height] as Point,
    clusters: positions,
  }
}

export type ViewportClass = 'compact' | 'tablet' | 'wide'
export interface AmbientStar {
  x: number
  y: number
  depth: 0 | 1 | 2
  radius: number
  opacity: number
  phase: number
  speed: number
}

export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function viewportClass(width: number): ViewportClass {
  return width < 640 ? 'compact' : width < 1100 ? 'tablet' : 'wide'
}

export function starCount(width: number, height: number, dpr = 1, lowQuality = false) {
  const area = Math.max(1, Number.isFinite(width) ? width : 1) * Math.max(1, Number.isFinite(height) ? height : 1)
  const pixelFactor = 0.95 + Math.min(2, Math.max(1, Number.isFinite(dpr) ? dpr : 1)) * 0.12
  return Math.min(lowQuality ? 1000 : 1400, Math.max(250, Math.round(area * 0.00086 * pixelFactor * (lowQuality ? 0.75 : 1))))
}

export function generateStars({ width, height, dpr = 1, seed = 87231, lowQuality = false }: {
  width: number; height: number; dpr?: number; seed?: number; lowQuality?: boolean
}): AmbientStar[] {
  const size = viewportClass(width)
  const random = seededRandom(seed + ({ compact: 17, tablet: 41, wide: 73 })[size])
  const gaussian = () => (random() + random() + random() + random() - 2) * 0.5
  const clamp = (n: number) => Math.max(0.005, Math.min(0.995, n))
  const result: AmbientStar[] = []
  for (let i = 0; i < starCount(width, height, dpr, lowQuality); i++) {
    let x = random()
    let y = random()
    const population = random()
    if (population > 0.68 && population < 0.9) {
      y = population > 0.84 ? 0.72 - x * 0.35 + gaussian() * 0.06 : 0.15 + x * 0.55 + gaussian() * 0.1
    } else if (population >= 0.9) {
      const right = random() > 0.5
      x = (right ? 0.79 : 0.22) + gaussian() * 0.2
      y = (right ? 0.55 : 0.26) + gaussian() * 0.18
    }
    // Preserve a quieter title pocket without cutting a hard rectangular hole.
    if (Math.hypot(x - 0.5, y - 0.5) < 0.16 && random() < 0.72) {
      x = random() < 0.5 ? x * 0.65 : 0.35 + x * 0.65
    }
    const depthValue = random()
    const depth = depthValue < 0.72 ? 0 : depthValue < 0.96 ? 1 : 2
    result.push({
      x: clamp(x), y: clamp(y), depth,
      radius: [0.25, 0.6, 1.05][depth] + random() * [0.45, 0.5, 0.6][depth],
      opacity: [0.2, 0.45, 0.68][depth] + random() * 0.2,
      phase: random() * Math.PI * 2, speed: 0.12 + random() * 0.2,
    })
  }
  return result
}

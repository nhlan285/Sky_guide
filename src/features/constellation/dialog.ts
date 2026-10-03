export function outsideBounds(x: number, y: number, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
  return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom
}

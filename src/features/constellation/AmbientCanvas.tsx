import { useEffect, useRef } from 'react'
import { generateStars, seededRandom } from './starGeneration'
import type { AmbientStar } from './starGeneration'
import type { SkyVisualState } from './skyTime'

export function AmbientCanvas({ visual }: { visual: SkyVisualState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const target = useRef(visual)
  const repaint = useRef<() => void>(() => {})
  useEffect(() => { target.current = visual; repaint.current() }, [visual])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !context) return
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = window.matchMedia('(pointer: fine)')
    let width = 1, height = 1, dpr = 1, measuredDpr = 0
    let stars: AmbientStar[] = []
    let farField = document.createElement('canvas')
    let galaxy = document.createElement('canvas')
    const glow = document.createElement('canvas')
    glow.width = glow.height = 32
    const glowContext = glow.getContext('2d')
    if (glowContext) {
      const gradient = glowContext.createRadialGradient(16, 16, 0, 16, 16, 16)
      gradient.addColorStop(0, 'rgba(216,235,255,0.55)')
      gradient.addColorStop(0.2, 'rgba(164,202,234,0.16)')
      gradient.addColorStop(1, 'rgba(164,202,234,0)')
      glowContext.fillStyle = gradient
      glowContext.fillRect(0, 0, 32, 32)
    }
    const random = seededRandom(6371)
    let frame = 0, last = 0, elapsed = 0, nextMeteor = 24
    let meteor: { x: number; y: number; age: number } | null = null
    let starVisibility = target.current.starVisibility
    let hazeVisibility = target.current.hazeVisibility
    const pointer = { x: 0, y: 0 }
    let onScreen = true

    function buildCaches() {
      farField = document.createElement('canvas')
      farField.width = canvas!.width
      farField.height = canvas!.height
      const far = farField.getContext('2d')
      if (far) {
        far.scale(dpr, dpr)
        far.fillStyle = '#d5e7f4'
        for (const star of stars) if (star.depth === 0) {
          far.globalAlpha = star.opacity
          far.beginPath()
          far.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2)
          far.fill()
        }
      }
      // A low-resolution procedural haze texture is reused, not blurred per frame.
      galaxy = document.createElement('canvas')
      const hazeScale = Math.min(1, 1000 / width, 1000 / height)
      galaxy.width = Math.max(1, Math.round(width * hazeScale))
      galaxy.height = Math.max(1, Math.round(height * hazeScale))
      const haze = galaxy.getContext('2d')
      if (!haze) return
      const seed = seededRandom(1928)
      for (let i = 0; i < 54; i++) {
        const x = seed() * galaxy.width
        const y = (0.15 + x / galaxy.width * 0.55 + (seed() - 0.5) * 0.13) * galaxy.height
        const radius = galaxy.width * (0.055 + seed() * 0.05)
        const gradient = haze.createRadialGradient(x, y, 0, x, y, radius)
        gradient.addColorStop(0, 'rgba(92,128,168,0.07)')
        gradient.addColorStop(1, 'rgba(55,90,140,0)')
        haze.fillStyle = gradient
        haze.fillRect(x - radius, y - radius, radius * 2, radius * 2)
      }
      haze.fillStyle = '#a2b9d2'
      for (let i = 0; i < 550; i++) {
        const x = seed() * galaxy.width
        const y = (0.15 + x / galaxy.width * 0.55 + (seed() - 0.5) * 0.16) * galaxy.height
        haze.globalAlpha = seed() * 0.22
        haze.fillRect(x, y, 0.55, 0.55)
      }
    }

    function draw(dt: number) {
      const reduced = motion.matches
      elapsed += reduced ? 0 : dt
      const ease = reduced ? 1 : Math.min(1, dt * 3)
      starVisibility += (target.current.starVisibility - starVisibility) * ease
      hazeVisibility += (target.current.hazeVisibility - hazeVisibility) * ease
      context!.clearRect(0, 0, width, height)
      context!.globalAlpha = hazeVisibility
      context!.drawImage(galaxy, 0, 0, width, height)
      context!.globalAlpha = starVisibility
      context!.drawImage(farField, 0, 0, width, height)
      for (const star of stars) {
        if (star.depth === 0) continue
        const t = reduced ? 0 : elapsed
        const twinkle = reduced ? 1 : 0.87 + Math.sin(t * star.speed + star.phase) * 0.13
        const parallax = reduced ? 0 : star.depth * 3
        const x = star.x * width + pointer.x * parallax
        const y = star.y * height + pointer.y * parallax + (reduced ? 0 : Math.sin(t * 0.035 + star.phase) * star.depth)
        context!.globalAlpha = starVisibility * star.opacity * twinkle
        if (star.depth === 2) context!.drawImage(glow, x - 8, y - 8, 16, 16)
        context!.fillStyle = star.depth === 2 ? '#edf7ff' : '#bcd4eb'
        context!.beginPath()
        context!.arc(x, y, star.radius, 0, Math.PI * 2)
        context!.fill()
      }
      if (!reduced && target.current.nightWeight > 0.8 && elapsed > nextMeteor) {
        meteor = { x: width * (0.1 + random() * 0.65), y: height * (0.08 + random() * 0.3), age: 0 }
        nextMeteor = elapsed + 27 + random() * 26
      }
      if (meteor && !reduced) {
        meteor.age += dt
        const x = meteor.x + meteor.age * 210
        const y = meteor.y + meteor.age * 95
        const fade = Math.sin(Math.min(1, meteor.age / 1.2) * Math.PI)
        const trail = context!.createLinearGradient(x - 80, y - 36, x, y)
        trail.addColorStop(0, 'rgba(200,225,248,0)')
        trail.addColorStop(1, 'rgba(200,225,248,0.7)')
        context!.globalAlpha = fade * starVisibility
        context!.strokeStyle = trail
        context!.lineWidth = 1
        context!.beginPath()
        context!.moveTo(x - 80, y - 36)
        context!.lineTo(x, y)
        context!.stroke()
        if (meteor.age >= 1.2) meteor = null
      }
      context!.globalAlpha = 1
    }

    function tick(now: number) {
      frame = 0
      if (document.hidden || !onScreen || motion.matches) return
      // 30 fps ambient ceiling; no per-frame React updates.
      if (!last || now - last >= 1000 / 30) {
        draw(last ? Math.min(0.1, (now - last) / 1000) : 1 / 30)
        last = now
      }
      frame = requestAnimationFrame(tick)
    }
    function restart() {
      cancelAnimationFrame(frame)
      last = 0
      if (document.hidden || !onScreen) return
      if (motion.matches) { meteor = null; pointer.x = pointer.y = 0; draw(0) }
      else frame = requestAnimationFrame(tick)
    }
    function resize() {
      const bounds = canvas!.getBoundingClientRect()
      const nextWidth = Math.max(1, bounds.width)
      const nextHeight = Math.max(1, bounds.height)
      const nextDpr = window.devicePixelRatio || 1
      if (nextWidth === width && nextHeight === height && nextDpr === measuredDpr) return
      width = nextWidth
      height = nextHeight
      measuredDpr = nextDpr
      dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3_000_000 / (width * height)))
      canvas!.width = Math.max(1, Math.round(width * dpr))
      canvas!.height = Math.max(1, Math.round(height * dpr))
      context!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const lowQuality = width * height > 2_500_000
      stars = generateStars({ width, height, dpr: window.devicePixelRatio || 1, lowQuality })
      buildCaches()
      restart()
    }
    function move(event: PointerEvent) {
      if (!finePointer.matches || motion.matches) return
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 2
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 2
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const intersection = new IntersectionObserver(entries => {
      onScreen = entries[0].isIntersecting
      restart()
    })
    intersection.observe(canvas)
    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('visibilitychange', restart)
    motion.addEventListener('change', restart)
    // Reduced mode redraws only for resize, visibility or a changed sky state.
    repaint.current = () => { if (motion.matches && !document.hidden && onScreen) draw(0) }
    return () => {
      cancelAnimationFrame(frame)
      repaint.current = () => {}
      observer.disconnect()
      intersection.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', move)
      document.removeEventListener('visibilitychange', restart)
      motion.removeEventListener('change', restart)
    }
  }, [])

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden="true" />
}

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../shared/i18n/useLocale'
import { compositions, connectionPath, destinations, edges, features } from './constellationLayout'
import type { FeatureId } from './constellationLayout'
import { viewportClass } from './starGeneration'
import { useTheme } from './useTheme'
import { useSkyNavigation } from './useSkyNavigation'

export function ConstellationScene() {
  const container = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState(() => viewportClass(window.innerWidth))
  const [active, setActive] = useState<FeatureId | null>(null)
  const { visual } = useTheme()
  const { t } = useLocale()
  const travel = useSkyNavigation()
  const layout = compositions[size]
  useEffect(() => {
    if (!container.current) return
    const observer = new ResizeObserver(entries => setSize(viewportClass(entries[0].contentRect.width)))
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  function enter(event: MouseEvent<HTMLAnchorElement>, to: string, feature: FeatureId | null) {
    // Preserve standard link behavior for modified clicks and new tabs.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    travel(to, () => setActive(feature))
  }
  const style = { '--constellation-visibility': visual.constellationVisibility } as CSSProperties
  return (
    <div ref={container} className={`constellation-scene constellation-scene--${size}`} style={style}>
      <svg className="constellation-paths" viewBox={`0 0 ${layout.width} ${layout.height}`} preserveAspectRatio="none" aria-hidden="true">
        {edges.map(([from, to]) => {
          const connected = active === from || active === to
          return <g key={`${from}-${to}`} className={`constellation-edge${connected ? ' is-active' : active ? ' is-dim' : ''}`}>
            <path d={connectionPath(layout.nodes[from], layout.nodes[to])} className="constellation-edge__glow" />
            <path d={connectionPath(layout.nodes[from], layout.nodes[to])} className="constellation-edge__core" />
          </g>
        })}
      </svg>
      <nav className="constellation-navigation" aria-label={t('landing.navigation')}>
        {features.map((feature, index) => {
          const [x, y] = layout.nodes[feature]
          const to = `/hub#${destinations[feature]}`
          return <Link key={feature} to={to} className={`constellation-node constellation-node--${index % 3}${active === feature ? ' is-active' : ''}`}
            style={{ left: `${x / layout.width * 100}%`, top: `${y / layout.height * 100}%` }}
            onPointerEnter={() => setActive(feature)} onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(feature)} onBlur={() => setActive(null)} onClick={event => enter(event, to, feature)}>
            <span className="constellation-node__light" aria-hidden="true"><span /></span>
            <span className="constellation-node__label">{t(`feature.${feature}`)}</span>
          </Link>
        })}
      </nav>
      <div className="landing-identity" style={{ left: `${layout.title[0] / layout.width * 100}%`, top: `${layout.title[1] / layout.height * 100}%` }}>
        <h1 id="page-title" tabIndex={-1}>{t('landing.title')}</h1>
        <p>{t('landing.subtitle')}</p>
        <Link to="/hub" className="landing-enter" onClick={event => enter(event, '/hub', 'items')}>{t('landing.enter')} <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../shared/i18n/useLocale'
import { clusters, compositionForViewport, destinations } from './celestialAtlas'
import type { FeatureId } from './celestialAtlas'
import { CelestialCluster } from './CelestialCluster'
import { useTheme } from './useTheme'
import { useSkyNavigation } from './useSkyNavigation'

export function ConstellationScene() {
  const container = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [selected, setSelected] = useState<FeatureId | 'hub' | null>(null)
  const { visual } = useTheme()
  const { t } = useLocale()
  const travel = useSkyNavigation()
  const layout = compositionForViewport(size.width, size.height)
  useEffect(() => {
    if (!container.current) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      if (width > 0 && height > 0) setSize(previous => previous.width === width && previous.height === height ? previous : { width, height })
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  function enter(event: MouseEvent<HTMLAnchorElement>, to: string, feature: FeatureId | 'hub') {
    // Preserve standard link behavior for modified clicks and new tabs.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    travel(to, () => setSelected(feature))
  }
  const style = { '--constellation-visibility': visual.constellationVisibility } as CSSProperties
  return (
    <div ref={container} className={`constellation-scene constellation-scene--${layout.name}${selected ? ' is-departing' : ''}`} style={{ ...style, '--cluster-width': `${layout.clusterWidth}px`, '--cluster-height': `${layout.clusterHeight}px` } as CSSProperties}>
      <nav className="constellation-navigation" aria-label={t('landing.navigation')}>
        {clusters.map(cluster => {
          const feature = cluster.id
          const [x, y] = layout.clusters[feature]
          const to = destinations[feature]
          return <Link key={feature} to={to} className={`celestial-cluster${selected === feature ? ' is-selected' : ''}`}
            style={{ left: x, top: y }} onClick={event => enter(event, to, feature)}>
            <CelestialCluster cluster={cluster} />
            <span className="celestial-cluster__label">{t(`feature.${feature}`)}</span>
          </Link>
        })}
      </nav>
      <div className="landing-identity" style={{ left: layout.title[0], top: layout.title[1], width: layout.titleWidth, height: layout.titleHeight }}>
        <h1 id="page-title" tabIndex={-1}>{t('landing.title')}</h1>
        <p>{t('landing.subtitle')}</p>
        <Link to="/hub" className="landing-enter" onClick={event => enter(event, '/hub', 'hub')}>{t('landing.enter')} <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  )
}

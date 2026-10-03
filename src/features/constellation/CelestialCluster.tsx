import type { Cluster } from './celestialAtlas'

export function CelestialCluster({ cluster }: { cluster: Cluster }) {
  const stars = new Map(cluster.stars.map(star => [star.id, star]))
  return <span className="celestial-cluster__art" aria-hidden="true">
    <svg viewBox="0 0 100 100" focusable="false">
      <g className="celestial-cluster__lines">
        {cluster.edges.map(([from, to]) => {
          const start = stars.get(from)!
          const end = stars.get(to)!
          return <line key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
        })}
      </g>
      {cluster.stars.map(star => <g key={star.id}>
        <circle className="celestial-cluster__halo" cx={star.x} cy={star.y} r={star.radius * 3.5} />
        {star.radius > 2.5 ? <path className="celestial-cluster__rays" d={`M${star.x} ${star.y - 7}v14 M${star.x - 7} ${star.y}h14`} /> : null}
        <circle className="celestial-cluster__core" cx={star.x} cy={star.y} r={star.radius} />
      </g>)}
      <g className="celestial-cluster__dust">{cluster.dust.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r=".7" />)}</g>
    </svg>
    <span className="celestial-cluster__streak" />
  </span>
}

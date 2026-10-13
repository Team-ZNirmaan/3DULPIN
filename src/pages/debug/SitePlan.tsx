import generated from '../../data/site.generated.json'
import { localToEnu, lonLatToEnu } from '../../data/geo'
import { plots, spaces, underground } from '../../data'
import type { LonLat } from '../../data'
import s from './DebugPage.module.css'

// A plain 2D site plan drawn from the demo data: plots, the tower, underground lines, the station.
const SIZE = 560
const PAD = 24

export function SitePlan() {
  const pts = plots.flatMap((p) => p.polygon.map(lonLatToEnu))
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const scale = (SIZE - 2 * PAD) / Math.max(x1 - x0, y1 - y0)
  const sx = (e: number) => PAD + (e - x0) * scale
  const sy = (n: number) => SIZE - PAD - (n - y0) * scale
  const path = (ll: LonLat[]) => ll.map(lonLatToEnu).map(([e, n]) => `${sx(e).toFixed(1)},${sy(n).toFixed(1)}`).join(' ')
  const building = spaces.find((sp) => sp.type === 'B')!
  const buildingPts = building.footprint.map(localToEnu).map(([e, n]) => `${sx(e).toFixed(1)},${sy(n).toFixed(1)}`).join(' ')
  const station = generated.stations[0]
  const [stE, stN] = lonLatToEnu([station.lon, station.lat])

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={s.plan} role="img" aria-label="Site plan of the demo plots in Shivajinagar">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#cc79a7" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width={SIZE} height={SIZE} fill="#fbfaf7" />
      {underground
        .filter((u) => u.kind === 'metro-tunnel')
        .map((u) => (
          <polyline key={u.code} points={path(u.line)} fill="none" stroke="#cc79a7" strokeOpacity="0.35" strokeWidth={u.radiusM * 2 * scale} strokeLinecap="round" />
        ))}
      {plots.map((p) => (
        <g key={p.id}>
          <polygon
            points={path(p.polygon)}
            fill={p.hasTower ? 'rgb(240 228 66 / 40%)' : 'rgb(11 31 58 / 5%)'}
            stroke="#0b1f3a"
            strokeWidth={p.hasTower ? 1.8 : 1}
          />
          {p.restrictions.some((r) => r.kind === 'right-of-user') && <polygon points={path(p.polygon)} fill="url(#hatch)" opacity="0.55" />}
        </g>
      ))}
      <polygon points={buildingPts} fill="rgb(0 114 178 / 30%)" stroke="#0072b2" strokeWidth="1.5" />
      {underground
        .filter((u) => u.kind === 'water-main')
        .map((u) => (
          <polyline key={u.code} points={path(u.line)} fill="none" stroke="#0072b2" strokeWidth="2" strokeDasharray="6 3" />
        ))}
      {plots.map((p) => {
        const c = p.polygon.map(lonLatToEnu).reduce((a, b) => [a[0] + b[0] / p.polygon.length, a[1] + b[1] / p.polygon.length], [0, 0])
        return (
          <text key={p.id} x={sx(c[0])} y={sy(c[1]) + 4} className={s.planLabel} textAnchor="middle">
            {p.cts}
          </text>
        )
      })}
      <circle cx={sx(stE)} cy={sy(stN)} r="5" fill="#b8561b" />
      <text x={sx(stE) + 8} y={sy(stN) + 4} className={s.planNote}>
        Shivaji Nagar metro station
      </text>
      <g transform={`translate(${SIZE - 34} 40)`}>
        <path d="M0 -16 L6 4 L0 0 L-6 4 Z" fill="#0b1f3a" />
        <text y="18" textAnchor="middle" className={s.planNote}>
          N
        </text>
      </g>
      <g transform={`translate(${PAD} ${SIZE - 12})`}>
        <line x1="0" x2={50 * scale} y1="0" y2="0" stroke="#0b1f3a" strokeWidth="2" />
        <text y="-5" className={s.planNote}>
          50 m
        </text>
      </g>
    </svg>
  )
}

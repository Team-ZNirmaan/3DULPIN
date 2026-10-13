import { spaces, towerPlot, type Space, type UndergroundAsset } from '../../data'
import { lonLatToLocal } from '../../data/geo'
import { FLOOR_PLATE, LEVELS } from '../../data/tower'
import type { LocalXY } from '../../data/types'

// A small isometric drawing of Tower 1, see-through, with one space (or the underground line) drawn
// solid in its type colour. Plain SVG, so it stays crisp when printed or zoomed.

type Props = { space?: Space; line?: UndergroundAsset; label: string }

const COS = Math.cos(Math.PI / 6)
const SIN = 0.5
/** Isometric projection: larger x + y is nearer the viewer and lower on the page. */
const project = ([x, y]: LocalXY, z: number): [number, number] => [(x - y) * COS, (x + y) * SIN - z]
const ROOF = 27.6

const pts = (ring: LocalXY[], z: number) =>
  ring
    .map((p) => project(p, z))
    .map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`)
    .join(' ')

function signedArea(ring: LocalXY[]) {
  return ring.reduce((a, [x1, y1], i) => {
    const [x2, y2] = ring[(i + 1) % ring.length]
    return a + x1 * y2 - x2 * y1
  }, 0)
}

/** The side faces of a prism that face the viewer, as SVG polygons, back to front. */
function sideFaces(ring: LocalXY[], z0: number, z1: number) {
  const ccw = signedArea(ring) > 0
  const faces: { depth: number; points: string }[] = []
  ring.forEach((a, i) => {
    const b = ring[(i + 1) % ring.length]
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
    const n = ccw ? [dy, -dx] : [-dy, dx]
    if (n[0] + n[1] <= 0) return
    const quad = [project(a, z0), project(b, z0), project(b, z1), project(a, z1)]
    faces.push({ depth: a[0] + a[1] + b[0] + b[1], points: quad.map(([u, v]) => `${u.toFixed(2)},${v.toFixed(2)}`).join(' ') })
  })
  return faces.sort((p, q) => p.depth - q.depth)
}

export function TowerDrawing({ space, line, label }: Props) {
  const below = !!line || (space ? space.zTop <= 0.01 : false)
  const bottom = below ? LEVELS[0].bottom : 0
  const levels = LEVELS.filter((l) => l.bottom >= bottom - 0.01 && l.level !== 'RF')
  const plot = towerPlot.polygon.map(lonLatToLocal)
  const colour = `var(--type-${(space?.type ?? 'G').toLowerCase()})`
  const sameLevel = space && space.level !== 'XX' ? spaces.filter((sp) => sp.level === space.level && sp.code !== space.code && 'UCLP'.includes(sp.type)) : []
  const lineZ = line ? -line.axisDepthM : 0
  const linePath = line
    ? line.line
        .map(lonLatToLocal)
        .filter(([x, y]) => Math.abs(x) < 60 && Math.abs(y) < 60)
        .map((p) => project(p, lineZ))
    : []

  // Fit the view to the plot, the tower and the line.
  const all = [...plot.map((p) => project(p, 0)), ...FLOOR_PLATE.flatMap((p) => [project(p, bottom), project(p, ROOF + 3)]), ...linePath]
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const pad = 4
  const view = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad]

  return (
    <svg viewBox={view.map((v) => v.toFixed(1)).join(' ')} role="img" aria-label={label} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* The plot on the ground */}
      <polygon points={pts(plot, 0)} fill="var(--type-s)" fillOpacity={0.18} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={0.25} />

      {/* The underground line, under everything else */}
      {linePath.length > 1 && (
        <polyline
          points={linePath.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' ')}
          fill="none"
          stroke={colour}
          strokeWidth={line!.radiusM * 2 * 0.9}
          strokeLinecap="round"
          strokeOpacity={0.9}
        />
      )}

      {/* The tower envelope, see-through, with a line at every floor */}
      {sideFaces(FLOOR_PLATE, bottom, ROOF).map((f, i) => (
        <polygon key={`e${i}`} points={f.points} fill="#fff" fillOpacity={0.55} stroke="var(--ink)" strokeOpacity={0.35} strokeWidth={0.2} />
      ))}
      {levels.map((l) => (
        <polygon key={l.level} points={pts(FLOOR_PLATE, l.bottom)} fill="none" stroke="var(--ink)" strokeOpacity={l.bottom === 0 ? 0.4 : 0.14} strokeWidth={0.18} />
      ))}
      <polygon points={pts(FLOOR_PLATE, ROOF)} fill="#fff" fillOpacity={0.6} stroke="var(--ink)" strokeOpacity={0.4} strokeWidth={0.2} />

      {/* The other spaces on the same floor, as a floor plan */}
      {sameLevel.map((sp) => (
        <polygon key={sp.code} points={pts(sp.footprint, sp.zBottom)} fill="none" stroke="var(--ink)" strokeOpacity={0.3} strokeWidth={0.15} />
      ))}

      {/* This space, solid */}
      {space && (
        <g>
          {sideFaces(space.footprint, space.zBottom, space.zTop).map((f, i) => (
            <polygon key={i} points={f.points} fill={colour} stroke="var(--ink)" strokeOpacity={0.6} strokeWidth={0.2} style={{ filter: 'brightness(0.82)' }} />
          ))}
          <polygon points={pts(space.footprint, space.zTop)} fill={colour} stroke="var(--ink)" strokeOpacity={0.6} strokeWidth={0.2} />
        </g>
      )}
    </svg>
  )
}

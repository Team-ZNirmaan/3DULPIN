import { toLocal } from '@/domain/geo'
import type { Building, SpatialUnit } from '@/domain/types'

const C = Math.cos(Math.PI / 6)
const S = 0.5

const P = (x: number, y: number, z: number) => `${((x + y) * C).toFixed(2)},${((-x + y) * S - z).toFixed(2)}`

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  return {
    top: [P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)].join(' '),
    west: [P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)].join(' '),
    north: [P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1)].join(' '),
  }
}

function rectOf(u: SpatialUnit) {
  const pts = u.ring.slice(0, -1).map(toLocal)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }
}

function Box({ b, fill, stroke, opacity, sw = 0.12 }: { b: ReturnType<typeof box>; fill: string; stroke: string; opacity: number; sw?: number }) {
  return (
    <g stroke={stroke} strokeWidth={sw} strokeLinejoin="round">
      <polygon points={b.west} fill={fill} fillOpacity={opacity} style={{ filter: 'brightness(0.82)' }} />
      <polygon points={b.north} fill={fill} fillOpacity={opacity} style={{ filter: 'brightness(0.92)' }} />
      <polygon points={b.top} fill={fill} fillOpacity={opacity} />
    </g>
  )
}

/** Isometric sketch of the pilot tower with the given unit's real volume highlighted. */
export function UnitIsoView({ unit, building, className }: { unit: SpatialUnit; building: Building; className?: string }) {
  const fp = rectOf({ ...unit, ring: building.footprint })
  const u = rectOf(unit)
  const levels = building.levels
  const highlightLevel = unit.level
  const parcel = box(-19.6, 19.6, -24.6, 24.6, 0, 0)

  return (
    <svg viewBox="-39 -30 78 54" className={className} role="img" aria-label={`${unit.label} highlighted within ${building.label}`}>
      {levels
        .filter((l) => l.index < 0)
        .map((l) => (
          <Box key={l.code} b={box(-16, 16, -23, 14, l.zMin, l.zMax)} fill={l.code === highlightLevel ? '#E8A33D' : '#98A2B3'} stroke="#667085" opacity={l.code === highlightLevel ? 0.25 : 0.12} sw={0.08} />
        ))}
      {unit.zMax <= 0 && <Box b={box(u.x0, u.x1, u.y0, u.y1, unit.zMin, unit.zMax)} fill="#E07B00" stroke="#7a3d00" opacity={0.95} sw={0.14} />}
      <polygon points={parcel.top} fill="#f3efe6" fillOpacity={0.72} stroke="#E07B00" strokeWidth={0.14} strokeDasharray="0.8 0.5" />
      {levels
        .filter((l) => l.index >= 0)
        .map((l) => (
          <g key={l.code}>
            <Box
              b={box(fp.x0, fp.x1, fp.y0, fp.y1, l.zMin, l.zMax)}
              fill={l.sanctioned ? '#7FB2F0' : '#F04438'}
              stroke={l.sanctioned ? '#24508F' : '#B42318'}
              opacity={l.code === highlightLevel ? 0.28 : unit.zMax <= 0 ? 0.14 : 0.2}
              sw={0.1}
            />
            {l.code === highlightLevel && unit.zMax > 0 && <Box b={box(u.x0, u.x1, u.y0, u.y1, unit.zMin, unit.zMax)} fill="#E07B00" stroke="#7a3d00" opacity={0.95} sw={0.14} />}
          </g>
        ))}
    </svg>
  )
}

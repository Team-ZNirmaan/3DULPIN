import { useMemo } from 'react'
import { CLASS_COLOR, classOf } from '@/domain/display'
import { toLocal } from '@/domain/geo'
import type { FloorEvidence, SpatialUnit } from '@/domain/types'
import { mulberry32 } from '@/domain/prng'

const BY = 4

type R = { x0: number; y0: number; x1: number; y1: number }

export function localRect(u: SpatialUnit): R {
  const pts = u.ring.slice(0, -1).map(toLocal)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1] - BY)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

/** M1: synthetic true-orthophoto crop with roof outline vs wall footprint. */
export function OrthoView({ showRoof, showWall, showSeg }: { showRoof: boolean; showWall: boolean; showSeg: boolean }) {
  const S = 14
  const W = 40 * S
  const H = 32 * S
  const X = (x: number) => (x + 20) * S
  const Y = (y: number) => (16 - y) * S
  const rng = mulberry32(3)
  const tanks = [
    [-8, 5],
    [-6, 5],
    [7, -6],
  ]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full rounded-lg" role="img" aria-label="Synthetic true orthophoto of Tower 1 with extracted footprint">
      <defs>
        <pattern id="asphalt" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#8d939b" />
          <circle cx="2" cy="3" r="0.6" fill="#9aa0a8" />
        </pattern>
        <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cfc6b8" />
          <stop offset="1" stopColor="#b9af9f" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="#b7b39f" />
      <rect x={X(-20)} y={Y(-11)} width={40 * S} height={6 * S} fill="url(#asphalt)" />
      <rect x={X(-16)} y={Y(13.9)} width={32 * S} height={26 * S} fill="#c9c2ae" opacity=".6" />
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={X(-19 + rng() * 38)} cy={Y(15 - rng() * 2.5)} r={S * (0.9 + rng() * 0.8)} fill="#6f8f5e" opacity=".85" />
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <rect key={i} x={X(-14 + i * 5)} y={Y(-6.5)} width={S * 1.8} height={S * 4.2} rx="4" fill={['#c0392b', '#34495e', '#ecf0f1'][i]} opacity=".9" />
      ))}
      <rect x={X(-12.6)} y={Y(9.6)} width={25.2 * S} height={19.2 * S} fill="url(#roof)" stroke="#9c927f" />
      <rect x={X(-12.6) + 6} y={Y(9.6) + 6} width={25.2 * S - 12} height={19.2 * S - 12} fill="none" stroke="#a79d8a" strokeWidth="3" />
      {tanks.map(([x, y], i) => (
        <circle key={i} cx={X(x)} cy={Y(y)} r={S * 0.9} fill="#1f2a36" opacity=".85" />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={X(1 + (i % 3) * 3.2)} y={Y(7.5 - Math.floor(i / 3) * 2.4)} width={S * 2.8} height={S * 1.8} fill="#29435e" stroke="#9fb3c8" strokeWidth=".8" />
      ))}
      <rect x={X(-2.5)} y={Y(9)} width={5 * S} height={S * 3} fill="#a89e8b" />
      {showSeg && <rect x={X(-12.7)} y={Y(9.7)} width={25.4 * S} height={19.4 * S} fill="#0072B2" opacity=".22" />}
      {showRoof && <rect x={X(-12.6)} y={Y(9.6)} width={25.2 * S} height={19.2 * S} fill="none" stroke="#E07B00" strokeWidth="3" strokeDasharray="10 6" />}
      {showWall && <rect x={X(-12)} y={Y(9)} width={24 * S} height={18 * S} fill="none" stroke="#1B3A6B" strokeWidth="3.5" />}
      {showWall && showRoof && (
        <g fontFamily="Noto Sans, sans-serif" fontSize="13" fontWeight="600">
          <line x1={X(12)} y1={Y(0)} x2={X(12.6)} y2={Y(0)} stroke="#101828" strokeWidth="2" />
          <text x={X(12.9)} y={Y(0) + 4} fill="#101828">0.60 m chajja</text>
        </g>
      )}
    </svg>
  )
}

/** M2: south facade elevation with detected windows and fused slab bands. */
export function FacadeView({ evidence, showDetections }: { evidence: FloorEvidence[]; showDetections: boolean }) {
  const S = 22
  const W = 30 * S
  const H = 23 * S
  const X = (x: number) => (x + 15) * S
  const Y = (z: number) => (21.5 - z) * S
  const rng = mulberry32(11)
  const floors = [1, 2, 3, 4, 5]
  const levelZ = (f: number) => evidence.find((e) => e.level === String(f).padStart(2, '0'))!
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full rounded-lg bg-gradient-to-b from-sky-100 to-slate-100" role="img" aria-label="Facade elevation with detected floors">
      <rect x={X(-15)} y={Y(0)} width={W} height={1.5 * S} fill="#b7b39f" />
      <rect x={X(-12)} y={Y(19.9)} width={24 * S} height={19.9 * S} fill="#e9e3d6" stroke="#b9ad97" />
      {[-11.5, -6, -0.3, 5.5, 11].map((x) => (
        <rect key={x} x={X(x)} y={Y(3)} width={0.5 * S} height={3 * S} fill="#9c927f" />
      ))}
      <rect x={X(-12)} y={Y(3)} width={24 * S} height={3 * S} fill="#3b4250" opacity=".35" />
      {floors.map((f) => {
        const e = levelZ(f)
        const z0 = e.fusedZ
        return (
          <g key={f}>
            {!e.sanctioned && <rect x={X(-12)} y={Y(z0 + 3)} width={24 * S} height={3 * S} fill="#F04438" opacity=".14" />}
            <rect x={X(-12.6)} y={Y(z0 + 0.1)} width={25.2 * S} height={0.28 * S} fill="#cfc6b8" />
            {Array.from({ length: 6 }, (_, i) => {
              const x = -10.8 + i * 3.9
              const conf = 0.86 + rng() * 0.13
              return (
                <g key={i}>
                  <rect x={X(x)} y={Y(z0 + 2.3)} width={2 * S} height={1.4 * S} fill="#5f7a95" stroke="#f8fafc" strokeWidth="2" />
                  {showDetections && (
                    <>
                      <rect x={X(x - 0.15)} y={Y(z0 + 2.45)} width={2.3 * S} height={1.7 * S} fill="none" stroke="#12B76A" strokeWidth="2" />
                      <text x={X(x - 0.1)} y={Y(z0 + 2.55)} fontSize="10" fill="#067647" fontWeight="700" fontFamily="Noto Sans">
                        {conf.toFixed(2)}
                      </text>
                    </>
                  )}
                </g>
              )
            })}
          </g>
        )
      })}
      <rect x={X(-12.2)} y={Y(20.9)} width={24.4 * S} height={1 * S} fill="#d8d0bf" />
      {evidence.map((e) => (
        <g key={e.level} fontFamily="Noto Sans, sans-serif">
          <line x1={X(-14.6)} x2={X(12.6)} y1={Y(e.fusedZ)} y2={Y(e.fusedZ)} stroke={e.sanctioned ? '#1B3A6B' : '#F04438'} strokeWidth="1.5" strokeDasharray="6 4" />
          <text x={X(-14.6)} y={Y(e.fusedZ) - 5} fontSize="12" fontWeight="700" fill={e.sanctioned ? '#1B3A6B' : '#B42318'}>
            {e.level} · {e.fusedZ.toFixed(2)} m
          </text>
        </g>
      ))}
      <g fontFamily="Noto Sans, sans-serif">
        <line x1={X(13.8)} x2={X(13.8)} y1={Y(0)} y2={Y(19.9)} stroke="#475467" strokeWidth="1.5" markerEnd="" />
        <text x={X(14.2)} y={Y(20.3)} fontSize="12" fontWeight="600" fill="#475467" textAnchor="end">
          DSM 19.90 m
        </text>
      </g>
    </svg>
  )
}

interface Room {
  id: string
  name: string
  r: R
  flat: string
}

function roomsFor(flat: SpatialUnit): { rooms: Room[]; doors: [string, string][]; entrance: [number, number] } {
  const r = localRect(flat)
  const no = flat.label.replace('Flat ', '')
  const w = r.x1 - r.x0
  const aboveCorridor = r.y0 >= 1
  const living: R = { x0: r.x0, y0: r.y0, x1: r.x0 + w * 0.45, y1: r.y1 }
  const xr = living.x1
  const ym = (r.y0 + r.y1) / 2
  const bed: R = aboveCorridor ? { x0: xr, y0: ym, x1: r.x1, y1: r.y1 } : { x0: xr, y0: r.y0, x1: r.x1, y1: ym }
  const service: R = aboveCorridor ? { x0: xr, y0: r.y0, x1: r.x1, y1: ym } : { x0: xr, y0: ym, x1: r.x1, y1: r.y1 }
  const kitchen: R = { ...service, x1: service.x0 + (service.x1 - service.x0) * 0.55 }
  const bath: R = { ...service, x0: kitchen.x1 }
  const id = (n: string) => `${no}-${n}`
  return {
    rooms: [
      { id: id('L'), name: 'Living', r: living, flat: no },
      { id: id('B'), name: 'Bed', r: bed, flat: no },
      { id: id('K'), name: 'Kitchen', r: kitchen, flat: no },
      { id: id('T'), name: 'Bath', r: bath, flat: no },
    ],
    doors: [
      [id('L'), id('B')],
      [id('L'), id('K')],
      [id('B'), id('T')],
    ],
    entrance: [(living.x0 + living.x1) / 2, aboveCorridor ? r.y0 : r.y1],
  }
}

const FLAT_HUES = ['#0072B2', '#6a3d9a', '#1f78b4', '#33a02c']

/** M3: plan of one level coloured by legal class, with the room–door graph used to group units. */
export function PlanView({ units, showGraph, highlight }: { units: SpatialUnit[]; showGraph: boolean; highlight?: string }) {
  const S = 26
  const pad = 1.5
  const X = (x: number) => (x + 12 + pad) * S
  const Y = (y: number) => (9 + pad - y) * S
  const W = (24 + 2 * pad) * S
  const H = (18 + 2 * pad) * S
  const flats = units.filter((u) => u.type === 'U')
  const graph = useMemo(() => flats.map(roomsFor), [flats])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full rounded-lg bg-white" role="img" aria-label="Floor plan coloured by legal class">
      <defs>
        <pattern id="grid" width={S} height={S} patternUnits="userSpaceOnUse">
          <path d={`M ${S} 0 L 0 0 0 ${S}`} fill="none" stroke="#eef1f5" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid)" />
      {units.map((u) => {
        const r = localRect(u)
        const cls = classOf(u)
        const hl = highlight && u.code === highlight
        return (
          <g key={u.code}>
            <rect
              x={X(r.x0)}
              y={Y(r.y1)}
              width={(r.x1 - r.x0) * S}
              height={(r.y1 - r.y0) * S}
              fill={CLASS_COLOR[cls]}
              fillOpacity={cls === 'exclusive' ? (showGraph ? 0.1 : 0.22) : 0.28}
              stroke={hl ? '#E07B00' : '#344054'}
              strokeWidth={hl ? 4 : 2.5}
            />
            {!showGraph && (
              <text x={X((r.x0 + r.x1) / 2)} y={Y((r.y0 + r.y1) / 2)} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="700" fill="#101828" fontFamily="Noto Sans, sans-serif">
                {u.label.replace(/^Floor \d — /, '').replace('lift & services', 'Lift').replace('staircase', 'Stair').replace('corridor', 'Corridor')}
              </text>
            )}
          </g>
        )
      })}
      {showGraph &&
        graph.map((g, gi) => {
          const hue = FLAT_HUES[gi % FLAT_HUES.length]
          const c = (id: string) => {
            const r = g.rooms.find((x) => x.id === id)!.r
            return [X((r.x0 + r.x1) / 2), Y((r.y0 + r.y1) / 2)] as const
          }
          const living = c(g.rooms[0].id)
          return (
            <g key={gi} fontFamily="Noto Sans, sans-serif">
              {g.rooms.map((room) => (
                <rect key={room.id} x={X(room.r.x0)} y={Y(room.r.y1)} width={(room.r.x1 - room.r.x0) * S} height={(room.r.y1 - room.r.y0) * S} fill="none" stroke="#98A2B3" strokeWidth="1" strokeDasharray="3 3" />
              ))}
              {g.doors.map(([a, b]) => {
                const [x1, y1] = c(a)
                const [x2, y2] = c(b)
                return <line key={a + b} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hue} strokeWidth="3" />
              })}
              <line x1={living[0]} y1={living[1]} x2={X(g.entrance[0])} y2={Y(g.entrance[1])} stroke="#E07B00" strokeWidth="3" strokeDasharray="5 4" />
              <rect x={X(g.entrance[0]) - 7} y={Y(g.entrance[1]) - 4} width="14" height="8" fill="#E07B00" rx="2" />
              {g.rooms.map((room) => {
                const [x, y] = c(room.id)
                return (
                  <g key={room.id}>
                    <circle cx={x} cy={y} r="15" fill="white" stroke={hue} strokeWidth="3" />
                    <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="700" fill={hue}>
                      {room.name.slice(0, 3)}
                    </text>
                  </g>
                )
              })}
              <text x={X(g.rooms[1].r.x0) + 8} y={Y(g.rooms[1].r.y1) + 18} fontSize="13" fontWeight="800" fill={hue}>
                Flat {g.rooms[0].flat}
              </text>
            </g>
          )
        })}
    </svg>
  )
}

/** Volumes: section through the level stack with slab heights. */
export function SectionView({ levels, highlight }: { levels: { code: string; label: string; zMin: number; zMax: number; sanctioned: boolean }[]; highlight?: string }) {
  const S = 17
  const X = (x: number) => (x + 2) * S
  const Y = (z: number) => (21 - z) * S
  const W = 38 * S
  const H = 41 * S
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full rounded-lg bg-white" role="img" aria-label="Section through Tower 1 levels">
      <rect x={0} y={Y(0)} width={W} height={H - Y(0)} fill="#efe9dc" />
      <line x1={0} x2={W} y1={Y(0)} y2={Y(0)} stroke="#8a6d3b" strokeWidth="2" />
      <text x={X(27.5)} y={Y(0) - 6} fontSize="12" fontWeight="600" fill="#8a6d3b" fontFamily="Noto Sans">
        Ground (DTM) · z = 0.00 · 527.40 m MSL
      </text>
      {levels.map((l) => {
        const hl = l.code === highlight
        return (
          <g key={l.code} fontFamily="Noto Sans, sans-serif">
            <rect
              x={X(l.code.startsWith('B') ? -1 : 1)}
              y={Y(l.zMax)}
              width={(l.code.startsWith('B') ? 26 : 22) * S}
              height={(l.zMax - l.zMin) * S}
              fill={hl ? '#fdf3e6' : l.sanctioned ? '#eef3fa' : '#fef3f2'}
              stroke={hl ? '#E07B00' : l.sanctioned ? '#24508F' : '#F04438'}
              strokeWidth={hl ? 3 : 1.5}
            />
            <text x={X(l.code.startsWith('B') ? 0 : 2)} y={Y((l.zMin + l.zMax) / 2) + 4} fontSize="12" fontWeight="700" fill="#101828">
              {l.code} · {l.label}
            </text>
            <text x={X(26.5)} y={Y(l.zMin) + 4} fontSize="11" fill="#475467">
              {l.zMin.toFixed(2)} → {l.zMax.toFixed(2)} m
            </text>
            {!l.sanctioned && (
              <text x={X(14)} y={Y((l.zMin + l.zMax) / 2) + 4} fontSize="11" fontWeight="700" fill="#B42318">
                not in sanctioned plan
              </text>
            )}
          </g>
        )
      })}
      <rect x={X(-3)} y={Y(-9)} width={34 * S} height={6.5 * S} rx={3.25 * S} fill="#D55E00" opacity=".85" />
      <rect x={X(-3)} y={Y(-6)} width={34 * S} height={12.5 * S} fill="#F04438" opacity=".08" stroke="#F04438" strokeDasharray="6 4" />
      <text x={X(8)} y={Y(-12)} fontSize="12" fontWeight="700" fill="white" fontFamily="Noto Sans">
        Metro tunnel · crown −9.00 m
      </text>
      <text x={X(18.5)} y={Y(-6) + 14} fontSize="11" fontWeight="700" fill="#B42318" fontFamily="Noto Sans">
        protection zone top −6.00 m
      </text>
    </svg>
  )
}

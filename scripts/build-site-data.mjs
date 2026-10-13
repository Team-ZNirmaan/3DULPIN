// Builds src/data/site.generated.json from the saved OpenStreetMap extract (scripts/osm).
// Run: node scripts/build-site-data.mjs
//
// What it makes:
//  - the demo tower's plot, centred and aligned on a real building that sits over the metro tunnel
//  - 14 neighbouring plots, drawn around real buildings (buffered bounding rectangles, no overlaps)
//  - the two metro bores (real OSM alignment) and a demo water main, clipped to the area
//  - which plots each underground line passes under (these plots get a "right of user" record)
// Plot numbers, ULPINs and network roots are fictional but well formed.
import { readFileSync, writeFileSync } from 'node:fs'

const osm = JSON.parse(readFileSync(new URL('./osm/shivajinagar-extract.json', import.meta.url)))

// ---------- site choices ----------
const TOWER_SITE_OSM_ID = 118011956 // unnamed real building over both bores, south of Ganeshkhind Road
const PLOT_SIZE = { along: 50, across: 36 } // metres; tower 32 × 20 plus setbacks
const NEIGHBOUR_COUNT = 14
const CLIP_RADIUS_M = 170 // keep underground lines within this distance of the tower plot centre
const WATER_MAIN_LOCAL = { y: -15, x0: -60, x1: 60 } // along the plot's south setback, metres in tower frame

// ---------- local metric frame ----------
const R = 6371008.8
const toRad = (d) => (d * Math.PI) / 180
let ORIGIN = null
const enu = ([lat, lon]) => [toRad(lon - ORIGIN.lon) * R * Math.cos(toRad(ORIGIN.lat)), toRad(lat - ORIGIN.lat) * R]
const unEnu = ([e, n]) => [ORIGIN.lon + ((e / (R * Math.cos(toRad(ORIGIN.lat)))) * 180) / Math.PI, ORIGIN.lat + ((n / R) * 180) / Math.PI]
const round = (v, d = 7) => Math.round(v * 10 ** d) / 10 ** d

// ---------- geometry ----------
const area = (p) => Math.abs(p.reduce((s, a, i) => { const b = p[(i + 1) % p.length]; return s + a[0] * b[1] - b[0] * a[1] }, 0)) / 2
const centroid = (p) => p.reduce((s, a) => [s[0] + a[0] / p.length, s[1] + a[1] / p.length], [0, 0])
function hull(points) {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo = [], hi = []
  for (const q of p) { while (lo.length >= 2 && cross(lo.at(-2), lo.at(-1), q) <= 0) lo.pop(); lo.push(q) }
  for (const q of p.reverse()) { while (hi.length >= 2 && cross(hi.at(-2), hi.at(-1), q) <= 0) hi.pop(); hi.push(q) }
  return [...lo.slice(0, -1), ...hi.slice(0, -1)]
}
/** Minimum-area bounding rectangle: { centre, angle (rad, long side), along, across }. */
function obb(points) {
  const h = hull(points)
  let best = null
  for (let i = 0; i < h.length; i++) {
    const [a, b] = [h[i], h[(i + 1) % h.length]]
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
    const c = Math.cos(ang), s = Math.sin(ang)
    const xs = h.map((q) => q[0] * c + q[1] * s), ys = h.map((q) => -q[0] * s + q[1] * c)
    const w = Math.max(...xs) - Math.min(...xs), d = Math.max(...ys) - Math.min(...ys)
    if (!best || w * d < best.w * best.d) {
      const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2
      best = { w, d, ang, centre: [mx * c - my * s, mx * s + my * c] }
    }
  }
  // express with the long side as "along"
  return best.w >= best.d
    ? { centre: best.centre, angle: best.ang, along: best.w, across: best.d }
    : { centre: best.centre, angle: best.ang + Math.PI / 2, along: best.d, across: best.w }
}
function rect(centre, angle, along, across) {
  const c = Math.cos(angle), s = Math.sin(angle)
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
    const x = (u * along) / 2, y = (v * across) / 2
    return [centre[0] + x * c - y * s, centre[1] + x * s + y * c]
  })
}
function convexOverlap(a, b) {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i], q = poly[(i + 1) % poly.length]
      const n = [q[1] - p[1], p[0] - q[0]]
      const pa = a.map((v) => v[0] * n[0] + v[1] * n[1]), pb = b.map((v) => v[0] * n[0] + v[1] * n[1])
      if (Math.max(...pa) <= Math.min(...pb) + 1e-6 || Math.max(...pb) <= Math.min(...pa) + 1e-6) return false
    }
  }
  return true
}
const inside = (pt, poly) => {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j]
    if (yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c
  }
  return c
}
function segDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}
/** True when a polyline (with half-width r) runs under the polygon. Sampled every 0.5 m. */
function lineUnder(line, poly, r) {
  for (let i = 0; i < line.length - 1; i++) {
    const [a, b] = [line[i], line[i + 1]]
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.5))
    for (let k = 0; k <= n; k++) {
      const p = [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]
      if (inside(p, poly)) return true
      if (poly.some((q, j) => segDist(p, q, poly[(j + 1) % poly.length]) < r)) return true
    }
  }
  return false
}
function clipLine(line, radius) {
  const keep = line.filter((p) => Math.hypot(p[0], p[1]) <= radius)
  return keep
}

// ---------- fictional but well-formed identifiers ----------
function prng(seedText) {
  let h = 2166136261
  for (const ch of seedText) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ' // no I or O, to avoid 1/0 confusion
const DIGITS = '0123456789'
function fictionalId(seedText) {
  const r = prng(seedText)
  return 'AA99AA9999AAAA'.split('').map((t) => (t === 'A' ? LETTERS : DIGITS)[Math.floor(r() * (t === 'A' ? 24 : 10))]).join('')
}

// ---------- build ----------
const site = osm.buildings.find((b) => b.id === TOWER_SITE_OSM_ID)
const siteLatLon = site.geometry
ORIGIN = { lat: siteLatLon.reduce((s, p) => s + p[0], 0) / siteLatLon.length, lon: siteLatLon.reduce((s, p) => s + p[1], 0) / siteLatLon.length }
const siteBox = obb(siteLatLon.map(enu))
ORIGIN = { lat: unEnu(siteBox.centre)[1], lon: unEnu(siteBox.centre)[0] } // re-centre on the rectangle
const ANGLE = obb(siteLatLon.map(enu)).angle
const towerPlot = rect([0, 0], ANGLE, PLOT_SIZE.along, PLOT_SIZE.across)

const buildings = osm.buildings
  .filter((b) => b.id !== TOWER_SITE_OSM_ID && b.geometry.length >= 4)
  .map((b) => {
    const pts = b.geometry.map(enu)
    return { ...b, pts, hull: hull(pts), area: area(pts), c: centroid(pts) }
  })

const warnings = []
for (const b of buildings) if (convexOverlap(b.hull, towerPlot)) warnings.push(`tower plot overlaps real building ${b.id}`)

const accepted = [{ id: 'tower', poly: towerPlot, osmBuildingId: TOWER_SITE_OSM_ID }]
for (const b of [...buildings].sort((a, b) => Math.hypot(...a.c) - Math.hypot(...b.c))) {
  if (accepted.length > NEIGHBOUR_COUNT) break
  if (b.area < 120 || b.area > 4000) continue
  const box = obb(b.pts)
  for (const buf of [4, 2.5, 1]) {
    const poly = rect(box.centre, box.angle, box.along + 2 * buf, box.across + 2 * buf)
    if (accepted.some((a) => convexOverlap(a.poly, poly))) continue
    if (buildings.some((o) => o.id !== b.id && convexOverlap(o.hull, poly))) continue
    accepted.push({ id: `osm-${b.id}`, poly, osmBuildingId: b.id, name: b.tags.name ?? null })
    break
  }
}

// underground lines in local metres
const BORE_RADIUS = 3.15
const bores = osm.metroTunnels.map((t, i) => ({
  key: i === 0 ? 'UP' : 'DN',
  name: i === 0 ? 'Up line' : 'Down line',
  osmWayId: t.id,
  line: clipLine(t.geometry.map(enu), CLIP_RADIUS_M),
}))
const c = Math.cos(ANGLE), s = Math.sin(ANGLE)
const toEnu = (x, y) => [x * c - y * s, x * s + y * c]
const WATER_RADIUS = 0.3
const waterLine = [toEnu(WATER_MAIN_LOCAL.x0, WATER_MAIN_LOCAL.y), toEnu(WATER_MAIN_LOCAL.x1, WATER_MAIN_LOCAL.y)]

// CTS numbers in reading order (north to south, then west to east), fictional
const ordered = [...accepted].sort((a, b) => {
  const [ca, cb] = [centroid(a.poly), centroid(b.poly)]
  return Math.round(cb[1] / 25) - Math.round(ca[1] / 25) || ca[0] - cb[0]
})
const plots = ordered.map((p, i) => {
  const ll = p.poly.map(unEnu)
  const cen = centroid(ll)
  return {
    id: p.id === 'tower' ? 'tower' : p.id,
    cts: String(1171 + i),
    ulpin: fictionalId(`ulpin:${cen[0].toFixed(6)},${cen[1].toFixed(6)}`),
    areaM2: Math.round(area(p.poly)),
    polygon: ll.map(([lon, lat]) => [round(lon), round(lat)]),
    osmBuildingId: p.osmBuildingId,
    realBuildingName: p.name ?? null,
    underground: [
      ...bores.filter((b) => lineUnder(b.line, p.poly, BORE_RADIUS)).map((b) => `metro-${b.key}`),
      ...(lineUnder(waterLine, p.poly, WATER_RADIUS) ? ['water-main'] : []),
    ],
  }
})

const out = {
  note: 'Generated by scripts/build-site-data.mjs from the OpenStreetMap extract. Plot numbers, ULPINs and network roots are fictional demo data.',
  attribution: osm.attribution,
  origin: { lon: round(ORIGIN.lon), lat: round(ORIGIN.lat) },
  /** Tower frame: x runs along the plot's long side, at this angle counter-clockwise from east. */
  towerFrameAngleDeg: Math.round(((ANGLE * 180) / Math.PI) * 100) / 100,
  plots,
  networkRoots: {
    metro: fictionalId('network:Pune Metro Line 1 Purple'),
    water: fictionalId('network:PMC water supply trunk mains'),
  },
  underground: [
    ...bores.map((b) => ({ key: `metro-${b.key}`, network: 'metro', name: b.name, osmWayId: b.osmWayId, radiusM: BORE_RADIUS, line: b.line.map(unEnu).map(([lon, lat]) => [round(lon), round(lat)]) })),
    { key: 'water-main', network: 'water', name: 'Water main', osmWayId: null, radiusM: WATER_RADIUS, line: waterLine.map(unEnu).map(([lon, lat]) => [round(lon), round(lat)]) },
  ],
  stations: osm.stations,
}

writeFileSync(new URL('../src/data/site.generated.json', import.meta.url), JSON.stringify(out, null, 1) + '\n')
console.log(`plots: ${plots.length} (tower + ${plots.length - 1} neighbours)`)
console.log(`tower plot CTS ${plots.find((p) => p.id === 'tower').cts}, frame angle ${out.towerFrameAngleDeg} deg, origin ${out.origin.lat}, ${out.origin.lon}`)
console.log('plots over underground lines:', plots.filter((p) => p.underground.length).map((p) => `CTS ${p.cts} [${p.underground.join(', ')}]`).join('; '))
console.log(warnings.length ? `WARNINGS:\n${warnings.join('\n')}` : 'no overlaps with real buildings')

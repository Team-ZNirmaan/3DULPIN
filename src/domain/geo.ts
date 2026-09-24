import { booleanIntersects, booleanPointInPolygon, polygon as turfPolygon, point as turfPoint } from '@turf/turf'
import type { LonLat, Ring, SpatialUnit } from './types'

export const SITE = {
  lon: 77.4126,
  lat: 23.2599,
  groundMsl: 527.4,
  crs: 'EPSG:32643 (WGS 84 / UTM 43N)',
}

const M_PER_DEG_LAT = 111_320
const mPerDegLon = () => M_PER_DEG_LAT * Math.cos((SITE.lat * Math.PI) / 180)

export function toLonLat(x: number, y: number): LonLat {
  return [SITE.lon + x / mPerDegLon(), SITE.lat + y / M_PER_DEG_LAT]
}

export function toLocal([lon, lat]: LonLat): [number, number] {
  return [(lon - SITE.lon) * mPerDegLon(), (lat - SITE.lat) * M_PER_DEG_LAT]
}

export function rectRing(x0: number, y0: number, x1: number, y1: number): Ring {
  return [toLonLat(x0, y0), toLonLat(x1, y0), toLonLat(x1, y1), toLonLat(x0, y1), toLonLat(x0, y0)]
}

/** Rectangle around the straight segment a→b with the given half-width (metres). */
export function corridorRing(a: [number, number], b: [number, number], halfWidth: number): Ring {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = Math.hypot(dx, dy)
  const nx = (-dy / len) * halfWidth
  const ny = (dx / len) * halfWidth
  const pts: [number, number][] = [
    [a[0] + nx, a[1] + ny],
    [b[0] + nx, b[1] + ny],
    [b[0] - nx, b[1] - ny],
    [a[0] - nx, a[1] - ny],
  ]
  const ring = pts.map(([x, y]) => toLonLat(x, y))
  return [...ring, ring[0]]
}

export function ringAreaSqm(ring: Ring): number {
  const pts = ring.map(toLocal)
  let a = 0
  for (let i = 0; i < pts.length - 1; i++) a += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
  return Math.abs(a) / 2
}

export function ringCentroid(ring: Ring): LonLat {
  const pts = ring.slice(0, -1)
  const lon = pts.reduce((s, p) => s + p[0], 0) / pts.length
  const lat = pts.reduce((s, p) => s + p[1], 0) / pts.length
  return [lon, lat]
}

export function pointInRing(p: LonLat, ring: Ring): boolean {
  return booleanPointInPolygon(turfPoint(p), turfPolygon([ring]))
}

export function ringsIntersect(a: Ring, b: Ring): boolean {
  return booleanIntersects(turfPolygon([a]), turfPolygon([b]))
}

/** Every volume that contains the 3D point (prism test: footprint contains XY, zMin ≤ z ≤ zMax). */
export function unitsAtPoint(units: SpatialUnit[], p: LonLat, z: number): SpatialUnit[] {
  return units.filter((u) => z >= u.zMin && z <= u.zMax && pointInRing(p, u.ring))
}

export interface DigHit {
  unit: SpatialUnit
  hitsAsset: boolean
  hitsProtection: boolean
  clearanceM: number
}

/** Excavation from ground (z = 0) down to -depthM over the polygon, tested against underground assets and their protection zones. */
export function digCheck(units: SpatialUnit[], area: Ring, depthM: number): DigHit[] {
  const digBottom = -depthM
  const hits: DigHit[] = []
  for (const u of units) {
    if (u.type !== 'G' || !u.infra) continue
    const inf = u.infra
    const overlapsProtectionXY = ringsIntersect(area, inf.protectionRing)
    if (!overlapsProtectionXY) continue
    const hitsProtection = digBottom <= inf.protectionZMax
    const hitsAsset = ringsIntersect(area, u.ring) && digBottom <= u.zMax
    hits.push({ unit: u, hitsAsset, hitsProtection, clearanceM: Math.round((digBottom - u.zMax) * 100) / 100 })
  }
  return hits.sort((a, b) => Number(b.hitsAsset) - Number(a.hitsAsset) || Number(b.hitsProtection) - Number(a.hitsProtection))
}

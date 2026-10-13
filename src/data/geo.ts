import { SITE } from './site'
import type { LocalXY, LonLat } from './types'

// Converts between the tower frame (metres) and longitude/latitude.
// Over a few hundred metres an equirectangular projection is accurate to millimetres.

const R = 6371008.8
const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const angle = rad(SITE.frameAngleDeg)
const cos = Math.cos(angle)
const sin = Math.sin(angle)
const cosLat = Math.cos(rad(SITE.origin.lat))

/** Tower frame (x along the plot, y across) to east/north metres from the plot centre. */
export function localToEnu([x, y]: LocalXY): [number, number] {
  return [x * cos - y * sin, x * sin + y * cos]
}

export function enuToLocal([e, n]: [number, number]): LocalXY {
  return [e * cos + n * sin, -e * sin + n * cos]
}

export function enuToLonLat([e, n]: [number, number]): LonLat {
  return [SITE.origin.lon + deg(e / (R * cosLat)), SITE.origin.lat + deg(n / R)]
}

export function lonLatToEnu([lon, lat]: LonLat): [number, number] {
  return [rad(lon - SITE.origin.lon) * R * cosLat, rad(lat - SITE.origin.lat) * R]
}

export const localToLonLat = (p: LocalXY): LonLat => enuToLonLat(localToEnu(p))
export const lonLatToLocal = (p: LonLat): LocalXY => enuToLocal(lonLatToEnu(p))

/** Height in metres above mean sea level, from a height above the tower's ground floor. */
export const toMsl = (z: number) => Math.round((SITE.groundLevelMsl + z) * 100) / 100

export function polygonArea(p: LocalXY[]): number {
  let s = 0
  for (let i = 0; i < p.length; i++) {
    const [a, b] = [p[i], p[(i + 1) % p.length]]
    s += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(s) / 2
}

export function pointInPolygon([x, y]: LocalXY, poly: LocalXY[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

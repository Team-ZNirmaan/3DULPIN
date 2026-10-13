// Hatching for a "right of user" strip: the ground directly above an underground line, inside one plot.
// Pure geometry in east/north metres, so it can be tested without the map.

export type XY = [number, number]
export type Segment = [XY, XY]

/** Spacing between hatch lines, metres. */
export const HATCH_SPACING = 1.8

function insidePolygon([x, y]: XY, poly: XY[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Shortest distance from a point to a polyline. */
export function distanceToLine([px, py]: XY, line: XY[]): number {
  let best = Infinity
  for (let i = 0; i < line.length - 1; i++) {
    const [ax, ay] = line[i]
    const [bx, by] = line[i + 1]
    const dx = bx - ax
    const dy = by - ay
    const len2 = dx * dx + dy * dy
    const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0
    best = Math.min(best, Math.hypot(px - ax - t * dx, py - ay - t * dy))
  }
  return best
}

/** The parts of the segment p0 to p1 where `inside` holds. Boundaries are found to the millimetre. */
function runs(p0: XY, p1: XY, inside: (p: XY) => boolean, step = 0.25): Segment[] {
  const at = (t: number): XY => [p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t]
  const n = Math.max(1, Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / step))
  const boundary = (t0: number, t1: number, state0: boolean) => {
    for (let k = 0; k < 24; k++) {
      const mid = (t0 + t1) / 2
      if (inside(at(mid)) === state0) t0 = mid
      else t1 = mid
    }
    return (t0 + t1) / 2
  }
  const out: Segment[] = []
  let prev = inside(at(0))
  let start = prev ? 0 : -1
  for (let i = 1; i <= n; i++) {
    const cur = inside(at(i / n))
    if (cur !== prev) {
      const tb = boundary((i - 1) / n, i / n, prev)
      if (cur) start = tb
      else out.push([at(start), at(tb)])
    }
    prev = cur
  }
  if (prev) out.push([at(start), at(1)])
  return out.filter(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1]) > 0.05)
}

/** The polyline moved sideways by `d` metres (left is positive), with mitred corners. */
function offsetLine(line: XY[], d: number): XY[] {
  const normals = line.slice(1).map((b, i) => {
    const a = line[i]
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len] as XY
  })
  return line.map((p, i) => {
    const n1 = normals[Math.max(0, i - 1)]
    const n2 = normals[Math.min(normals.length - 1, i)]
    const k = d / (1 + n1[0] * n2[0] + n1[1] * n2[1])
    return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k]
  })
}

/**
 * Hatch lines and side edges for the strip within `radius` of `line`, clipped to `plot`.
 * Hatch lines run at 45 degrees to the line and sit on a fixed grid, so neighbouring plots line up.
 */
export function rightOfUserHatch(plot: XY[], line: XY[], radius: number, spacing = HATCH_SPACING): { hatch: Segment[]; edges: Segment[] } {
  const inStrip = (p: XY) => insidePolygon(p, plot) && distanceToLine(p, line) <= radius
  const [first, last] = [line[0], line[line.length - 1]]
  const angle = Math.atan2(last[1] - first[1], last[0] - first[0]) + Math.PI / 4
  const dir: XY = [Math.cos(angle), Math.sin(angle)]
  const across: XY = [-dir[1], dir[0]]
  const along = plot.map((p) => p[0] * dir[0] + p[1] * dir[1])
  const side = plot.map((p) => p[0] * across[0] + p[1] * across[1])
  const [a0, a1] = [Math.min(...along) - 1, Math.max(...along) + 1]

  const hatch: Segment[] = []
  for (let k = Math.floor(Math.min(...side) / spacing); k <= Math.ceil(Math.max(...side) / spacing); k++) {
    const o = k * spacing
    const base: XY = [across[0] * o, across[1] * o]
    hatch.push(...runs([base[0] + dir[0] * a0, base[1] + dir[1] * a0], [base[0] + dir[0] * a1, base[1] + dir[1] * a1], inStrip))
  }

  const edges: Segment[] = []
  for (const d of [radius, -radius]) {
    const off = offsetLine(line, d)
    for (let i = 0; i < off.length - 1; i++) edges.push(...runs(off[i], off[i + 1], (p) => insidePolygon(p, plot)))
  }
  return { hatch, edges }
}

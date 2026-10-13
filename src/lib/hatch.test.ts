import { describe, expect, it } from 'vitest'
import { lonLatToEnu } from '../data/geo'
import { plots, underground } from '../data'
import { distanceToLine, rightOfUserHatch, type XY } from './hatch'

const square: XY[] = [
  [0, 0],
  [40, 0],
  [40, 40],
  [0, 40],
]
const across: XY[] = [
  [-20, 20],
  [60, 20],
]

describe('right of user hatching', () => {
  it('stays inside the plot and within the strip above the line', () => {
    const { hatch, edges } = rightOfUserHatch(square, across, 3)
    expect(hatch.length).toBeGreaterThan(5)
    for (const [a, b] of hatch) {
      for (const p of [a, b]) {
        expect(p[0]).toBeGreaterThanOrEqual(-0.01)
        expect(p[0]).toBeLessThanOrEqual(40.01)
        expect(distanceToLine(p, across)).toBeLessThanOrEqual(3.01)
      }
    }
    // Two side edges, each crossing the whole plot.
    expect(edges).toHaveLength(2)
    for (const [a, b] of edges) expect(Math.hypot(b[0] - a[0], b[1] - a[1])).toBeCloseTo(40, 1)
  })

  it('is empty for a plot the line does not reach', () => {
    const far: XY[] = square.map(([x, y]) => [x, y + 100])
    const { hatch, edges } = rightOfUserHatch(far, across, 3)
    expect(hatch).toHaveLength(0)
    expect(edges).toHaveLength(0)
  })

  it('marks every plot that has a metro right of user', () => {
    for (const plot of plots) {
      for (const r of plot.restrictions.filter((x) => x.kind === 'right-of-user')) {
        const seg = underground.find((u) => u.code === r.segmentCode)!
        const { hatch } = rightOfUserHatch(plot.polygon.map(lonLatToEnu), seg.line.map(lonLatToEnu), seg.radiusM)
        expect(hatch.length, `CTS ${plot.cts}`).toBeGreaterThan(0)
      }
    }
  })
})

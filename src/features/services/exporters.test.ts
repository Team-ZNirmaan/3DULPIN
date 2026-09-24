import { describe, expect, it } from 'vitest'
import { toUtm } from './exporters'

describe('toUtm', () => {
  it('maps the central meridian at the equator to the false easting', () => {
    const [x, y] = toUtm([75, 0], 43)
    expect(x).toBeCloseTo(500000, 3)
    expect(y).toBeCloseTo(0, 3)
  })

  it('places the pilot site east of the zone 43 central meridian', () => {
    const [x, y] = toUtm([77.4126, 23.2599], 43)
    expect(x).toBeGreaterThan(740000)
    expect(x).toBeLessThan(750000)
    expect(y).toBeGreaterThan(2570000)
    expect(y).toBeLessThan(2580000)
  })

  it('preserves metric distances locally (~1 m east ≈ 1 m in UTM)', () => {
    const [x0] = toUtm([77.4126, 23.2599])
    const [x1] = toUtm([77.4126 + 1 / (111320 * Math.cos((23.2599 * Math.PI) / 180)), 23.2599])
    expect(x1 - x0).toBeGreaterThan(0.99)
    expect(x1 - x0).toBeLessThan(1.01)
  })
})

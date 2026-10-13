import { describe, expect, it } from 'vitest'
import { ALPHABET, parseCode } from '../lib/ulpin'
import { lonLatToLocal, pointInPolygon } from './geo'
import { allCodes, findByCode, plots, spaces, towerPlot, underground } from './index'
import { FLOOR_PLATE, LEVELS } from './tower'
import type { LocalXY, Space } from './types'

const leaves = spaces.filter((s) => ['U', 'L', 'P', 'C'].includes(s.type))
const building = spaces.find((s) => s.type === 'B')!
const plotVolume = spaces.find((s) => s.type === 'S')!

const bbox = (p: LocalXY[]) => ({
  x0: Math.min(...p.map((v) => v[0])),
  x1: Math.max(...p.map((v) => v[0])),
  y0: Math.min(...p.map((v) => v[1])),
  y1: Math.max(...p.map((v) => v[1])),
})
const zOverlap = (a: Space, b: Space) => a.zBottom < b.zTop - 1e-6 && b.zBottom < a.zTop - 1e-6
/** Grid points every `step` metres (cell centres) over a box. */
function* grid(b: ReturnType<typeof bbox>, step: number) {
  for (let x = b.x0 + step / 2; x < b.x1; x += step) for (let y = b.y0 + step / 2; y < b.y1; y += step) yield [x, y] as LocalXY
}

describe('3D-ULPIN codes', () => {
  it('every code is valid and unique', () => {
    expect(new Set(allCodes).size).toBe(allCodes.length)
    for (const code of allCodes) expect(parseCode(code).ok, code).toBe(true)
  })

  it("each code's parts match its space", () => {
    for (const s of spaces) {
      const r = parseCode(s.code)
      if (!r.ok) throw new Error(s.code)
      expect(r.parts).toMatchObject({ parent: towerPlot.ulpin, type: s.type, building: s.building, level: s.level, unit: s.unit })
    }
  })

  it('every single-character typo in every code is caught', () => {
    for (const code of allCodes) {
      for (let i = 0; i < code.length; i++) {
        if (code[i] === '-') continue
        for (const ch of ALPHABET) {
          if (ch !== code[i]) expect(parseCode(code.slice(0, i) + ch + code.slice(i + 1)).ok).toBe(false)
        }
      }
    }
  })

  it('every swap of two neighbouring characters is caught', () => {
    for (const code of allCodes) {
      const chars = code.replace('-', '')
      for (let i = 0; i < chars.length - 1; i++) {
        if (chars[i] === chars[i + 1]) continue
        const swapped = chars.slice(0, i) + chars[i + 1] + chars[i] + chars.slice(i + 2)
        expect(parseCode(swapped).ok, `${code} swap at ${i}`).toBe(false)
      }
    }
  })
})

describe('Tower 1 geometry (the checks M4 runs before codes are issued)', () => {
  it('has the expected spaces', () => {
    const count = (t: string) => spaces.filter((s) => s.type === t).length
    expect({ S: count('S'), B: count('B'), U: count('U'), L: count('L'), P: count('P'), C: count('C') }).toEqual({ S: 1, B: 1, U: 32, L: 24, P: 8, C: 22 })
  })

  it('no two spaces overlap', () => {
    for (let i = 0; i < leaves.length; i++) {
      for (let j = i + 1; j < leaves.length; j++) {
        const [a, b] = [leaves[i], leaves[j]]
        if (!zOverlap(a, b)) continue
        const [ba, bb] = [bbox(a.footprint), bbox(b.footprint)]
        const box = { x0: Math.max(ba.x0, bb.x0), x1: Math.min(ba.x1, bb.x1), y0: Math.max(ba.y0, bb.y0), y1: Math.min(ba.y1, bb.y1) }
        if (box.x0 >= box.x1 || box.y0 >= box.y1) continue
        for (const p of grid(box, 0.25)) {
          if (pointInPolygon(p, a.footprint) && pointInPolygon(p, b.footprint)) throw new Error(`${a.code} overlaps ${b.code} at ${p}`)
        }
      }
    }
  })

  it('no gaps: every point of every level belongs to exactly one space', () => {
    for (const lvl of LEVELS) {
      const mid = (lvl.bottom + lvl.top) / 2
      const here = leaves.filter((s) => s.zBottom < mid && mid < s.zTop)
      for (const p of grid(bbox(FLOOR_PLATE), 0.5)) {
        const n = here.filter((s) => pointInPolygon(p, s.footprint)).length
        expect(n, `level ${lvl.level} at ${p}`).toBe(1)
      }
    }
  })

  it('every space sits inside the building, and the building inside the plot', () => {
    for (const s of leaves) {
      for (const p of s.footprint) {
        const b = bbox(building.footprint)
        expect(p[0] >= b.x0 - 1e-6 && p[0] <= b.x1 + 1e-6 && p[1] >= b.y0 - 1e-6 && p[1] <= b.y1 + 1e-6, s.code).toBe(true)
      }
      expect(s.zBottom).toBeGreaterThanOrEqual(building.zBottom)
      expect(s.zTop).toBeLessThanOrEqual(building.zTop)
    }
    for (const p of building.footprint) expect(pointInPolygon(p, plotVolume.footprint), `building corner ${p}`).toBe(true)
    expect(plotVolume.zBottom).toBeLessThan(building.zBottom)
    expect(plotVolume.zTop).toBeGreaterThan(building.zTop)
  })

  it('undivided shares of the 32 flats add up to 100%', () => {
    const total = spaces.reduce((sum, s) => sum + (s.undividedSharePct ?? 0), 0)
    expect(total).toBeCloseTo(100, 2)
  })

  it('every allotted bay belongs to a flat, and that flat lists it', () => {
    for (const bay of spaces.filter((s) => s.type === 'L')) {
      const flat = findByCode(bay.allottedTo!) as Space
      expect(flat?.type).toBe('U')
      expect(flat.parkingCodes).toContain(bay.code)
    }
    const withParking = spaces.filter((s) => s.type === 'U' && s.parkingCodes!.length > 0)
    expect(withParking).toHaveLength(24)
  })
})

describe('underground lines and the plots above them', () => {
  const basementBottom = Math.min(...spaces.map((s) => s.zBottom).filter((z) => z > -10))

  it('the metro tunnel passes well clear of the basements', () => {
    for (const t of underground.filter((u) => u.kind === 'metro-tunnel')) {
      const crownDepth = t.axisDepthM - t.radiusM
      expect(crownDepth - -basementBottom).toBeGreaterThan(10) // more than 10 m of ground between them
    }
  })

  it('the water main runs outside the basement footprint', () => {
    const water = underground.find((u) => u.kind === 'water-main')!
    const line = water.line.map(lonLatToLocal)
    for (let k = 0; k <= 100; k++) {
      const p: LocalXY = [line[0][0] + ((line[1][0] - line[0][0]) * k) / 100, line[0][1] + ((line[1][1] - line[0][1]) * k) / 100]
      expect(pointInPolygon(p, FLOOR_PLATE)).toBe(false)
    }
  })

  it('every plot above a line carries a restriction pointing to that line', () => {
    for (const u of underground) {
      for (const cts of u.underPlots) {
        const plot = plots.find((p) => p.cts === cts)!
        expect(plot.restrictions.map((r) => r.segmentCode)).toContain(u.code)
      }
    }
    expect(towerPlot.restrictions).toHaveLength(3)
    for (const p of plots) for (const r of p.restrictions) expect(findByCode(r.segmentCode), r.segmentCode).toBeDefined()
  })
})

describe('plots', () => {
  it('have unique, well-formed ULPINs and CTS numbers', () => {
    expect(plots).toHaveLength(15)
    expect(new Set(plots.map((p) => p.ulpin)).size).toBe(15)
    expect(new Set(plots.map((p) => p.cts)).size).toBe(15)
    for (const p of plots) expect(p.ulpin).toMatch(/^[0-9A-Z]{14}$/)
  })

  it('do not overlap each other', () => {
    const local = plots.map((p) => ({ cts: p.cts, poly: p.polygon.map(lonLatToLocal) }))
    for (let i = 0; i < local.length; i++) {
      for (let j = i + 1; j < local.length; j++) {
        for (const p of grid(bbox(local[i].poly), 1)) {
          if (pointInPolygon(p, local[i].poly) && pointInPolygon(p, local[j].poly)) throw new Error(`CTS ${local[i].cts} overlaps CTS ${local[j].cts}`)
        }
      }
    }
  })
})

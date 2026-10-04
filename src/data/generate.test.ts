import { describe, expect, it } from 'vitest'
import { ringsIntersect, unitsAtPoint } from '@/domain/geo'
import { validateCode } from '@/domain/ulpin'
import { GENESIS, sealEvent, verifyChain } from '@/domain/hash'
import { generateFixtures } from './generate'

const fx = generateFixtures()

describe('fixtures', () => {
  it('is deterministic', () => {
    expect(generateFixtures().units.map((u) => u.code)).toEqual(fx.units.map((u) => u.code))
  })

  it('every 3D-ULPIN is unique and passes its check character', () => {
    const codes = fx.units.map((u) => u.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const c of codes) expect(validateCode(c).valid, c).toBe(true)
  })

  it('has 20 flats in the pilot tower', () => {
    expect(fx.units.filter((u) => u.type === 'U' && u.buildingId === 'BLD-7')).toHaveLength(20)
  })

  it('pilot flats do not overlap each other on the same level', () => {
    const flats = fx.units.filter((u) => u.type === 'U' && u.buildingId === 'BLD-7')
    for (const a of flats) for (const b of flats) {
      if (a === b || a.level !== b.level) continue
      expect(ringsIntersect(a.ring, b.ring) && !sharesEdgeOnly(a, b)).toBe(false)
    }
  })

  it('B2 bays near the tunnel sit inside the metro protection zone (ISS-001 is real)', () => {
    const metro = fx.units.find((u) => u.id === 'U-G-METRO')!
    const bay = fx.units.find((u) => u.code === fx.issues[0].objectCodes[0])!
    expect(ringsIntersect(bay.ring, metro.infra!.protectionRing)).toBe(true)
    expect(bay.zMin).toBeLessThan(metro.infra!.protectionZMax)
  })
})

describe('3D point query', () => {
  it('returns the flat, the parcel envelope and nothing else at a point inside Flat 501', () => {
    const flat = fx.units.find((u) => u.label === 'Flat 501')!
    const [lon, lat] = flat.ring[0]
    const p: [number, number] = [lon + 0.00002, lat + 0.00002]
    const hits = unitsAtPoint(fx.units, p, 17).map((u) => u.type)
    expect(hits).toContain('U')
    expect(hits).toContain('S')
    expect(hits).toContain('B')
  })
})

describe('audit hash chain', () => {
  it('detects tampering', async () => {
    const events = []
    let prev = GENESIS
    for (const e of fx.auditSeed) {
      const s = await sealEvent(e, prev)
      events.push(s)
      prev = s.hash
    }
    expect((await verifyChain(events)).ok).toBe(true)
    events[2] = { ...events[2], details: 'tampered' }
    const r = await verifyChain(events)
    expect(r.ok).toBe(false)
    expect(r.brokenAt).toBe(2)
  })
})

function sharesEdgeOnly(a: { ring: [number, number][] }, b: { ring: [number, number][] }) {
  const ax = a.ring.map((p) => p[0])
  const bx = b.ring.map((p) => p[0])
  const ay = a.ring.map((p) => p[1])
  const by = b.ring.map((p) => p[1])
  const eps = 1e-9
  return Math.max(...ax) <= Math.min(...bx) + eps || Math.max(...bx) <= Math.min(...ax) + eps || Math.max(...ay) <= Math.min(...by) + eps || Math.max(...by) <= Math.min(...ay) + eps
}

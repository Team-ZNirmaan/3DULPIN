import { describe, expect, it } from 'vitest'
import { plots, SITE, spaces, TOWER, underground } from '../data'
import { HOLDERS } from '../data/site'
import { localDataOrNull } from './localData'

// Every piece of record text shown on screen needs a Hindi form.
const recordText = [
  TOWER.name,
  TOWER.society,
  TOWER.road,
  SITE.village,
  SITE.taluka,
  SITE.district,
  ...Object.values(HOLDERS),
  ...spaces.flatMap((s) => [s.holder ?? '', ...s.rights.flatMap((r) => [r.holder, r.source.ref])]),
  ...underground.flatMap((u) => u.rights.flatMap((r) => [r.holder, r.source.ref])),
  ...plots.flatMap((p) => p.restrictions.flatMap((r) => [r.holder, r.source.ref])),
].filter(Boolean)

describe('record text in Hindi', () => {
  it('has a Hindi form for every name, place, authority and document', () => {
    const missing = [...new Set(recordText)].filter((t) => localDataOrNull('hi', t) === null)
    expect(missing).toEqual([])
  })

  it('keeps the numbers of document references', () => {
    expect(localDataOrNull('hi', 'Sub-Registrar Haveli 4, Doc. 12149/2026')).toBe('उप-पंजीयक हवेली 4, दस्तावेज़ 12149/2026')
    expect(localDataOrNull('hi', 'NR/PARKING/B2-06')).toBe('NR/PARKING/B2-06')
  })

  it('leaves English as it is', () => {
    for (const t of recordText) expect(localDataOrNull('en', t)).toBe(t)
  })

  it('uses no em dashes or middle dots', () => {
    for (const t of recordText) expect(localDataOrNull('hi', t)).not.toMatch(/[—·]/)
  })
})

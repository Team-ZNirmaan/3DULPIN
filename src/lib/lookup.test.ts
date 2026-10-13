import { describe, expect, it } from 'vitest'
import { spaces, towerPlot, underground } from '../data'
import { formatCode } from './ulpin'
import { lookup } from './lookup'

const flat502 = spaces.find((s) => s.kind === 'flat' && s.number === '502')!

describe('search lookup', () => {
  it('finds a plot by CTS number or ULPIN, in any case', () => {
    for (const q of ['1177', 'CTS 1177', 'cts1177', towerPlot.ulpin, towerPlot.ulpin.toLowerCase()]) {
      const r = lookup(q, false)
      expect(r.kind, q).toBe('plot')
      if (r.kind === 'plot') expect(r.plot.cts).toBe('1177')
    }
  })

  it('finds a 3D space by its code, with or without the hyphen', () => {
    for (const q of [flat502.code, flat502.code.toLowerCase(), flat502.code.replace('-', ''), ` ${flat502.code} `]) {
      const r = lookup(q, true)
      expect(r.kind, q).toBe('space')
    }
  })

  it('says a tower code is not issued before the tower is registered', () => {
    expect(lookup(flat502.code, false).kind).toBe('not-issued')
  })

  it('finds an underground line whether or not the tower is registered', () => {
    expect(lookup(underground[0].code, false).kind).toBe('line')
  })

  it('marks the swapped characters of a transposition and suggests the right code', () => {
    // Flat 502 with the two level digits swapped: 05 typed as 50.
    const typed = flat502.code.replace('-U105', '-U150')
    const r = lookup(typed, true)
    expect(r.kind).toBe('typo')
    if (r.kind !== 'typo') return
    expect(r.suggestions).toEqual([flat502.code])
    expect(r.marks).toEqual([
      { start: 17, end: 18 },
      { start: 18, end: 19 },
    ])
  })

  it('marks a single wrong character', () => {
    const typed = 'X' + flat502.code.slice(1)
    const r = lookup(typed, true)
    expect(r.kind).toBe('typo')
    if (r.kind === 'typo') {
      expect(r.suggestions).toContain(flat502.code)
      expect(r.marks).toContainEqual({ start: 0, end: 1 })
    }
  })

  it('points at the part that breaks the scheme', () => {
    const wrongType = flat502.code.replace('-U', '-Q')
    const r = lookup(wrongType, true)
    expect(r.kind).toBe('format')
    if (r.kind === 'format') expect(r).toMatchObject({ part: 'type', mark: { start: 15, end: 16 } })
    const short = lookup(flat502.code.slice(0, 20), true)
    expect(short.kind).toBe('format')
  })

  it('tells apart a well formed code that is not on record', () => {
    const code = formatCode({ parent: towerPlot.ulpin, type: 'U', building: '1', level: '05', unit: '009' })
    expect(lookup(code, true)).toEqual({ kind: 'unknown-code', code })
  })

  it('returns nothing for unrelated text', () => {
    expect(lookup('Shivajinagar', true).kind).toBe('none')
    expect(lookup('9999', true).kind).toBe('none')
  })
})

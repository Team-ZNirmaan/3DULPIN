import { describe, expect, it } from 'vitest'
import { ALPHABET, checkCharFor, checksum, formatCode, normalize, parseCode, seq } from './ulpin'

describe('ISO 7064 MOD 37,36', () => {
  // Published reference example (GRid A1-2425G-ABC1234002-M), also used by python-stdnum.
  it('matches the published reference example', () => {
    expect(checkCharFor('A12425GABC1234002')).toBe('M')
    expect(checksum('A12425GABC1234002M')).toBe(1)
  })
})

describe('3D-ULPIN scheme', () => {
  // The four worked examples in the technical spec (C8.1), parent XX00XX0000XXXX.
  const P = 'XX00XX0000XXXX'
  it.each([
    [{ type: 'U', building: '1', level: '05', unit: '002' }, 'XX00XX0000XXXX-U1050027'],
    [{ type: 'L', building: '1', level: 'B2', unit: '00C' }, 'XX00XX0000XXXX-L1B200CQ'],
    [{ type: 'C', building: '1', level: 'XX', unit: '001' }, 'XX00XX0000XXXX-C1XX0011'],
    [{ type: 'S', building: '0', level: '00', unit: '000' }, 'XX00XX0000XXXX-S0000004'],
  ] as const)('reproduces the spec example %#', (parts, expected) => {
    expect(formatCode({ parent: P, ...parts })).toBe(expected)
  })

  it('writes unit sequences in base 36', () => {
    expect(seq(1)).toBe('001')
    expect(seq(12)).toBe('00C')
    expect(seq(36)).toBe('010')
  })

  it('accepts lowercase, spaces and a missing hyphen', () => {
    expect(normalize(' xx00xx0000xxxx u1050027 ')).toBe('XX00XX0000XXXX-U1050027')
    expect(normalize('XX00XX0000XXXXU1050027')).toBe('XX00XX0000XXXX-U1050027')
    expect(parseCode('xx00xx0000xxxx-u1050027').ok).toBe(true)
  })

  it('tells a wrong shape apart from a typing mistake', () => {
    expect(parseCode('')).toMatchObject({ ok: false, reason: 'empty' })
    expect(parseCode('ABC-123')).toMatchObject({ ok: false, reason: 'format' })
    expect(parseCode('XX00XX0000XXXX-U1050028')).toMatchObject({ ok: false, reason: 'check' })
  })

  it('catches every single-character typo in a code', () => {
    const code = 'XX00XX0000XXXX-U1050027'
    for (let i = 0; i < code.length; i++) {
      if (code[i] === '-') continue
      for (const ch of ALPHABET) {
        if (ch === code[i]) continue
        const typo = code.slice(0, i) + ch + code.slice(i + 1)
        expect(parseCode(typo).ok, typo).toBe(false)
      }
    }
  })
})

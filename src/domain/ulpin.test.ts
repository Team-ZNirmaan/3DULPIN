import { describe, expect, it } from 'vitest'
import { ALPHABET, checkChar, levelCode, makeCode, validateCode } from './ulpin'

const PARENT = 'DEMO27PN0417A2'

describe('ISO 7064 MOD 37,36 check character', () => {
  it('generated codes validate', () => {
    for (let seq = 1; seq <= 50; seq++) {
      const code = makeCode(PARENT, 'U', '1', levelCode(seq % 6), seq)
      expect(validateCode(code).valid).toBe(true)
    }
  })

  it('detects every single-character substitution', () => {
    const body = `${PARENT}U105002`
    const c = checkChar(body)
    for (let i = 0; i < body.length; i++) {
      for (const ch of ALPHABET) {
        if (ch === body[i]) continue
        const mutated = body.slice(0, i) + ch + body.slice(i + 1)
        expect(checkChar(mutated)).not.toBe(c)
      }
    }
  })

  it('detects adjacent transpositions', () => {
    const body = `${PARENT}U105002`
    const c = checkChar(body)
    for (let i = 0; i < body.length - 1; i++) {
      if (body[i] === body[i + 1]) continue
      const swapped = body.slice(0, i) + body[i + 1] + body[i] + body.slice(i + 2)
      expect(checkChar(swapped)).not.toBe(c)
    }
  })
})

describe('validateCode', () => {
  it('accepts hyphen-less and lowercase input', () => {
    const code = makeCode(PARENT, 'L', '1', 'B2', 12)
    expect(validateCode(code.replace('-', '').toLowerCase()).valid).toBe(true)
  })

  it('reports a wrong check character with the expected value', () => {
    const code = makeCode(PARENT, 'U', '1', '05', 2)
    const wrong = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A')
    const r = validateCode(wrong)
    expect(r.formatOk).toBe(true)
    expect(r.checkOk).toBe(false)
    expect(r.expectedCheck).toBe(code.slice(-1))
  })

  it('accepts a bare parent ULPIN', () => {
    expect(validateCode(PARENT).isParentOnly).toBe(true)
  })

  it('rejects malformed input', () => {
    expect(validateCode('ABC-123').formatOk).toBe(false)
  })
})

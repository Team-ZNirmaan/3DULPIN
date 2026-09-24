import type { UnitType } from './types'

export const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const M = 36

function valueOf(ch: string): number {
  const v = ALPHABET.indexOf(ch)
  if (v < 0) throw new Error(`Invalid character "${ch}"`)
  return v
}

/** ISO/IEC 7064 MOD 37,36 (hybrid system) check character. */
export function checkChar(body: string): string {
  let p = M
  for (const ch of body.toUpperCase()) {
    let s = (p + valueOf(ch)) % M
    if (s === 0) s = M
    p = (s * 2) % (M + 1)
  }
  return ALPHABET[(M + 1 - p) % M]
}

export const UNIT_TYPES: Record<UnitType, { en: string; hi: string }> = {
  S: { en: 'Surface parcel rights envelope', hi: 'सतही पार्सल अधिकार आवरण' },
  B: { en: 'Building envelope', hi: 'भवन आवरण' },
  U: { en: 'Exclusive unit', hi: 'अनन्य इकाई' },
  L: { en: 'Limited common (allotted)', hi: 'सीमित साझा (आवंटित)' },
  C: { en: 'Common area', hi: 'साझा क्षेत्र' },
  P: { en: 'Parking bay (common pool)', hi: 'पार्किंग (साझा)' },
  G: { en: 'Underground infrastructure', hi: 'भूमिगत अवसंरचना' },
  A: { en: 'Elevated / air-space infrastructure', hi: 'उन्नत / वायु-क्षेत्र अवसंरचना' },
}

export const NETWORK_CLASSES: Record<string, string> = {
  W: 'Water',
  S: 'Sewer',
  E: 'Power',
  T: 'Telecom',
  M: 'Metro',
  R: 'Road',
}

export function levelCode(index: number): string {
  if (index < 0) return `B${Math.abs(index)}`
  return String(index).padStart(2, '0')
}

export function describeLevel(ll: string): string {
  if (ll === '00') return 'Ground / stilt'
  if (ll === 'RF') return 'Roof / terrace'
  if (ll === 'XX') return 'Spans multiple levels'
  if (/^B[1-9]$/.test(ll)) return `Basement ${ll[1]}`
  if (/^M[1-9]$/.test(ll)) return `Mezzanine ${ll[1]}`
  if (/^\d\d$/.test(ll)) return `Floor ${Number(ll)}`
  return 'Unknown level'
}

export function toBase36(n: number, width: number): string {
  return n.toString(36).toUpperCase().padStart(width, '0')
}

export function makeCode(parent: string, type: UnitType, building: string, level: string, seq: number): string {
  const suffix = `${type}${building}${level}${toBase36(seq, 3)}`
  return `${parent}-${suffix}${checkChar(parent + suffix)}`
}

export interface CodeParts {
  parent: string
  type: string
  building: string
  level: string
  unit: string
  check: string
}

export interface CodeValidation {
  input: string
  normalized: string
  valid: boolean
  formatOk: boolean
  checkOk: boolean
  expectedCheck?: string
  parts?: CodeParts
  errors: string[]
  isParentOnly: boolean
}

const FULL = /^([0-9A-Z]{14})-?([SBULCPGA])([0-9A-Z])([0-9A-Z]{2})([0-9A-Z]{3})([0-9A-Z])$/
const PARENT = /^[0-9A-Z]{14}$/

export function validateCode(input: string): CodeValidation {
  const normalized = input.trim().toUpperCase().replace(/\s+/g, '')
  const base: CodeValidation = { input, normalized, valid: false, formatOk: false, checkOk: false, errors: [], isParentOnly: false }

  if (PARENT.test(normalized)) {
    return { ...base, valid: true, formatOk: true, checkOk: true, isParentOnly: true }
  }

  const m = FULL.exec(normalized)
  if (!m) {
    const errors = ['Expected 14-character parent ULPIN, "-", then 8-character vertical extension (T B LL UUU C).']
    if (/[^0-9A-Z-]/.test(normalized)) errors.push('Only digits 0–9, letters A–Z and "-" are allowed.')
    return { ...base, errors }
  }

  const [, parent, type, building, level, unit, check] = m
  const parts: CodeParts = { parent, type, building, level, unit, check }
  const expectedCheck = checkChar(parent + type + building + level + unit)
  const checkOk = expectedCheck === check
  const errors: string[] = []
  if (!checkOk) errors.push(`Check character mismatch: expected "${expectedCheck}", found "${check}". The code was likely mistyped.`)
  if (type !== 'G' && type !== 'A' && describeLevel(level) === 'Unknown level') errors.push(`Level "${level}" is not a valid level code.`)

  return {
    ...base,
    normalized: `${parent}-${type}${building}${level}${unit}${check}`,
    formatOk: true,
    checkOk,
    expectedCheck,
    parts,
    valid: errors.length === 0,
    errors,
  }
}

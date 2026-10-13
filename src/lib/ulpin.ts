// 3D-ULPIN: the parent ULPIN (14 characters), then type, building, level, unit and a check character.
//
//   XX00XX0000XXXX - U 1 05 002 7
//   parent ULPIN     T B LL UUU C
//
// Scheme from the technical spec (C8.1). The check character is ISO 7064 MOD 37,36, computed over
// the 21 characters with the hyphen removed. It catches every single-character typo.

export const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const M = 36

export const SPACE_TYPES = ['S', 'B', 'U', 'L', 'C', 'P', 'G'] as const
export type SpaceType = (typeof SPACE_TYPES)[number]

/** Level field: 00 ground, 01–99 above, B1–B9 basements, M1–M9 mezzanines, RF roof, XX multi-level. */
export type Level = string

export type CodeParts = {
  /** Parent ULPIN, or the network root for underground networks (type G). 14 characters. */
  parent: string
  type: SpaceType
  /** Building index (0 = parcel level, 1–9, A–Z). For type G: network class (M metro, W water, S sewer, E power, T telecom). */
  building: string
  level: Level
  /** Sequence within the level, base 36, 3 characters. */
  unit: string
}

export type ParsedCode = CodeParts & { check: string; code: string }

export type ParseResult =
  | { ok: true; parts: ParsedCode }
  | { ok: false; reason: 'empty' | 'format' | 'check'; normalized: string }

const PARENT_RE = /^[0-9A-Z]{14}$/
const CODE_RE = /^([0-9A-Z]{14})-([SBULCPG])([0-9A-Z])(\d{2}|B[1-9]|M[1-9]|RF|XX)([0-9A-Z]{3})([0-9A-Z])$/

const mod = (n: number, m: number) => ((n % m) + m) % m

function value(ch: string): number {
  const v = ALPHABET.indexOf(ch)
  if (v < 0) throw new Error(`Character "${ch}" is not allowed in a 3D-ULPIN`)
  return v
}

/** ISO 7064 MOD 37,36 running checksum. A correct code including its check character gives 1. */
export function checksum(chars: string): number {
  let check = M / 2
  for (const ch of chars) check = mod(mod((check || M) * 2, M + 1) + value(ch), M)
  return check
}

/** The check character for the given characters (hyphen already removed). */
export function checkCharFor(chars: string): string {
  return ALPHABET[mod(1 - mod((checksum(chars) || M) * 2, M + 1), M)]
}

export const isValidCheck = (charsWithCheck: string) => checksum(charsWithCheck) === 1

/** Unit sequence number as 3 base-36 characters: 1 → "001", 12 → "00C". */
export function seq(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= M ** 3) throw new Error(`Sequence ${n} is out of range`)
  return n.toString(36).toUpperCase().padStart(3, '0')
}

/** Floor number as a level field: 0 → "00", 5 → "05". Basements use "B1"…, the roof "RF". */
export const floorLevel = (floor: number) => String(floor).padStart(2, '0')

/** Builds the full 3D-ULPIN, including its check character. */
export function formatCode(parts: CodeParts): string {
  const { parent, type, building, level, unit } = parts
  if (!PARENT_RE.test(parent)) throw new Error(`Parent "${parent}" must be 14 characters, 0–9 or A–Z`)
  const suffix = `${type}${building}${level}${unit}`
  const code = `${parent}-${suffix}${checkCharFor(parent + suffix)}`
  if (!CODE_RE.test(code)) throw new Error(`"${code}" does not follow the 3D-ULPIN scheme`)
  return code
}

/** Uppercases, removes spaces, and adds the hyphen if someone typed the 22 characters without it. */
export function normalize(input: string): string {
  const s = input.toUpperCase().replace(/[\s‐-―]+/g, (m) => (m.trim() ? '-' : ''))
  return /^[0-9A-Z]{22}$/.test(s) ? `${s.slice(0, 14)}-${s.slice(14)}` : s
}

/** Reads a typed 3D-ULPIN. Tells apart a code with the wrong shape from one with a typing mistake. */
export function parseCode(input: string): ParseResult {
  const normalized = normalize(input)
  if (!normalized) return { ok: false, reason: 'empty', normalized }
  const m = CODE_RE.exec(normalized)
  if (!m) return { ok: false, reason: 'format', normalized }
  const [, parent, type, building, level, unit, check] = m
  if (!isValidCheck(normalized.replace('-', ''))) return { ok: false, reason: 'check', normalized }
  return { ok: true, parts: { parent, type: type as SpaceType, building, level, unit, check, code: normalized } }
}

export const isParentUlpin = (s: string) => PARENT_RE.test(s)

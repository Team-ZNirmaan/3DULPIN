import { findByCode, findPlotByCts, findPlotByUlpin, plots, spaces, underground, type Plot, type Space, type UndergroundAsset } from '../data'
import { NETWORK_ROOTS } from '../data/site'
import { normalize, parseCode } from './ulpin'

// What a search box entry points at: a plot (by CTS number or ULPIN), a 3D space or underground line
// (by 3D-ULPIN), or a code with a typing mistake, with the wrong part marked.

/** Characters [start, end) of the typed code (hyphen included) to mark as wrong. */
export type Mark = { start: number; end: number }

/** The part of a 3D-ULPIN that does not follow the scheme. */
export type FormatPart = 'parent' | 'type' | 'building' | 'level' | 'unit' | 'check' | 'extra'

export type Lookup =
  | { kind: 'empty' }
  | { kind: 'plot'; plot: Plot }
  | { kind: 'space'; space: Space }
  /** A correct code for a space whose building has not been registered yet. */
  | { kind: 'not-issued'; space: Space }
  | { kind: 'line'; line: UndergroundAsset }
  | { kind: 'network'; root: string; lines: UndergroundAsset[] }
  /** Well formed, check character right, but no such space on record. */
  | { kind: 'unknown-code'; code: string }
  /** The check character does not match: a typing mistake. */
  | { kind: 'typo'; typed: string; marks: Mark[]; suggestions: string[] }
  /** Not shaped like a 3D-ULPIN. */
  | { kind: 'format'; typed: string; part: FormatPart; mark: Mark }
  | { kind: 'unknown-ulpin'; ulpin: string; suggestions: Plot[] }
  | { kind: 'none'; query: string }

const CTS_RE = /^(?:CTS\s*(?:NO\.?)?\s*)?(\d{3,5})$/i

/**
 * Codes that differ from `typed` by one character, or by two neighbouring characters swapped: the
 * typing mistakes a check character is there to catch. Returns the codes and the positions that differ.
 */
function nearCodes(typed: string, candidates: string[]): { code: string; diff: number[] }[] {
  const out: { code: string; diff: number[] }[] = []
  for (const c of candidates) {
    if (c.length !== typed.length) continue
    const diff: number[] = []
    for (let i = 0; i < c.length && diff.length <= 2; i++) if (c[i] !== typed[i]) diff.push(i)
    const swapped = diff.length === 2 && diff[1] === diff[0] + 1 && c[diff[0]] === typed[diff[1]] && c[diff[1]] === typed[diff[0]]
    if (diff.length === 1 || swapped) out.push({ code: c, diff })
  }
  return out
}

/** Finds the first part of a typed code that breaks the scheme: PPPPPPPPPPPPPP-TBLLUUUC. */
export function formatProblem(s: string): { part: FormatPart; mark: Mark } {
  const hyphen = s.indexOf('-')
  const parentEnd = hyphen < 0 ? Math.min(s.length, 14) : hyphen
  if (parentEnd !== 14 || !/^[0-9A-Z]{14}$/.test(s.slice(0, 14)) || (hyphen < 0 && s.length > 14)) {
    return { part: 'parent', mark: { start: 0, end: Math.max(1, parentEnd) } }
  }
  const at = (i: number, j: number, part: FormatPart, re: RegExp) => (re.test(s.slice(i, j)) ? null : { part, mark: { start: i, end: Math.max(i + 1, Math.min(j, s.length)) } })
  return (
    at(15, 16, 'type', /^[SBULCPG]$/) ??
    at(16, 17, 'building', /^[0-9A-Z]$/) ??
    at(17, 19, 'level', /^(\d{2}|B[1-9]|M[1-9]|RF|XX)$/) ??
    at(19, 22, 'unit', /^[0-9A-Z]{3}$/) ??
    at(22, 23, 'check', /^[0-9A-Z]$/) ?? { part: 'extra', mark: { start: 23, end: s.length } }
  )
}

/** What a search box entry points at. Tower codes count as issued only once the tower is registered. */
export function lookup(query: string, towerRegistered: boolean): Lookup {
  const q = query.trim()
  if (!q) return { kind: 'empty' }

  const cts = CTS_RE.exec(q)
  if (cts) {
    const plot = findPlotByCts(cts[1])
    return plot ? { kind: 'plot', plot } : { kind: 'none', query: q }
  }

  const s = normalize(q)
  if (/^[0-9A-Z]{14}$/.test(s)) {
    const plot = findPlotByUlpin(s)
    if (plot) return { kind: 'plot', plot }
    const network = Object.values(NETWORK_ROOTS).includes(s)
    if (network) return { kind: 'network', root: s, lines: underground.filter((u) => u.code.startsWith(s)) }
    const near = nearCodes(
      s,
      plots.map((p) => p.ulpin),
    ).map((n) => findPlotByUlpin(n.code)!)
    return { kind: 'unknown-ulpin', ulpin: s, suggestions: near }
  }

  // Anything longer than a ULPIN, or with a hyphen, is read as a 3D-ULPIN.
  if (s.length > 14 || s.includes('-')) {
    const r = parseCode(s)
    if (r.ok) {
      const found = findByCode(r.parts.code)
      if (!found) return { kind: 'unknown-code', code: r.parts.code }
      if (!('type' in found)) return { kind: 'line', line: found }
      return towerRegistered ? { kind: 'space', space: found } : { kind: 'not-issued', space: found }
    }
    if (r.reason === 'check') {
      const issued = [...(towerRegistered ? spaces.map((sp) => sp.code) : []), ...underground.map((u) => u.code)]
      const near = nearCodes(r.normalized, issued)
      const marked = [...new Set(near.flatMap((n) => n.diff))].sort((a, b) => a - b)
      return {
        kind: 'typo',
        typed: r.normalized,
        marks: marked.map((i) => ({ start: i, end: i + 1 })),
        suggestions: near.map((n) => n.code),
      }
    }
    return { kind: 'format', typed: r.normalized, ...formatProblem(r.normalized) }
  }

  return { kind: 'none', query: q }
}

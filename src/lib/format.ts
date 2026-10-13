import type { TFunction } from 'i18next'
import type { Level } from './ulpin'
import { lonLatToEnu, toMsl } from '../data/geo'
import type { Space, UndergroundAsset } from '../data'

// Shared wording for levels, numbers and heights, so every screen says them the same way.

export function levelName(t: TFunction, level: Level): string {
  if (level === 'B1' || level === 'B2' || level === '00' || level === 'RF' || level === 'XX') return t(`levels.${level}`)
  return t('levels.floor', { n: Number(level) })
}

/** Short label for the floor slicer: G, 1–8, T (or the Hindi equivalents). */
export function levelShort(t: TFunction, level: Level): string {
  if (level === '00' || level === 'RF') return t(`levelsShort.${level}`)
  if (level === 'B1' || level === 'B2') return level
  return String(Number(level))
}

const formatters = new Map<string, Intl.NumberFormat>()
export function num(lang: string, value: number, digits = 2): string {
  const key = `${lang}:${digits}`
  if (!formatters.has(key)) formatters.set(key, new Intl.NumberFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { maximumFractionDigits: digits }))
  return formatters.get(key)!.format(value)
}

export function heightRange(t: TFunction, lang: string, space: Pick<Space, 'zBottom' | 'zTop'>): string {
  return t('details.heightValue', { from: num(lang, toMsl(space.zBottom), 1), to: num(lang, toMsl(space.zTop), 1) })
}

export const spaceName = (t: TFunction, s: Pick<Space, 'kind' | 'number'>) => t(`space.${s.kind}`, { number: s.number })

/** How deep an underground line runs: from its crown to its invert, in metres below ground. */
export function depthRange(t: TFunction, lang: string, line: Pick<UndergroundAsset, 'axisDepthM' | 'radiusM'>): string {
  return t('details.depthValue', { from: num(lang, line.axisDepthM - line.radiusM, 1), to: num(lang, line.axisDepthM + line.radiusM, 1) })
}

/** Length of an underground line as drawn on the map, metres. */
export function lineLength(line: Pick<UndergroundAsset, 'line'>): number {
  const pts = line.line.map(lonLatToEnu)
  return pts.slice(1).reduce((sum, b, i) => sum + Math.hypot(b[0] - pts[i][0], b[1] - pts[i][1]), 0)
}

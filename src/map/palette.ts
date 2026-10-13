import { Color } from 'cesium'
import type { SpaceType } from '../lib/ulpin'

// Map colours come from the same CSS tokens as the rest of the UI (src/styles/tokens.css),
// so the 3D blocks, the legend, the code chips and the cards always match.

const FALLBACK: Record<string, string> = {
  '--ink': '#0b1f3a',
  '--accent': '#b8561b',
  '--type-s': '#f0e442',
  '--type-b': '#8a94a6',
  '--type-u': '#0072b2',
  '--type-l': '#e69f00',
  '--type-c': '#009e73',
  '--type-p': '#56b4e9',
  '--type-g': '#cc79a7',
}

export function token(name: string): Color {
  const css = typeof document !== 'undefined' ? getComputedStyle(document.documentElement).getPropertyValue(name).trim() : ''
  return Color.fromCssColorString(css || FALLBACK[name])
}

/** Block colour for a space type: the type colour, lifted slightly so lit faces don't look heavy. */
export function blockColour(type: SpaceType): Color {
  return Color.lerp(token(`--type-${type.toLowerCase()}`), Color.WHITE, 0.18, new Color())
}

export const COLOURS = {
  ink: () => token('--ink'),
  accent: () => token('--accent'),
  edge: () => token('--ink').withAlpha(0.55),
  plotFill: () => token('--ink').withAlpha(0.06),
  towerPlotFill: () => token('--type-s').withAlpha(0.22),
  unregistered: () => Color.fromCssColorString('#c3c8d0'),
  contextBuildings: '#F2EEE4',
}

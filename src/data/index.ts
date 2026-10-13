import { formatCode, seq } from '../lib/ulpin'
import { lonLatToLocal } from './geo'
import generated from './site.generated.json'
import { DOCS, HOLDERS, NETWORK_ROOTS } from './site'
import { buildTower } from './tower'
import type { LonLat, Plot, Restriction, Space, UndergroundAsset } from './types'

// The whole demo dataset: 15 plots, Tower 1's 3D spaces, and three underground segments.

type GeneratedPlot = (typeof generated.plots)[number]
type GeneratedLine = (typeof generated.underground)[number]

const AXIS_DEPTH = { metro: 24, water: 2.5 } // metres below ground to the centre line

// Underground segments. Field B is the network class (M metro, W water), as in the spec.
const segmentCode = (key: string) =>
  key === 'water-main'
    ? formatCode({ parent: NETWORK_ROOTS.water, type: 'G', building: 'W', level: '01', unit: seq(1) })
    : formatCode({ parent: NETWORK_ROOTS.metro, type: 'G', building: 'M', level: '01', unit: seq(key === 'metro-UP' ? 1 : 2) })

const lines = generated.underground as (GeneratedLine & { key: UndergroundAsset['key'] })[]
const plotsRaw = generated.plots as (GeneratedPlot & { underground: UndergroundAsset['key'][] })[]

export const underground: UndergroundAsset[] = lines.map((l) => {
  const metro = l.network === 'metro'
  return {
    code: segmentCode(l.key),
    key: l.key,
    kind: metro ? 'metro-tunnel' : 'water-main',
    name: l.name,
    line: l.line as LonLat[],
    radiusM: l.radiusM,
    axisDepthM: metro ? AXIS_DEPTH.metro : AXIS_DEPTH.water,
    rights: [
      metro
        ? { kind: 'right-of-user', holder: HOLDERS.metro, source: DOCS.metroNotification }
        : { kind: 'easement', holder: HOLDERS.water, source: DOCS.waterEasement },
    ],
    underPlots: plotsRaw.filter((p) => p.underground.includes(l.key)).map((p) => p.cts),
  }
})

const restrictionsFor = (keys: UndergroundAsset['key'][]): Restriction[] =>
  keys.map((key) => {
    const seg = underground.find((u) => u.key === key)!
    return seg.kind === 'metro-tunnel'
      ? { kind: 'right-of-user', holder: HOLDERS.metro, segmentCode: seg.code, source: DOCS.metroNotification }
      : { kind: 'easement', holder: HOLDERS.water, segmentCode: seg.code, source: DOCS.waterEasement }
  })

export const plots: Plot[] = plotsRaw.map((p) => ({
  id: p.id,
  cts: p.cts,
  ulpin: p.ulpin,
  areaM2: p.areaM2,
  polygon: p.polygon as LonLat[],
  hasTower: p.id === 'tower',
  restrictions: restrictionsFor(p.underground),
  osmBuildingId: p.osmBuildingId,
}))

export const towerPlot = plots.find((p) => p.hasTower)!

/** Tower 1's spaces. They exist in the data from the start; the demo only shows them once the tower is registered. */
export const spaces: Space[] = buildTower(towerPlot.ulpin, towerPlot.polygon.map(lonLatToLocal))

const byCode = new Map<string, Space | UndergroundAsset>([
  ...spaces.map((s) => [s.code, s] as const),
  ...underground.map((u) => [u.code, u] as const),
])

export const findByCode = (code: string) => byCode.get(code)
export const findPlotByUlpin = (ulpin: string) => plots.find((p) => p.ulpin === ulpin)
export const findPlotByCts = (cts: string) => plots.find((p) => p.cts === cts.replace(/^CTS\s*/i, ''))

/** Every 3D-ULPIN in the demo, in a stable order. */
export const allCodes = [...spaces.map((s) => s.code), ...underground.map((u) => u.code)]

export { SITE, TOWER } from './site'
export type * from './types'

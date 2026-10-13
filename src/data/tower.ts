import { floorLevel, formatCode, seq, type Level } from '../lib/ulpin'
import { FLAT_HOLDERS } from './holders'
import { polygonArea } from './geo'
import { DOCS, HOLDERS, TOWER } from './site'
import type { DocumentRef, LocalXY, Right, Space, SpaceKind } from './types'

// Nirmaan Residency, Tower 1: 2 basements, ground floor, 8 residential floors of 4 flats, terrace.
// Every space is a vertical prism (footprint × height) in the tower frame, in metres.
//
//   floor plate 32 × 20 m           y
//   ┌──────────┬───┬───┬──────────┐ 10
//   │  flat 1  │st.│lft│  flat 2  │
//   ├──────────┴───┴───┴──────────┤  2
//   │      corridor and lobby      │
//   ├───────────────┬──────────────┤ -2
//   │    flat 4     │    flat 3    │
//   └───────────────┴──────────────┘ -10
//  -16             0              16  x
// Flats are numbered clockwise from the north-west corner, as the spec's unit-order rule asks.

const rect = (x0: number, y0: number, x1: number, y1: number): LocalXY[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

export const FLOOR_PLATE = rect(-16, -10, 16, 10)
const STAIR = rect(-3, 2, 0, 10)
const LIFT = rect(0, 2, 3, 10)
const CORRIDOR = rect(-16, -2, 16, 2)
const QUADRANTS = {
  nw: rect(-16, 2, -3, 10),
  ne: rect(3, 2, 16, 10),
  se: rect(0, -10, 16, -2),
  sw: rect(-16, -10, 0, -2),
}
/** Terrace: the whole roof except the stair and lift heads. */
const TERRACE: LocalXY[] = [
  [-16, -10],
  [16, -10],
  [16, 10],
  [3, 10],
  [3, 2],
  [-3, 2],
  [-3, 10],
  [-16, 10],
]
/** Basement driveway: everything below y = 2 except the south row of bays. */
const DRIVEWAY: LocalXY[] = [
  [-16, -10],
  [-8, -10],
  [-8, -5],
  [8, -5],
  [8, -10],
  [16, -10],
  [16, 2],
  [-16, 2],
]

/** Heights in metres above the ground floor level. */
export const LEVELS: { level: Level; order: number; bottom: number; top: number }[] = [
  { level: 'B2', order: -2, bottom: -6.6, top: -3.3 },
  { level: 'B1', order: -1, bottom: -3.3, top: 0 },
  { level: '00', order: 0, bottom: 0, top: 3.6 },
  ...Array.from({ length: 8 }, (_, i) => ({ level: floorLevel(i + 1), order: i + 1, bottom: 3.6 + 3 * i, top: 6.6 + 3 * i })),
  { level: 'RF', order: 9, bottom: 27.6, top: 30.6 },
]
const BOTTOM = LEVELS[0].bottom
const TOP = LEVELS.at(-1)!.top
const levelInfo = (level: Level) => LEVELS.find((l) => l.level === level)!

const CARPET_RATIO = 0.85 // carpet area as a share of the flat's built-up footprint

/** Parking bays per basement, numbered 1–16. Bays 1–5 north-west row, 6–10 north-east row, 11–16 south row. */
function bayFootprints(): LocalXY[][] {
  const bays: LocalXY[][] = []
  for (let i = 0; i < 5; i++) bays.push(rect(-16 + 2.6 * i, 2, -16 + 2.6 * (i + 1), 7))
  for (let i = 0; i < 5; i++) bays.push(rect(3 + 2.6 * i, 2, 3 + 2.6 * (i + 1), 7))
  const w = 16 / 6
  for (let i = 0; i < 6; i++) bays.push(rect(-8 + w * i, -10, -8 + w * (i + 1), -5))
  return bays.map((b) => b.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000] as LocalXY))
}

/**
 * Which flat each allotted bay belongs to. B1 bays 1–16 go to floors 1–4; B2 bays 5–12 go to floors 5–6.
 * The other 8 bays in B2 stay open (type P). Floors 7–8 have no allotted parking.
 */
function allotment(): Map<string, number> {
  const m = new Map<string, number>()
  for (let bay = 1; bay <= 16; bay++) m.set(`B1-${bay}`, bay - 1) // flat index 0–15
  for (let bay = 5; bay <= 12; bay++) m.set(`B2-${bay}`, 16 + bay - 5) // flat index 16–23
  return m
}

const flatNumber = (floor: number, n: number) => `${floor}${String(n).padStart(2, '0')}`
const bayLabel = (level: Level, bay: number) => `${level}-${String(bay).padStart(2, '0')}`
const saleDeed = (i: number): DocumentRef => ({ kind: 'sale-deed', ref: `Sub-Registrar Haveli 4, Doc. ${12030 + i * 7}/2026`, date: '2026-04-02' })
const allotmentLetter = (label: string): DocumentRef => ({ kind: 'allotment-letter', ref: `NR/PARKING/${label}`, date: '2026-03-12' })

export function buildTower(parent: string, plotFootprint: LocalXY[]): Space[] {
  const code = (type: Space['type'], building: string, level: Level, unit: number) =>
    formatCode({ parent, type, building, level, unit: seq(unit) })
  const spaces: Space[] = []
  const add = (s: Omit<Space, 'code' | 'unit' | 'floorAreaM2' | 'levelOrder' | 'rights'> & { rights?: Right[]; unitNo: number }) => {
    const { unitNo, ...rest } = s
    spaces.push({
      ...rest,
      unit: seq(unitNo),
      code: code(s.type, s.building, s.level, unitNo),
      floorAreaM2: Math.round(polygonArea(s.footprint) * 100) / 100,
      levelOrder: s.type === 'S' ? -3 : s.level === 'XX' ? 10 : levelInfo(s.level).order,
      rights: s.rights ?? [],
    })
  }
  const common = (): Right[] => [{ kind: 'common-property', holder: HOLDERS.allOwners, source: DOCS.deedOfDeclaration }]
  const B = TOWER.index

  // Plot volume (S) and building envelope (B)
  add({ type: 'S', building: '0', level: '00', unitNo: 0, kind: 'plot', footprint: plotFootprint, zBottom: -10, zTop: 45,
    rights: [{ kind: 'ownership', holder: HOLDERS.allOwners, source: DOCS.deedOfDeclaration }] })
  add({ type: 'B', building: B, level: 'XX', unitNo: 0, kind: 'building', footprint: FLOOR_PLATE, zBottom: BOTTOM, zTop: TOP,
    rights: [{ kind: 'ownership', holder: HOLDERS.allOwners, source: DOCS.occupancyCertificate }] })

  // Stair and lift run through every level
  add({ type: 'C', building: B, level: 'XX', unitNo: 1, kind: 'staircase', footprint: STAIR, zBottom: BOTTOM, zTop: TOP, rights: common() })
  add({ type: 'C', building: B, level: 'XX', unitNo: 2, kind: 'lift', footprint: LIFT, zBottom: BOTTOM, zTop: TOP, rights: common() })

  // Basements: driveway, two storage rooms, 16 bays each
  const allotted = allotment()
  const flatCodes: string[] = []
  for (let f = 1; f <= 8; f++) for (let n = 1; n <= 4; n++) flatCodes.push(code('U', B, floorLevel(f), n))
  const parkingOfFlat = new Map<number, string[]>()
  for (const level of ['B1', 'B2'] as const) {
    const { bottom, top } = levelInfo(level)
    add({ type: 'C', building: B, level, unitNo: 1, kind: 'driveway', footprint: DRIVEWAY, zBottom: bottom, zTop: top, rights: common() })
    add({ type: 'C', building: B, level, unitNo: 2, kind: 'storage', number: '1', footprint: rect(-16, 7, -3, 10), zBottom: bottom, zTop: top, rights: common() })
    add({ type: 'C', building: B, level, unitNo: 3, kind: 'storage', number: '2', footprint: rect(3, 7, 16, 10), zBottom: bottom, zTop: top, rights: common() })
    bayFootprints().forEach((footprint, i) => {
      const bay = i + 1
      const label = bayLabel(level, bay)
      const flatIndex = allotted.get(`${level}-${bay}`)
      if (flatIndex === undefined) {
        add({ type: 'P', building: B, level, unitNo: bay, kind: 'parking-open', number: label, footprint, zBottom: bottom, zTop: top,
          rights: [{ kind: 'common-property', holder: HOLDERS.society, source: DOCS.deedOfDeclaration }] })
      } else {
        const bayCode = code('L', B, level, bay)
        parkingOfFlat.set(flatIndex, [...(parkingOfFlat.get(flatIndex) ?? []), bayCode])
        add({ type: 'L', building: B, level, unitNo: bay, kind: 'parking-allotted', number: label, footprint, zBottom: bottom, zTop: top,
          allottedTo: flatCodes[flatIndex],
          rights: [{ kind: 'exclusive-use', holder: FLAT_HOLDERS[flatIndex], source: allotmentLetter(label) }] })
      }
    })
  }

  // Ground floor: entrance lobby and four common rooms
  {
    const { bottom, top } = levelInfo('00')
    const rooms: [SpaceKind, LocalXY[]][] = [
      ['entrance-lobby', CORRIDOR],
      ['society-office', QUADRANTS.nw],
      ['community-hall', QUADRANTS.ne],
      ['fitness-room', QUADRANTS.se],
      ['play-room', QUADRANTS.sw],
    ]
    rooms.forEach(([kind, footprint], i) =>
      add({ type: 'C', building: B, level: '00', unitNo: i + 1, kind, footprint, zBottom: bottom, zTop: top, rights: common() }),
    )
  }

  // Residential floors 1–8: corridor plus four flats
  const carpetOf = (fp: LocalXY[]) => Math.round(polygonArea(fp) * CARPET_RATIO * 10) / 10
  const totalCarpet = 8 * [QUADRANTS.nw, QUADRANTS.ne, QUADRANTS.se, QUADRANTS.sw].reduce((s, q) => s + carpetOf(q), 0)
  for (let f = 1; f <= 8; f++) {
    const level = floorLevel(f)
    const { bottom, top } = levelInfo(level)
    add({ type: 'C', building: B, level, unitNo: 1, kind: 'corridor', footprint: CORRIDOR, zBottom: bottom, zTop: top, rights: common() })
    ;[QUADRANTS.nw, QUADRANTS.ne, QUADRANTS.se, QUADRANTS.sw].forEach((footprint, i) => {
      const flatIndex = (f - 1) * 4 + i
      const holder = FLAT_HOLDERS[flatIndex]
      const carpet = carpetOf(footprint)
      const share = Math.round((carpet / totalCarpet) * 100 * 1000) / 1000
      add({ type: 'U', building: B, level, unitNo: i + 1, kind: 'flat', number: flatNumber(f, i + 1), footprint, zBottom: bottom, zTop: top,
        carpetAreaM2: carpet, undividedSharePct: share, holder, parkingCodes: parkingOfFlat.get(flatIndex) ?? [],
        rights: [
          { kind: 'ownership', holder, source: saleDeed(flatIndex) },
          { kind: 'undivided-share', holder, sharePct: share, source: DOCS.deedOfDeclaration },
        ] })
    })
  }

  // Terrace
  {
    const { bottom, top } = levelInfo('RF')
    add({ type: 'C', building: B, level: 'RF', unitNo: 1, kind: 'terrace', footprint: TERRACE, zBottom: bottom, zTop: top, rights: common() })
  }

  return spaces
}

export const TOWER_EXTENT = { bottom: BOTTOM, top: TOP }

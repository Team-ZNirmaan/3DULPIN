import type { Level, SpaceType } from '../lib/ulpin'

/** [longitude, latitude] in degrees (WGS84). */
export type LonLat = [number, number]
/** Metres in the tower frame: x along the plot's long side, y across it, origin at the plot centre. */
export type LocalXY = [number, number]

/** What each 3D space is used for. Shown through translations (space.<kind>). */
export type SpaceKind =
  | 'plot'
  | 'building'
  | 'flat'
  | 'parking-allotted'
  | 'parking-open'
  | 'corridor'
  | 'entrance-lobby'
  | 'society-office'
  | 'community-hall'
  | 'fitness-room'
  | 'play-room'
  | 'driveway'
  | 'storage'
  | 'terrace'
  | 'staircase'
  | 'lift'
  | 'metro-tunnel'
  | 'water-main'

export type DocumentKind =
  | 'deed-of-declaration'
  | 'sale-deed'
  | 'allotment-letter'
  | 'occupancy-certificate'
  | 'acquisition-notification'
  | 'easement-deed'

/** Rights are recorded by reference to the legal document, as in the spec (C8.3). All references are fictional. */
export type DocumentRef = { kind: DocumentKind; ref: string; date: string }

export type RightKind = 'ownership' | 'undivided-share' | 'exclusive-use' | 'common-property' | 'right-of-user' | 'easement'

export type Right = {
  kind: RightKind
  holder: string
  /** Percentage, for undivided shares. */
  sharePct?: number
  source: DocumentRef
}

/** A restriction on a plot because an underground line runs beneath it. */
export type Restriction = {
  kind: 'right-of-user' | 'easement'
  holder: string
  /** 3D-ULPIN of the underground segment that causes it. */
  segmentCode: string
  source: DocumentRef
}

export type Plot = {
  id: string
  /** City Survey (CTS) number, fictional. */
  cts: string
  /** 14-character ULPIN, fictional. */
  ulpin: string
  areaM2: number
  polygon: LonLat[]
  hasTower: boolean
  restrictions: Restriction[]
  /** The real OpenStreetMap building this plot is drawn around (or replaced, for the tower). */
  osmBuildingId: number | null
}

export type Space = {
  code: string
  type: Exclude<SpaceType, 'G'>
  building: string
  level: Level
  unit: string
  kind: SpaceKind
  /** Flat number ("502") or bay label ("B1-07"), when the space has one. */
  number?: string
  footprint: LocalXY[]
  /** Metres above the ground floor level (plinth). */
  zBottom: number
  zTop: number
  floorAreaM2: number
  carpetAreaM2?: number
  undividedSharePct?: number
  /** Flat owner (fictional). */
  holder?: string
  /** For a flat: the 3D-ULPINs of its allotted parking bays. */
  parkingCodes?: string[]
  /** For an allotted bay: the 3D-ULPIN of its flat. */
  allottedTo?: string
  rights: Right[]
  /** Orders spaces by level for the floor slicer: B2 = -2 … RF = 9, multi-level = 10. */
  levelOrder: number
}

export type UndergroundAsset = {
  code: string
  key: 'metro-UP' | 'metro-DN' | 'water-main'
  kind: 'metro-tunnel' | 'water-main'
  name: string
  line: LonLat[]
  radiusM: number
  /** Depth of the centre line below ground, metres. */
  axisDepthM: number
  rights: Right[]
  /** CTS numbers of the plots it runs under. */
  underPlots: string[]
}

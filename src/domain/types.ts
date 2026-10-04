export type LonLat = [number, number]
export type Ring = LonLat[]

export type UnitType = 'S' | 'B' | 'U' | 'L' | 'C' | 'P' | 'G' | 'A'
export type LegalClass = 'surface' | 'building' | 'exclusive' | 'limited' | 'common' | 'parking' | 'underground' | 'elevated'
export type Status = 'provisional' | 'verified' | 'approved' | 'registered'
export type Tier = 'A' | 'B' | 'C' | 'D'
export type Severity = 'blocking' | 'warning' | 'info'
export type QualityLevel = 'QL-A' | 'QL-B' | 'QL-C' | 'QL-D'
export type Bilingual = { en: string; hi: string }

export interface Parcel {
  id: string
  ulpin: string
  label: string
  ring: Ring
  areaSqm: number
  landUse: 'residential' | 'commercial' | 'mixed' | 'open'
  isPilot: boolean
}

export interface LevelInfo {
  code: string
  index: number
  label: string
  zMin: number
  zMax: number
  sanctioned: boolean
}

export interface InfraInfo {
  network: 'water' | 'sewer' | 'power' | 'metro' | 'viaduct'
  agency: string
  qualityLevel: QualityLevel
  path: [LonLat, LonLat]
  widthM: number
  protectionM: number
  protectionRing: Ring
  protectionZMin: number
  protectionZMax: number
  legalBasis: string
}

export interface SpatialUnit {
  id: string
  code: string
  type: UnitType
  legalClass: LegalClass
  label: string
  parcelId?: string
  buildingId?: string
  level?: string
  levelIndex?: number
  ring: Ring
  zMin: number
  zMax: number
  carpetAreaSqm?: number
  declaredAreaSqm?: number
  undividedSharePct?: number
  tier: Tier
  status: Status
  version: number
  lineage: string[]
  infra?: InfraInfo
  digipin?: string
}

export interface Building {
  id: string
  code: string
  parcelId: string
  label: string
  footprint: Ring
  roofOutline: Ring
  heightM: number
  floorsSanctioned: number
  floorsDetected: number
  hasStilt: boolean
  levels: LevelInfo[]
  isPilot: boolean
  tier: Tier
  status: Status
}

export type RightType =
  | 'ownership'
  | 'undivided-share'
  | 'parking-allotment'
  | 'right-of-user'
  | 'easement'
  | 'mortgage'
  | 'lease'

export interface Party {
  id: string
  name: string
  kind: 'person' | 'organisation'
  ngdrsId: string
}

export interface Right {
  id: string
  unitCode: string
  type: RightType
  partyId: string
  sharePct?: number
  sourceDeedId?: string
  legalBasis: string
  since: string
  note?: string
}

export interface DeedField {
  key: 'tower' | 'floor' | 'flat' | 'carpetArea' | 'buyer' | 'seller' | 'parking' | 'consideration'
  value: string
  confidence: number
}

export interface Deed {
  id: string
  number: string
  kind: 'sale' | 'mortgage'
  format: 'ngdrs' | 'scan'
  registeredOn: string
  office: string
  scanLines: string[]
  fields: DeedField[]
  status: 'pending' | 'extracted' | 'linked' | 'rejected' | 'flagged'
  linkedUnitCode?: string
}

export type IssueStatus = 'open' | 'fix-approved' | 'rejected' | 'sent-to-field' | 'referred'

export interface ValidationIssue {
  id: string
  layer: 'L1' | 'L2' | 'L3' | 'L4' | 'L5'
  rule: string
  severity: Severity
  status: IssueStatus
  title: Bilingual
  explanation: Bilingual
  suggestion?: Bilingual
  beforeAfter?: { metric: string; before: string; after: string }
  anomalyScore?: number
  objectCodes: string[]
  focus: { lon: number; lat: number; height: number }
  detectedBy: string
  fixable: boolean
}

export interface PipelineStage {
  id: string
  label: string
  layer: string
  durationMs: number
  log: string[]
  outputs: { label: string; value: string }[]
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  role: string
  action: string
  target: string
  details: string
  prevHash: string
  hash: string
}

export interface FloorEvidence {
  level: string
  planZ: number | null
  facadeZ: number | null
  fusedZ: number
  sanctioned: boolean
}

export interface BuildingAnalysis {
  buildingId: string
  m1: { iou: number; boundaryF: number; confidence: number; heightRmseM: number; roofVsWallOffsetM: number }
  m2: { groundZ: number; roofZ: number; evidence: FloorEvidence[]; facadeDetections: number }
  m3: {
    scale: number
    rotationDeg: number
    rmseCm: number
    spaces: { exclusive: number; limited: number; common: number; parking: number }
    unitsFromGraph: number
    unitsInRera: number
  }
}

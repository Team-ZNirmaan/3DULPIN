import { digipin } from '@/domain/digipin'
import { corridorRing, rectRing, ringAreaSqm, ringCentroid, toLonLat } from '@/domain/geo'
import { between, mulberry32, pick } from '@/domain/prng'
import type {
  AuditEvent,
  Building,
  BuildingAnalysis,
  Deed,
  LevelInfo,
  Parcel,
  Party,
  PipelineStage,
  Right,
  SpatialUnit,
  Status,
  Tier,
  UnitType,
  ValidationIssue,
} from '@/domain/types'
import { levelCode, makeCode, toBase36 } from '@/domain/ulpin'

export const PILOT_PARENT = 'DEMO27PN0417A2'
const PARCEL_PREFIX = 'DEMO27PN04'

export interface Fixtures {
  parcels: Parcel[]
  buildings: Building[]
  units: SpatialUnit[]
  parties: Party[]
  rights: Right[]
  deeds: Deed[]
  issues: ValidationIssue[]
  pipeline: PipelineStage[]
  analysis: BuildingAnalysis[]
  auditSeed: Omit<AuditEvent, 'hash' | 'prevHash'>[]
}

const PERSONS = [
  'Asha Verma', 'Rohan Mehta', 'Sunita Patil', 'Imran Qureshi', 'Arjun Nair', 'Meera Iyer', 'Vikram Singh',
  'Neha Kulkarni', 'Farhan Ali', 'Pooja Deshmukh', 'Rahul Joshi', 'Ananya Das', 'Sanjay Gupta', 'Lakshmi Menon',
  'Harpreet Kaur', 'Deepak Yadav', 'Kavita Rao', 'Shalini Mishra', 'Karthik Reddy', 'Zoya Khan',
]

const ORGS = {
  developer: 'Demo Developers Pvt Ltd',
  bank: 'Demo Cooperative Bank',
  metro: 'Demo Metro Rail Corporation',
  water: 'Demo Water Supply Board',
  sewer: 'Demo Municipal Corporation',
  power: 'Demo Power Distribution Co.',
}

const LEVELS: LevelInfo[] = [
  { code: 'B2', index: -2, label: 'Basement 2', zMin: -6.6, zMax: -3.5, sanctioned: true },
  { code: 'B1', index: -1, label: 'Basement 1', zMin: -3.3, zMax: -0.2, sanctioned: true },
  { code: '00', index: 0, label: 'Stilt (ground)', zMin: 0, zMax: 3.0, sanctioned: true },
  { code: '01', index: 1, label: 'Floor 1', zMin: 3.15, zMax: 6.15, sanctioned: true },
  { code: '02', index: 2, label: 'Floor 2', zMin: 6.3, zMax: 9.3, sanctioned: true },
  { code: '03', index: 3, label: 'Floor 3', zMin: 9.45, zMax: 12.45, sanctioned: true },
  { code: '04', index: 4, label: 'Floor 4', zMin: 12.6, zMax: 15.6, sanctioned: true },
  { code: '05', index: 5, label: 'Floor 5', zMin: 15.75, zMax: 18.75, sanctioned: false },
  { code: 'RF', index: 6, label: 'Roof terrace', zMin: 18.9, zMax: 19.9, sanctioned: true },
]

const round2 = (n: number) => Math.round(n * 100) / 100

export function generateFixtures(): Fixtures {
  const rng = mulberry32(20260924)
  const parcels: Parcel[] = []
  const buildings: Building[] = []
  const units: SpatialUnit[] = []

  // ---------- Parcels & context buildings ----------
  const cols = [-100, -60, -20, 20, 60, 100]
  const rows = [
    { y0: -25, y1: 25, start: 5 },
    { y0: 31, y1: 81, start: 11 },
    { y0: -105, y1: -55, start: 17 },
  ]
  for (const row of rows) {
    cols.forEach((x0, i) => {
      const n = row.start + i
      const isPilot = n === 7
      const ulpin = isPilot ? PILOT_PARENT : `${PARCEL_PREFIX}${toBase36(n * 37 + 11, 2)}${pick(rng, ['A', 'C', 'F', 'K', 'M', 'R'])}${Math.floor(rng() * 10)}`
      const ring = rectRing(x0 + 0.4, row.y0 + 0.4, x0 + 39.6, row.y1 - 0.4)
      const landUse: Parcel['landUse'] = isPilot ? 'residential' : n === 13 ? 'open' : pick(rng, ['residential', 'residential', 'commercial', 'mixed'] as const)
      parcels.push({ id: `PCL-${n}`, ulpin, label: `Plot ${n}`, ring, areaSqm: Math.round(ringAreaSqm(ring)), landUse, isPilot })

      units.push({
        id: `U-S-${n}`,
        code: makeCode(ulpin, 'S', '0', 'XX', 0),
        type: 'S',
        legalClass: 'surface',
        label: `Plot ${n} — surface rights envelope`,
        parcelId: `PCL-${n}`,
        ring,
        zMin: -10,
        zMax: 24,
        tier: isPilot ? 'A' : 'B',
        status: 'registered',
        version: isPilot ? 3 : 1,
        lineage: ['Cadastral layer (Bhu-Naksha extract, demo)', 'Aligned to true orthophoto (shift 0.62 m)'],
      })

      if (isPilot || landUse === 'open') return
      const w = between(rng, 22, 30)
      const d = between(rng, 24, 36)
      const cx = x0 + 20 + between(rng, -2, 2)
      const cy = (row.y0 + row.y1) / 2 + between(rng, -3, 3)
      const floors = Math.floor(between(rng, 2, 6))
      const heightM = round2(floors * 3.2 + 1.2)
      const footprint = rectRing(cx - w / 2, cy - d / 2, cx + w / 2, cy + d / 2)
      const bCode = makeCode(ulpin, 'B', '1', 'XX', 0)
      const status: Status = pick(rng, ['registered', 'registered', 'approved', 'provisional'] as const)
      const tier: Tier = status === 'provisional' ? 'C' : pick(rng, ['A', 'B'] as const)
      buildings.push({
        id: `BLD-${n}`,
        code: bCode,
        parcelId: `PCL-${n}`,
        label: `Building on Plot ${n}`,
        footprint,
        roofOutline: footprint,
        heightM,
        floorsSanctioned: floors,
        floorsDetected: floors,
        hasStilt: false,
        levels: [],
        isPilot: false,
        tier,
        status,
      })
      units.push({
        id: `U-B-${n}`,
        code: bCode,
        type: 'B',
        legalClass: 'building',
        label: `Building on Plot ${n} (G+${floors - 1})`,
        parcelId: `PCL-${n}`,
        buildingId: `BLD-${n}`,
        ring: footprint,
        zMin: 0,
        zMax: heightM,
        tier,
        status,
        version: 1,
        lineage: ['Drone survey Block 7 (M1 extraction)', 'Units not yet delineated in this demo'],
      })
    })
  }

  // ---------- Pilot tower ----------
  const BX = 0
  const BY = 4
  const local = (x0: number, y0: number, x1: number, y1: number) => rectRing(BX + x0, BY + y0, BX + x1, BY + y1)
  const pilotFootprint = local(-12, -9, 12, 9)
  const pilotCode = makeCode(PILOT_PARENT, 'B', '1', 'XX', 0)
  buildings.push({
    id: 'BLD-7',
    code: pilotCode,
    parcelId: 'PCL-7',
    label: 'Tower 1, Demo Heights',
    footprint: pilotFootprint,
    roofOutline: local(-12.6, -9.6, 12.6, 9.6),
    heightM: 19.9,
    floorsSanctioned: 4,
    floorsDetected: 5,
    hasStilt: true,
    levels: LEVELS,
    isPilot: true,
    tier: 'A',
    status: 'registered',
  })
  units.push({
    id: 'U-B-7',
    code: pilotCode,
    type: 'B',
    legalClass: 'building',
    label: 'Tower 1 — building envelope (Stilt + 5, sanctioned Stilt + 4)',
    parcelId: 'PCL-7',
    buildingId: 'BLD-7',
    ring: pilotFootprint,
    zMin: -6.6,
    zMax: 19.9,
    tier: 'A',
    status: 'registered',
    version: 4,
    lineage: ['Drone survey Block 7, 2026-08-12 (nadir + oblique, 2.5 cm GSD)', 'M1 building extraction v1.3', 'M2 floor segmentation v1.1'],
  })

  const seqByLevel = new Map<string, number>()
  const nextSeq = (level: string) => {
    const n = (seqByLevel.get(level) ?? 0) + 1
    seqByLevel.set(level, n)
    return n
  }

  function levelMeta(code: string): { status: Status; tier: Tier; lineage: string[]; version: number } {
    if (code === '05') {
      return {
        status: 'provisional',
        tier: 'C',
        version: 1,
        lineage: ['Drone survey Block 7, 2026-08-12', 'M2 facade evidence (no sanctioned plan for this floor)', 'Units approximated from field sketch'],
      }
    }
    if (code === 'B2') {
      return {
        status: 'verified',
        tier: 'B',
        version: 2,
        lineage: ['AutoDCR PreDCR plan (basement layer)', 'Field verification 2026-08-20', 'Blocked: metro protection-zone conflict'],
      }
    }
    return {
      status: 'registered',
      tier: 'A',
      version: 2,
      lineage: ['AutoDCR PreDCR plan, sanction DEMO/BP/2022/0147', 'Georegistered to wall footprint (RMSE 4.1 cm)', 'Field sample passed 2024-03-11'],
    }
  }

  function addUnit(type: UnitType, legalClass: SpatialUnit['legalClass'], label: string, level: LevelInfo, ring: ReturnType<typeof local>, extra: Partial<SpatialUnit> = {}) {
    const meta = levelMeta(level.code)
    const code = makeCode(PILOT_PARENT, type, '1', level.code, nextSeq(level.code))
    const [lon, lat] = ringCentroid(ring)
    const u: SpatialUnit = {
      id: `U-${code.slice(-8)}`,
      code,
      type,
      legalClass,
      label,
      parcelId: 'PCL-7',
      buildingId: 'BLD-7',
      level: level.code,
      levelIndex: level.index,
      ring,
      zMin: level.zMin,
      zMax: level.zMax,
      digipin: digipin(lat, lon),
      ...meta,
      ...extra,
    }
    units.push(u)
    return u
  }

  const L = (code: string) => LEVELS.find((l) => l.code === code)!
  const flatsByNo = new Map<string, SpatialUnit>()
  const baysByLabel = new Map<string, SpatialUnit>()

  for (const code of ['B2', 'B1']) {
    const lv = L(code)
    // Basement extends beyond the tower footprint toward parcel setbacks.
    const by0 = -23
    const by1 = 14
    addUnit('C', 'common', `${lv.label} — driveway & ramp`, lv, rectRing(-3.3, by0, 3.3, by1))
    addUnit('C', 'common', code === 'B2' ? `${lv.label} — pump room & services` : `${lv.label} — storage & services`, lv, rectRing(-16, by0, -8.5, by1))
    addUnit('C', 'common', `${lv.label} — east circulation`, lv, rectRing(8.5, by0, 16, by1))
    addUnit('C', 'common', `${lv.label} — lift core & aisle (west)`, lv, rectRing(-8.5, -6.2, -3.3, by1))
    addUnit('C', 'common', `${lv.label} — aisle (east)`, lv, rectRing(3.3, -6.2, 8.5, by1))
    for (let i = 0; i < 12; i++) {
      const west = i < 6
      const k = i % 6
      const y0 = by0 + k * 2.8
      const ring = west ? rectRing(-8.5, y0, -3.3, y0 + 2.8) : rectRing(3.3, y0, 8.5, y0 + 2.8)
      const bayNo = `${code}-${String(i + 1).padStart(2, '0')}`
      const allotted = i !== 5 && i !== 11
      const u = addUnit(allotted ? 'L' : 'P', 'parking', `Parking bay ${bayNo}${allotted ? '' : ' (unallotted)'}`, lv, ring)
      baysByLabel.set(bayNo, u)
    }
  }

  const stilt = L('00')
  addUnit('C', 'common', 'Entrance lobby, stair & lift core', stilt, local(-2.5, -9, 2.5, 9))
  addUnit('C', 'common', 'Stilt driveway (west)', stilt, local(-12, -9, -2.5, 4))
  addUnit('C', 'common', 'Stilt driveway (east)', stilt, local(2.5, -9, 12, 4))
  for (let i = 0; i < 6; i++) {
    const west = i < 3
    const k = i % 3
    const x0 = west ? -12 + k * 3.15 : 2.5 + k * 3.15
    const bayNo = `S-${String(i + 1).padStart(2, '0')}`
    const u = addUnit('L', 'parking', `Stilt parking bay ${bayNo}`, stilt, local(x0 + 0.05, 4, x0 + 3.1, 9))
    baysByLabel.set(bayNo, u)
  }

  for (let f = 1; f <= 5; f++) {
    const lv = L(levelCode(f))
    addUnit('C', 'common', `${lv.label} — corridor`, lv, local(-12, -1.2, 12, 1.2))
    addUnit('C', 'common', `${lv.label} — staircase`, lv, local(-2.5, 1.2, 2.5, 9))
    addUnit('C', 'common', `${lv.label} — lift & services`, lv, local(-2.5, -9, 2.5, -1.2))
    const layout: [string, [number, number, number, number]][] = [
      ['01', [-12, 1.2, -2.5, 9]],
      ['02', [2.5, 1.2, 12, 9]],
      ['03', [2.5, -9, 12, -1.2]],
      ['04', [-12, -9, -2.5, -1.2]],
    ]
    for (const [n, [x0, y0, x1, y1]] of layout) {
      const flatNo = `${f}${n}`
      // Flat 303 was digitised 0.35 m into the lift lobby (plan error, ISS-002).
      const ring = flatNo === '303' ? local(x0 - 0.35, y0, x1, y1) : flatNo === '104' ? local(x0, y0, x1, y1 - 0.018) : local(x0, y0, x1, y1)
      const gross = (x1 - x0) * (y1 - y0)
      const carpet = round2(gross * 0.88)
      const u = addUnit('U', 'exclusive', `Flat ${flatNo}`, lv, ring, {
        carpetAreaSqm: carpet,
        declaredAreaSqm: carpet,
        undividedSharePct: 5,
      })
      flatsByNo.set(flatNo, u)
    }
  }
  addUnit('C', 'common', 'Roof terrace (open to sky)', L('RF'), local(-12, -9, 12, 9))

  // ---------- Infrastructure ----------
  function addInfra(opts: {
    id: string
    parent: string
    type: 'G' | 'A'
    net: string
    network: NonNullable<SpatialUnit['infra']>['network']
    label: string
    a: [number, number]
    b: [number, number]
    widthM: number
    zMin: number
    zMax: number
    protectionM: number
    agency: string
    ql: NonNullable<SpatialUnit['infra']>['qualityLevel']
    basis: string
    tier: Tier
  }) {
    const halfW = opts.widthM / 2
    const code = makeCode(opts.parent, opts.type, opts.net, '01', 1)
    units.push({
      id: opts.id,
      code,
      type: opts.type,
      legalClass: opts.type === 'G' ? 'underground' : 'elevated',
      label: opts.label,
      ring: corridorRing(opts.a, opts.b, halfW),
      zMin: opts.zMin,
      zMax: opts.zMax,
      tier: opts.tier,
      status: 'registered',
      version: 1,
      lineage: [`${opts.agency} as-built records`, `Quality level ${opts.ql} (ASCE 38)`, 'Depth converted to absolute Z via DTM'],
      infra: {
        network: opts.network,
        agency: opts.agency,
        qualityLevel: opts.ql,
        path: [toLonLat(...opts.a), toLonLat(...opts.b)],
        widthM: opts.widthM,
        protectionM: opts.protectionM,
        protectionRing: corridorRing(opts.a, opts.b, halfW + opts.protectionM),
        protectionZMin: opts.zMin - opts.protectionM,
        protectionZMax: opts.type === 'G' ? Math.min(-0.3, opts.zMax + opts.protectionM) : opts.zMax + opts.protectionM,
        legalBasis: opts.basis,
      },
    })
    return code
  }

  const metroCode = addInfra({
    id: 'U-G-METRO',
    parent: 'DEMOMTRL000001',
    type: 'G',
    net: 'M',
    network: 'metro',
    label: 'Metro Line 2 — twin-bore tunnel segment',
    a: [-220, -42],
    b: [220, 2],
    widthM: 6.5,
    zMin: -15.5,
    zMax: -9.0,
    protectionM: 3,
    agency: ORGS.metro,
    ql: 'QL-A',
    basis: 'Metro Railways (Construction of Works) Act, 1978 — right of user (verify)',
    tier: 'A',
  })
  const waterCode = addInfra({
    id: 'U-G-WATER',
    parent: 'DEMOWTRN000001',
    type: 'G',
    net: 'W',
    network: 'water',
    label: 'Water main DN600 (Main Road)',
    a: [-220, -34.5],
    b: [220, -34.5],
    widthM: 0.6,
    zMin: -1.8,
    zMax: -1.2,
    protectionM: 1.5,
    agency: ORGS.water,
    ql: 'QL-B',
    basis: 'Easement for public water supply (state municipal law, verify)',
    tier: 'B',
  })
  addInfra({
    id: 'U-G-SEWER',
    parent: 'DEMOSWRN000001',
    type: 'G',
    net: 'S',
    network: 'sewer',
    label: 'Trunk sewer DN900 (Main Road)',
    a: [-220, -45],
    b: [220, -45],
    widthM: 0.9,
    zMin: -3.4,
    zMax: -2.5,
    protectionM: 1.5,
    agency: ORGS.sewer,
    ql: 'QL-C',
    basis: 'Easement for sewerage (state municipal law, verify)',
    tier: 'C',
  })
  addInfra({
    id: 'U-G-POWER',
    parent: 'DEMOPWRN000001',
    type: 'G',
    net: 'E',
    network: 'power',
    label: '11 kV underground cable (West Lane)',
    a: [-104, -110],
    b: [-104, 90],
    widthM: 0.4,
    zMin: -1.3,
    zMax: -0.9,
    protectionM: 1.0,
    agency: ORGS.power,
    ql: 'QL-D',
    basis: 'Right of way under Electricity Act, 2003 (verify)',
    tier: 'D',
  })
  const viaductCode = addInfra({
    id: 'U-A-VIADUCT',
    parent: 'DEMOVDCT000001',
    type: 'A',
    net: 'M',
    network: 'viaduct',
    label: 'Metro Line 1 — elevated viaduct deck',
    a: [-220, -40],
    b: [-120, -40],
    widthM: 9,
    zMin: 11,
    zMax: 13,
    protectionM: 2,
    agency: ORGS.metro,
    ql: 'QL-A',
    basis: 'Air-space right of user / lease (state law, verify)',
    tier: 'A',
  })

  // ---------- Parties & rights ----------
  const parties: Party[] = [
    ...PERSONS.map((name, i) => ({ id: `PTY-${i + 1}`, name, kind: 'person' as const, ngdrsId: `NGD-P-${(48213 + i * 97).toString()}` })),
    ...Object.entries(ORGS).map(([k, name], i) => ({ id: `ORG-${k}`, name, kind: 'organisation' as const, ngdrsId: `NGD-O-${(9012 + i * 31).toString()}` })),
  ]
  const partyByName = (name: string) => parties.find((p) => p.name === name)!.id

  const rights: Right[] = []
  let rid = 1
  const addRight = (r: Omit<Right, 'id'>) => rights.push({ id: `RRR-${String(rid++).padStart(4, '0')}`, ...r })

  const ownerOrder = [
    'Asha Verma', 'Arjun Nair', 'Vikram Singh', 'Neha Kulkarni', 'Farhan Ali', 'Pooja Deshmukh', 'Rahul Joshi', 'Imran Qureshi',
    'Sunita Patil', 'Ananya Das', 'Sanjay Gupta', 'Lakshmi Menon', 'Harpreet Kaur', 'Rohan Mehta', 'Deepak Yadav', 'Shalini Mishra',
  ]
  let oi = 0
  for (let f = 1; f <= 4; f++) {
    for (const n of ['01', '02', '03', '04']) {
      const flatNo = `${f}${n}`
      const flat = flatsByNo.get(flatNo)!
      const owner = flatNo === '402' ? 'Rohan Mehta' : flatNo === '204' ? 'Imran Qureshi' : ownerOrder.filter((o) => o !== 'Rohan Mehta' && o !== 'Imran Qureshi')[oi++ % 14]
      const deedId = flatNo === '402' ? 'DEED-2019-1178' : flatNo === '204' ? 'DEED-2018-0764' : undefined
      addRight({ unitCode: flat.code, type: 'ownership', partyId: partyByName(owner), sourceDeedId: deedId, legalBasis: 'State Apartment Ownership Act; Registration Act, 1908', since: `20${18 + ((f + Number(n)) % 6)}-0${1 + (Number(n) % 8)}-15` })
      addRight({ unitCode: flat.code, type: 'undivided-share', partyId: partyByName(owner), sharePct: 5, legalBasis: 'Undivided share in common areas (Apartment Ownership Act; RERA 2016)', since: '2022-11-01' })
    }
  }
  for (let n = 1; n <= 4; n++) {
    const flat = flatsByNo.get(`5${String(n).padStart(2, '0')}`)!
    addRight({ unitCode: flat.code, type: 'ownership', partyId: partyByName(ORGS.developer), legalBasis: 'Provisional — floor not in sanctioned plan; referred to ULB', since: '2026-08-12', note: 'Provisional record pending regularisation' })
  }
  const allotments: [string, string][] = [
    ['B1-01', '101'], ['B1-02', '102'], ['B1-03', '103'], ['B1-04', '402'], ['B1-05', '104'], ['B1-07', '201'], ['B1-08', '202'], ['B1-09', '203'], ['B1-10', '204'], ['B1-11', '301'],
    ['B2-01', '302'], ['B2-02', '303'], ['B2-03', '304'], ['B2-04', '401'], ['B2-07', '403'], ['B2-08', '404'],
    ['S-01', '101'], ['S-02', '201'], ['S-03', '301'], ['S-04', '401'], ['S-05', '204'], ['S-06', '402'],
  ]
  for (const [bay, flatNo] of allotments) {
    const flat = flatsByNo.get(flatNo)!
    const owner = rights.find((r) => r.unitCode === flat.code && r.type === 'ownership')!
    addRight({ unitCode: baysByLabel.get(bay)!.code, type: 'parking-allotment', partyId: owner.partyId, legalBasis: 'Allotment under sale agreement (RERA 2016)', since: owner.since, note: `Allotted with Flat ${flatNo}` })
  }
  addRight({ unitCode: flatsByNo.get('204')!.code, type: 'mortgage', partyId: partyByName(ORGS.bank), sourceDeedId: 'DEED-2021-0880', legalBasis: 'Transfer of Property Act, 1882; CERSAI registration', since: '2021-06-30', note: 'Home loan — outstanding (demo)' })
  addRight({ unitCode: metroCode, type: 'right-of-user', partyId: partyByName(ORGS.metro), legalBasis: 'Metro Railways (Construction of Works) Act, 1978 (verify)', since: '2023-04-01' })
  addRight({ unitCode: makeCode(PILOT_PARENT, 'S', '0', 'XX', 0), type: 'right-of-user', partyId: partyByName(ORGS.metro), legalBasis: 'Restriction: metro tunnel protection zone below this parcel', since: '2023-04-01', note: `See ${metroCode}` })
  addRight({ unitCode: waterCode, type: 'easement', partyId: partyByName(ORGS.water), legalBasis: 'Easement for public water supply (verify)', since: '2011-02-01' })
  addRight({ unitCode: viaductCode, type: 'lease', partyId: partyByName(ORGS.metro), legalBasis: 'Air-space lease over public road (verify)', since: '2020-09-01' })

  // ---------- Deeds ----------
  const f301 = flatsByNo.get('301')!
  const f402 = flatsByNo.get('402')!
  const f204 = flatsByNo.get('204')!
  const deeds: Deed[] = [
    {
      id: 'DEED-2026-0412',
      number: 'NGDRS/BPL/2026/0412',
      kind: 'sale',
      format: 'ngdrs',
      registeredOn: '2026-09-02',
      office: 'Sub-Registrar Office, Demo City',
      scanLines: [],
      fields: [
        { key: 'tower', value: 'Tower 1, Demo Heights', confidence: 1 },
        { key: 'floor', value: '3', confidence: 1 },
        { key: 'flat', value: '301', confidence: 1 },
        { key: 'carpetArea', value: `${f301.carpetAreaSqm?.toFixed(2)} sq m`, confidence: 1 },
        { key: 'seller', value: 'Asha Verma', confidence: 1 },
        { key: 'buyer', value: 'Meera Iyer', confidence: 1 },
        { key: 'parking', value: 'Bay B1-11, Bay S-03', confidence: 1 },
        { key: 'consideration', value: '₹ 52,40,000', confidence: 1 },
      ],
      status: 'pending',
    },
    {
      id: 'DEED-2026-0533',
      number: 'SR-BPL/2026/0533',
      kind: 'sale',
      format: 'scan',
      registeredOn: '2026-09-18',
      office: 'Sub-Registrar Office, Demo City',
      scanLines: [
        'SALE DEED',
        'This Deed of Sale is executed on 18th September 2026 at Demo City',
        'BETWEEN Demo Developers Pvt Ltd (hereinafter "the Vendor")',
        'AND Smt. Kavita Rao (hereinafter "the Purchaser").',
        'SCHEDULE OF PROPERTY: Flat No. 402, Fourth Floor, Tower 1,',
        '"Demo Heights", Plot No. 7, Demo Ward 7, having carpet area',
        '65.21 sq. m., together with covered parking Bay No. B1-04.',
        'CONSIDERATION: Rs. 48,50,000/- (Rupees Forty-Eight Lakh Fifty',
        'Thousand only) paid in full.',
      ],
      fields: [
        { key: 'tower', value: 'Tower 1, Demo Heights', confidence: 0.97 },
        { key: 'floor', value: '4', confidence: 0.95 },
        { key: 'flat', value: '402', confidence: 0.98 },
        { key: 'carpetArea', value: '65.21 sq m', confidence: 0.91 },
        { key: 'seller', value: 'Demo Developers Pvt Ltd', confidence: 0.94 },
        { key: 'buyer', value: 'Kavita Rao', confidence: 0.96 },
        { key: 'parking', value: 'Bay B1-04', confidence: 0.89 },
        { key: 'consideration', value: '₹ 48,50,000', confidence: 0.93 },
      ],
      status: 'pending',
    },
    {
      id: 'DEED-2019-1178',
      number: 'SR-BPL/2019/1178',
      kind: 'sale',
      format: 'scan',
      registeredOn: '2019-03-07',
      office: 'Sub-Registrar Office, Demo City',
      scanLines: ['SALE DEED', 'Vendor: Demo Developers Pvt Ltd', 'Purchaser: Shri Rohan Mehta', 'Flat No. 402, Fourth Floor, Tower 1, Demo Heights, Plot No. 7', 'Carpet area 65.21 sq. m.; covered parking B1-04, stilt S-06'],
      fields: [
        { key: 'flat', value: '402', confidence: 0.98 },
        { key: 'buyer', value: 'Rohan Mehta', confidence: 0.97 },
        { key: 'seller', value: 'Demo Developers Pvt Ltd', confidence: 0.95 },
        { key: 'carpetArea', value: '65.21 sq m', confidence: 0.92 },
      ],
      status: 'linked',
      linkedUnitCode: f402.code,
    },
    {
      id: 'DEED-2018-0764',
      number: 'SR-BPL/2018/0764',
      kind: 'sale',
      format: 'scan',
      registeredOn: '2018-11-21',
      office: 'Sub-Registrar Office, Demo City',
      scanLines: ['SALE DEED', 'Purchaser: Shri Imran Qureshi', 'Flat No. 204, Second Floor, Tower 1, Demo Heights', 'Carpet area 78.00 sq. m.'],
      fields: [
        { key: 'flat', value: '204', confidence: 0.97 },
        { key: 'buyer', value: 'Imran Qureshi', confidence: 0.96 },
        { key: 'carpetArea', value: '78.00 sq m', confidence: 0.9 },
      ],
      status: 'linked',
      linkedUnitCode: f204.code,
    },
    {
      id: 'DEED-2021-0880',
      number: 'NGDRS/BPL/2021/0880',
      kind: 'mortgage',
      format: 'ngdrs',
      registeredOn: '2021-06-30',
      office: 'Sub-Registrar Office, Demo City',
      scanLines: [],
      fields: [
        { key: 'flat', value: '204', confidence: 1 },
        { key: 'buyer', value: 'Demo Cooperative Bank (mortgagee)', confidence: 1 },
        { key: 'seller', value: 'Imran Qureshi (mortgagor)', confidence: 1 },
        { key: 'consideration', value: '₹ 31,00,000 (loan)', confidence: 1 },
      ],
      status: 'linked',
      linkedUnitCode: f204.code,
    },
  ]
  f204.declaredAreaSqm = 78

  // ---------- Validation issues ----------
  const focusOf = (u: SpatialUnit, h?: number) => {
    const [lon, lat] = ringCentroid(u.ring)
    return { lon, lat, height: h ?? (u.zMin + u.zMax) / 2 }
  }
  const b2South = units.filter((u) => u.level === 'B2' && u.legalClass === 'parking').slice(0, 2)
  const f303 = flatsByNo.get('303')!
  const f104 = flatsByNo.get('104')!
  const lift3 = units.find((u) => u.label === 'Floor 3 — lift & services')!
  const corr1 = units.find((u) => u.label === 'Floor 1 — corridor')!
  const issues: ValidationIssue[] = [
    {
      id: 'ISS-001',
      layer: 'L2',
      rule: 'L2(vii) Infrastructure conflict',
      severity: 'blocking',
      status: 'open',
      title: { en: 'Basement B2 enters metro tunnel protection zone', hi: 'बेसमेंट B2 मेट्रो सुरंग सुरक्षा क्षेत्र में प्रवेश करता है' },
      explanation: {
        en: 'The floor slab of Basement 2 (bottom at −6.60 m) lies 0.60 m inside the 3 m protection zone above the Metro Line 2 tunnel crown (−9.00 m). Minting is blocked until the competent authority decides.',
        hi: 'बेसमेंट 2 का फ़र्श स्लैब (तल −6.60 मी) मेट्रो लाइन 2 सुरंग शीर्ष (−9.00 मी) के ऊपर 3 मी सुरक्षा क्षेत्र में 0.60 मी भीतर है। सक्षम प्राधिकारी के निर्णय तक जारीकरण रोका गया है।',
      },
      suggestion: {
        en: 'Record a restriction on the affected B2 bays (no excavation, load limits) and refer to the metro authority for a no-objection review.',
        hi: 'प्रभावित B2 पार्किंग पर प्रतिबंध दर्ज करें (कोई खुदाई नहीं, भार सीमा) और अनापत्ति समीक्षा हेतु मेट्रो प्राधिकरण को भेजें।',
      },
      beforeAfter: { metric: 'Protection-zone overlap', before: '0.60 m (≈ 212 m³)', after: 'Restriction recorded; overlap accepted with NOC' },
      objectCodes: [...b2South.map((u) => u.code), metroCode],
      focus: focusOf(b2South[0], -7),
      detectedBy: 'M4 · SFCGAL ST_3DIntersection',
      fixable: true,
    },
    {
      id: 'ISS-002',
      layer: 'L2',
      rule: 'L2(i) Exclusive unit overlaps common area',
      severity: 'warning',
      status: 'open',
      title: { en: 'Flat 303 overlaps the Floor 3 lift lobby by 0.35 m', hi: 'फ़्लैट 303, तल 3 लिफ़्ट लॉबी पर 0.35 मी चढ़ा हुआ है' },
      explanation: {
        en: 'The digitised boundary of Flat 303 extends 0.35 m into the common lift & services area. The approved plan shows a shared wall; this is a digitisation error, not an encroachment.',
        hi: 'फ़्लैट 303 की डिजिटाइज़ की गई सीमा साझा लिफ़्ट क्षेत्र में 0.35 मी तक फैली है। स्वीकृत नक्शे में साझा दीवार है; यह डिजिटाइज़ेशन त्रुटि है, अतिक्रमण नहीं।',
      },
      suggestion: { en: 'Snap the boundary to the shared-wall median from the PreDCR plan.', hi: 'सीमा को PreDCR नक्शे की साझा दीवार की मध्य रेखा पर स्नैप करें।' },
      beforeAfter: { metric: 'Overlap volume', before: '8.19 m³', after: '0.00 m³' },
      objectCodes: [f303.code, lift3.code],
      focus: focusOf(f303),
      detectedBy: 'M4 · SFCGAL ST_3DIntersection',
      fixable: true,
    },
    {
      id: 'ISS-003',
      layer: 'L4',
      rule: 'L4 Area anomaly (Isolation Forest)',
      severity: 'warning',
      status: 'open',
      title: { en: 'Flat 204: deed area 78.00 m² vs computed 65.21 m²', hi: 'फ़्लैट 204: विलेख क्षेत्र 78.00 मी² बनाम गणना 65.21 मी²' },
      explanation: {
        en: 'The registered sale deed states 19.6% more carpet area than the plan-derived volume. Other flats of the same layout match within 0.1%. Anomaly score 0.91.',
        hi: 'पंजीकृत विक्रय विलेख में नक्शे से गणना किए गए क्षेत्र से 19.6% अधिक कार्पेट क्षेत्र दर्ज है। समान लेआउट के अन्य फ़्लैट 0.1% के भीतर मेल खाते हैं। विसंगति स्कोर 0.91।',
      },
      suggestion: { en: 'Send to field verification: measure the flat with a laser distance meter.', hi: 'क्षेत्र सत्यापन हेतु भेजें: लेज़र दूरी मापक से फ़्लैट मापें।' },
      anomalyScore: 0.91,
      objectCodes: [f204.code],
      focus: focusOf(f204),
      detectedBy: 'M4 · Isolation Forest on unit attributes',
      fixable: false,
    },
    {
      id: 'ISS-004',
      layer: 'L3',
      rule: 'L3 Deviation from sanction (M2 floor evidence)',
      severity: 'blocking',
      status: 'open',
      title: { en: 'Tower 1: 5 floors detected, 4 sanctioned', hi: 'टावर 1: 5 मंज़िलें पाई गईं, 4 स्वीकृत' },
      explanation: {
        en: 'Facade detection and DSM height (19.9 m) both indicate a fifth floor. The approved PreDCR section shows Stilt + 4. Floor 5 units are held as provisional (Tier C).',
        hi: 'फ़साड पहचान एवं DSM ऊँचाई (19.9 मी) दोनों पाँचवीं मंज़िल दर्शाते हैं। स्वीकृत PreDCR सेक्शन में स्टिल्ट + 4 है। मंज़िल 5 की इकाइयाँ अनंतिम (टियर C) रखी गई हैं।',
      },
      suggestion: { en: 'Refer to the Urban Local Body for enforcement or regularisation.', hi: 'प्रवर्तन या नियमितीकरण हेतु नगरीय निकाय को भेजें।' },
      objectCodes: [pilotCode],
      focus: { ...focusOf(units.find((u) => u.id === 'U-B-7')!), height: 17 },
      detectedBy: 'M2 · facade + DSM + plan fusion',
      fixable: false,
    },
    {
      id: 'ISS-005',
      layer: 'L1',
      rule: 'L1 Sliver gap below tolerance',
      severity: 'info',
      status: 'open',
      title: { en: 'Sliver gap of 1.8 cm between Flat 104 and the corridor', hi: 'फ़्लैट 104 और गलियारे के बीच 1.8 सेमी का अंतर' },
      explanation: {
        en: 'A 1.8 cm gap leaves a volume assigned to no one. Below the 5 cm snapping tolerance, so it is safe to close automatically.',
        hi: '1.8 सेमी का अंतराल किसी को आवंटित न होने वाला आयतन छोड़ता है। यह 5 सेमी सहनशीलता से कम है, अतः स्वतः बंद करना सुरक्षित है।',
      },
      suggestion: { en: 'Snap Flat 104 boundary to the corridor edge.', hi: 'फ़्लैट 104 की सीमा को गलियारे के किनारे पर स्नैप करें।' },
      beforeAfter: { metric: 'Unassigned volume', before: '0.51 m³', after: '0.00 m³' },
      objectCodes: [f104.code, corr1.code],
      focus: focusOf(f104),
      detectedBy: 'val3dity + coverage check',
      fixable: true,
    },
  ]

  const pipeline: PipelineStage[] = [
    { id: 'ingest', label: 'Ingest & catalogue', layer: 'L2', durationMs: 1400, log: ['Registered 10 datasets in STAC catalogue', 'Lineage records created', 'Normalised rasters → COG, clouds → COPC'], outputs: [{ label: 'Datasets', value: '10' }] },
    { id: 'qc', label: 'Automated QC gates', layer: 'L2', durationMs: 1600, log: ['Check-point RMSE H 3.4 cm / V 5.8 cm — PASS', 'Plan scale 1.0021 — PASS', 'Utility depth coverage 67% — WARN (buffers widened)'], outputs: [{ label: 'Gates passed', value: '13 / 14' }] },
    { id: 'recon', label: '3D reconstruction', layer: 'L3', durationMs: 2600, log: ['Bundle adjustment: 1,842 images, reprojection 0.61 px', 'Dense matching → 214 M points', 'True orthophoto + DSM/DTM (SMRF) + textured mesh'], outputs: [{ label: 'Points', value: '214 M' }, { label: 'DSM', value: '5 cm' }] },
    { id: 'm1', label: 'M1 · Building extraction', layer: 'L4', durationMs: 2000, log: ['Instance segmentation on true ortho: 31 buildings', 'Attached buildings split by DSM discontinuity: 3', 'Mesh slice at +1.5 m → wall footprints'], outputs: [{ label: 'Buildings', value: '31' }, { label: 'Mean IoU', value: '0.94' }] },
    { id: 'm2', label: 'M2 · Floor segmentation', layer: 'L4', durationMs: 2000, log: ['Facade detections: 212 windows / slab bands', 'Fused plan + facade + DSM slab heights', 'Tower 1: 5 floors detected vs 4 sanctioned → FLAG'], outputs: [{ label: 'Deviations', value: '1' }] },
    { id: 'm3', label: 'M3 · Vertical parcel delineation', layer: 'L5', durationMs: 2400, log: ['PreDCR DXF parsed (rules): 94 spaces', 'Room–door graph → 16 flats (matches RERA)', 'Georegistration scale 1.0021, RMSE 4.1 cm', 'Extruded 79 legal volumes + 5 infrastructure volumes'], outputs: [{ label: 'Volumes', value: '84' }] },
    { id: 'm4', label: 'M4 · Topology validation', layer: 'L6', durationMs: 2000, log: ['val3dity: 84 / 84 valid solids', '3D topology: 2 blocking, 2 warnings, 1 info', 'Isolation Forest: 1 area anomaly (score 0.91)'], outputs: [{ label: 'Issues', value: '5' }] },
    { id: 'ready', label: 'Ready for verification', layer: 'L7', durationMs: 700, log: ['Field tasks generated: 4 sampled + 3 flagged', 'Awaiting surveyor verification (Gate 1)'], outputs: [{ label: 'Field tasks', value: '7' }] },
  ]

  const analysis: BuildingAnalysis[] = [
    {
      buildingId: 'BLD-7',
      m1: { iou: 0.94, boundaryF: 0.91, confidence: 0.96, heightRmseM: 0.06, roofVsWallOffsetM: 0.6 },
      m2: {
        groundZ: 0,
        roofZ: 19.9,
        facadeDetections: 212,
        evidence: [
          { level: '00', planZ: 0, facadeZ: null, fusedZ: 0, sanctioned: true },
          { level: '01', planZ: 3.15, facadeZ: 3.19, fusedZ: 3.16, sanctioned: true },
          { level: '02', planZ: 6.3, facadeZ: 6.26, fusedZ: 6.29, sanctioned: true },
          { level: '03', planZ: 9.45, facadeZ: 9.51, fusedZ: 9.47, sanctioned: true },
          { level: '04', planZ: 12.6, facadeZ: 12.57, fusedZ: 12.59, sanctioned: true },
          { level: '05', planZ: null, facadeZ: 15.78, fusedZ: 15.76, sanctioned: false },
        ],
      },
      m3: { scale: 1.0021, rotationDeg: 0.37, rmseCm: 4.1, spaces: { exclusive: 20, limited: 26, common: 29, parking: 4 }, unitsFromGraph: 16, unitsInRera: 16 },
    },
  ]

  const auditSeed: Omit<AuditEvent, 'hash' | 'prevHash'>[] = [
    { id: 'EVT-0001', at: '2024-03-11T11:02:00+05:30', actor: 'R. Kulkarni', role: 'Field surveyor', action: 'VERIFY', target: 'Tower 1 (Floors 1–4)', details: 'Field sample 4/16 units passed tolerance' },
    { id: 'EVT-0002', at: '2024-03-14T16:40:00+05:30', actor: 'S. Tiwari', role: 'Competent authority', action: 'APPROVE_MINT', target: pilotCode, details: 'Minted 72 3D-ULPINs at Occupancy Certificate stage' },
    { id: 'EVT-0003', at: '2026-08-12T09:15:00+05:30', actor: 'Survey operator', role: 'Survey operator', action: 'INGEST', target: 'DS-01', details: 'Drone survey Block 7 ingested (1,842 images)' },
    { id: 'EVT-0004', at: '2026-08-14T18:05:00+05:30', actor: 'Pipeline', role: 'System', action: 'PIPELINE_RUN', target: 'Block 7', details: 'M1–M4 completed: 84 volumes, 5 issues' },
    { id: 'EVT-0005', at: '2026-08-20T12:30:00+05:30', actor: 'R. Kulkarni', role: 'Field surveyor', action: 'VERIFY', target: 'Basement B2', details: 'Bays measured; protection-zone overlap confirmed' },
    { id: 'EVT-0006', at: '2026-09-02T15:12:00+05:30', actor: 'A. Khan', role: 'Sub-Registrar', action: 'DEED_RECEIVED', target: 'NGDRS/BPL/2026/0412', details: 'Sale deed for Flat 301 received from NGDRS' },
  ]

  return { parcels, buildings, units, parties, rights, deeds, issues, pipeline, analysis, auditSeed }
}

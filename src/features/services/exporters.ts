import { SITE } from '@/domain/geo'
import type { LonLat, SpatialUnit } from '@/domain/types'
import { useData } from '@/store/data'

/** WGS84 → UTM (Snyder / USGS series expansion), sufficient for sub-millimetre display within a zone. */
export function toUtm([lon, lat]: LonLat, zone = 43): [number, number] {
  const a = 6378137
  const f = 1 / 298.257223563
  const k0 = 0.9996
  const e2 = f * (2 - f)
  const ep2 = e2 / (1 - e2)
  const phi = (lat * Math.PI) / 180
  const lam = (lon * Math.PI) / 180
  const lam0 = (((zone - 1) * 6 - 180 + 3) * Math.PI) / 180
  const sin = Math.sin(phi)
  const cos = Math.cos(phi)
  const tan = Math.tan(phi)
  const N = a / Math.sqrt(1 - e2 * sin * sin)
  const T = tan * tan
  const C = ep2 * cos * cos
  const A = cos * (lam - lam0)
  const M =
    a *
    ((1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256) * phi -
      ((3 * e2) / 8 + (3 * e2 ** 2) / 32 + (45 * e2 ** 3) / 1024) * Math.sin(2 * phi) +
      ((15 * e2 ** 2) / 256 + (45 * e2 ** 3) / 1024) * Math.sin(4 * phi) -
      ((35 * e2 ** 3) / 3072) * Math.sin(6 * phi))
  const x = k0 * N * (A + ((1 - T + C) * A ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) + 500000
  const y = k0 * (M + N * tan * (A ** 2 / 2 + ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720))
  return [x, y]
}

const CITYJSON_TYPE: Partial<Record<SpatialUnit['type'], string>> = {
  B: 'Building',
  U: 'BuildingUnit',
  L: 'BuildingUnit',
  P: 'BuildingUnit',
  C: 'BuildingUnit',
  G: 'OtherConstruction',
  A: 'Bridge',
}

export function buildCityJson() {
  const { units } = useData.getState()
  const scale = 0.001
  const origin = toUtm([SITE.lon, SITE.lat])
  const translate = [Math.round(origin[0]), Math.round(origin[1]), 0]
  const vertices: number[][] = []
  const cityObjects: Record<string, unknown> = {}
  const vi = (x: number, y: number, z: number) => {
    vertices.push([Math.round((x - translate[0]) / scale), Math.round((y - translate[1]) / scale), Math.round(z / scale)])
    return vertices.length - 1
  }
  const pilotBuilding = units.find((u) => u.id === 'U-B-7')!
  for (const u of units) {
    const type = CITYJSON_TYPE[u.type]
    if (!type) continue
    if (u.type === 'B' && u.buildingId !== 'BLD-7' && u.buildingId) continue
    const raw = u.ring.slice(0, -1).map((p) => toUtm(p))
    const signed = raw.reduce((acc, [x, y], i) => acc + x * raw[(i + 1) % raw.length][1] - raw[(i + 1) % raw.length][0] * y, 0)
    const pts = signed < 0 ? [...raw].reverse() : raw
    const z0 = SITE.groundMsl + u.zMin
    const z1 = SITE.groundMsl + u.zMax
    const bottom = pts.map(([x, y]) => vi(x, y, z0))
    const top = pts.map(([x, y]) => vi(x, y, z1))
    const n = pts.length
    const shell = [[[...bottom].reverse()], [top], ...pts.map((_, i) => [[bottom[i], bottom[(i + 1) % n], top[(i + 1) % n], top[i]]])]
    cityObjects[u.code] = {
      type,
      attributes: {
        label: u.label,
        ulpin3d: u.code,
        legalType: u.type,
        level: u.level,
        status: u.status,
        accuracyTier: u.tier,
        carpetAreaSqm: u.carpetAreaSqm,
        zMinMsl: Number(z0.toFixed(2)),
        zMaxMsl: Number(z1.toFixed(2)),
      },
      geometry: [{ type: 'Solid', lod: '1', boundaries: [shell] }],
      ...(u.buildingId === 'BLD-7' && u.type !== 'B' ? { parents: [pilotBuilding.code] } : {}),
    }
  }
  ;(cityObjects[pilotBuilding.code] as { children?: string[] }).children = units.filter((u) => u.buildingId === 'BLD-7' && u.type !== 'B').map((u) => u.code)
  return {
    type: 'CityJSON',
    version: '2.0',
    transform: { scale: [scale, scale, scale], translate },
    metadata: {
      title: 'Bhu-Aayam demo export — Tower 1, Plot 7 (synthetic data)',
      referenceSystem: 'https://www.opengis.net/def/crs/EPSG/0/32643',
      heightNote: `Heights are orthometric (ground ${SITE.groundMsl} m MSL, demo)`,
    },
    CityObjects: cityObjects,
    vertices,
  }
}

export function buildGeoJson() {
  const { units } = useData.getState()
  return {
    type: 'FeatureCollection',
    features: units.map((u) => ({
      type: 'Feature',
      id: u.code,
      geometry: { type: 'Polygon', coordinates: [u.ring] },
      properties: { ulpin3d: u.code, label: u.label, type: u.type, level: u.level ?? null, zMin: u.zMin, zMax: u.zMax, status: u.status, tier: u.tier },
    })),
  }
}

export function buildLadm() {
  const { units, rights, parties, deeds } = useData.getState()
  const flats = units.filter((u) => u.type === 'U')
  return {
    model: 'ISO 19152 LADM (Edition II) — demo profile',
    LA_SpatialUnit: units.map((u) => ({
      suID: u.code,
      class: u.type === 'G' ? 'LA_LegalSpaceUtilityNetwork' : u.type === 'S' ? 'LA_SpatialUnit' : 'LA_LegalSpaceBuildingUnit',
      dimension: '3D',
      label: u.label,
      zMin: u.zMin,
      zMax: u.zMax,
      beginLifespanVersion: `v${u.version}`,
      quality: u.tier,
    })),
    LA_BAUnit: flats.map((f) => ({
      uID: `BA-${f.code.slice(15, 22)}`,
      name: f.label,
      spatialUnits: [f.code, ...rights.filter((r) => r.type === 'parking-allotment' && r.note === `Allotted with ${f.label}`).map((r) => r.unitCode)],
    })),
    LA_RRR: rights.map((r) => ({ rID: r.id, type: r.type, suID: r.unitCode, pID: r.partyId, share: r.sharePct, source: r.sourceDeedId, basis: r.legalBasis })),
    LA_Party: parties.map((p) => ({ pID: p.id, type: p.kind, extPID: p.ngdrsId })),
    LA_AdministrativeSource: deeds.map((d) => ({ sID: d.id, type: d.kind, reference: d.number, date: d.registeredOn })),
    privacyNote: 'Party names omitted — resolved via NGDRS IDs under DPDP Act, 2023.',
  }
}

export function download(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

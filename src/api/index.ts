import { digCheck as digCheckGeo, unitsAtPoint, type DigHit } from '@/domain/geo'
import { signPayload, verifySignature } from '@/domain/hash'
import type { Deed, LonLat, Right, Ring, SpatialUnit } from '@/domain/types'
import { validateCode } from '@/domain/ulpin'
import { useData } from '@/store/data'

/**
 * Service facade mirroring the planned backend endpoints (technical-spec §C9.4).
 * Today it answers from the in-memory demo store; swap the bodies for fetch() calls later.
 */

const latency = (ms = 250) => new Promise((r) => setTimeout(r, ms))

export interface ResolveResult {
  point: { lon: number; lat: number; z: number }
  units: SpatialUnit[]
  rights: Right[]
}

/** GET /resolve?x&y&z */
export async function resolvePoint(p: LonLat, z: number): Promise<ResolveResult> {
  await latency()
  const { units, rights } = useData.getState()
  const hits = unitsAtPoint(units, p, z).sort((a, b) => order(a) - order(b))
  const codes = new Set(hits.map((u) => u.code))
  return { point: { lon: p[0], lat: p[1], z }, units: hits, rights: rights.filter((r) => codes.has(r.unitCode)) }
}

const ORDER = { U: 0, L: 1, P: 2, C: 3, G: 4, A: 5, B: 6, S: 7 } as const
const order = (u: SpatialUnit) => ORDER[u.type]

/** POST /dig-check */
export async function digCheck(area: Ring, depthM: number): Promise<DigHit[]> {
  await latency(400)
  return digCheckGeo(useData.getState().units, area, depthM)
}

export interface CollateralReport {
  unit: SpatialUnit
  owners: { name: string; since: string; deed?: string }[]
  mortgages: { lender: string; since: string; note?: string }[]
  restrictions: Right[]
  openIssues: { id: string; title: string; severity: string }[]
  verdict: 'clear' | 'caution' | 'hold'
}

/** GET /collateral/{code} */
export async function collateral(code: string): Promise<CollateralReport | null> {
  await latency(350)
  const v = validateCode(code)
  const { units, rights, parties, deeds, issues } = useData.getState()
  const unit = units.find((u) => u.code === v.normalized)
  if (!unit) return null
  const name = (id: string) => parties.find((p) => p.id === id)?.name ?? id
  const unitRights = rights.filter((r) => r.unitCode === unit.code)
  const openIssues = issues
    .filter((i) => i.status === 'open' && (i.objectCodes.includes(unit.code) || (unit.buildingId === 'BLD-7' && i.id === 'ISS-004' && unit.level === '05')))
    .map((i) => ({ id: i.id, title: i.title.en, severity: i.severity }))
  const mortgages = unitRights.filter((r) => r.type === 'mortgage').map((r) => ({ lender: name(r.partyId), since: r.since, note: r.note }))
  const restrictions = unitRights.filter((r) => r.type === 'right-of-user' || r.type === 'easement')
  const verdict: CollateralReport['verdict'] =
    openIssues.some((i) => i.severity === 'blocking') || unit.status === 'provisional' ? 'hold' : mortgages.length || restrictions.length || openIssues.length ? 'caution' : 'clear'
  return {
    unit,
    owners: unitRights
      .filter((r) => r.type === 'ownership')
      .map((r) => ({ name: name(r.partyId), since: r.since, deed: deeds.find((d) => d.id === r.sourceDeedId)?.number })),
    mortgages,
    restrictions,
    openIssues,
    verdict,
  }
}

/** POST /deeds/extract — OCR + field extraction (precomputed, simulated latency). */
export async function extractDeed(deedId: string): Promise<Deed> {
  await latency(1400)
  useData.getState().markDeedExtracted(deedId)
  return useData.getState().deeds.find((d) => d.id === deedId)!
}

export interface MatchCandidate {
  unit: SpatialUnit
  score: number
  reasons: { label: string; ok: boolean }[]
}

/** POST /deeds/{id}/match */
export async function matchDeed(deedId: string): Promise<MatchCandidate[]> {
  await latency(600)
  const { deeds, units } = useData.getState()
  const deed = deeds.find((d) => d.id === deedId)!
  const field = (k: string) => deed.fields.find((f) => f.key === k)?.value ?? ''
  const flat = field('flat')
  const floor = field('floor') || flat.slice(0, 1)
  const area = parseFloat(field('carpetArea'))
  const candidates = units.filter((u) => u.type === 'U' && u.buildingId === 'BLD-7')
  return candidates
    .map((u) => {
      const flatNo = u.label.replace('Flat ', '')
      const reasons = [
        { label: `Flat number ${flat}`, ok: flatNo === flat },
        { label: `Floor ${floor}`, ok: String(u.levelIndex) === floor },
        { label: 'Tower 1, Demo Heights', ok: field('tower') === '' || field('tower').includes('Tower 1') },
        { label: `Carpet area ${isNaN(area) ? '—' : area.toFixed(2)} m²`, ok: !isNaN(area) && !!u.carpetAreaSqm && Math.abs(u.carpetAreaSqm - area) / area < 0.01 },
      ]
      const weights = [0.55, 0.15, 0.1, 0.2]
      const score = reasons.reduce((s, r, i) => s + (r.ok ? weights[i] : 0), 0)
      return { unit: u, score: Math.round(score * 100) / 100, reasons }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}

export interface CardPayload {
  code: string
  label: string
  status: string
  issued: string
}

/** Signed QR payload for the 3D Property Card (demo key). */
export async function signCard(p: CardPayload): Promise<string> {
  const body = `BA1|${p.code}|${p.status}|${p.issued}`
  return `${body}|${await signPayload(body)}`
}

export async function verifyCard(qr: string): Promise<{ ok: boolean; code?: string; status?: string; issued?: string }> {
  const parts = qr.trim().split('|')
  if (parts.length !== 5 || parts[0] !== 'BA1') return { ok: false }
  const [, code, status, issued, sig] = parts
  const ok = await verifySignature(parts.slice(0, 4).join('|'), sig)
  return { ok, code, status, issued }
}

import { unitsAtPoint } from '@/domain/geo'
import { signPayload, verifySignature } from '@/domain/hash'
import type { LonLat, Right, SpatialUnit } from '@/domain/types'
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

const ORDER = { U: 0, L: 1, P: 2, C: 3, G: 4, A: 5, B: 6, S: 7 } as const

/** GET /resolve?x&y&z — every volume and right at a 3D point. */
export async function resolvePoint(p: LonLat, z: number): Promise<ResolveResult> {
  await latency()
  const { units, rights } = useData.getState()
  const hits = unitsAtPoint(units, p, z).sort((a, b) => ORDER[a.type] - ORDER[b.type])
  const codes = new Set(hits.map((u) => u.code))
  return { point: { lon: p[0], lat: p[1], z }, units: hits, rights: rights.filter((r) => codes.has(r.unitCode)) }
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

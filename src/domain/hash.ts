import type { AuditEvent } from './types'

export const GENESIS = '0'.repeat(64)

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function eventPayload(e: Omit<AuditEvent, 'hash'>): string {
  return [e.prevHash, e.id, e.at, e.actor, e.role, e.action, e.target, e.details].join('|')
}

export async function sealEvent(e: Omit<AuditEvent, 'hash' | 'prevHash'>, prevHash: string): Promise<AuditEvent> {
  const withPrev = { ...e, prevHash }
  return { ...withPrev, hash: await sha256Hex(eventPayload(withPrev)) }
}

export interface ChainCheck {
  ok: boolean
  brokenAt?: number
  results: { id: string; ok: boolean }[]
}

export async function verifyChain(events: AuditEvent[]): Promise<ChainCheck> {
  const results: { id: string; ok: boolean }[] = []
  let prev = GENESIS
  let brokenAt: number | undefined
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    const recomputed = await sha256Hex(eventPayload({ ...e, prevHash: prev }))
    const ok = e.prevHash === prev && recomputed === e.hash
    if (!ok && brokenAt === undefined) brokenAt = i
    results.push({ id: e.id, ok: brokenAt === undefined })
    prev = e.hash
  }
  return { ok: brokenAt === undefined, brokenAt, results }
}

const DEMO_KEY = 'bhu-aayam-demo-signing-key-not-secret'

export async function signPayload(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(DEMO_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))
  return [...new Uint8Array(sig)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function verifySignature(payload: string, signature: string): Promise<boolean> {
  return (await signPayload(payload)) === signature.toLowerCase()
}

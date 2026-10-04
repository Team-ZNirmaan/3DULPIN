import { create } from 'zustand'
import { generateFixtures, type Fixtures } from '@/data/generate'
import { rectRing, toLocal } from '@/domain/geo'
import { GENESIS, sealEvent } from '@/domain/hash'
import type { AuditEvent, IssueStatus, SpatialUnit, Status, ValidationIssue } from '@/domain/types'

export interface FlyRequest {
  lon: number
  lat: number
  height: number
  token: number
}

export interface PipelineRunState {
  status: 'idle' | 'running' | 'done'
  stageIndex: number
  completedAt?: string
}

interface DataState extends Omit<Fixtures, 'auditSeed'> {
  ready: boolean
  audit: AuditEvent[]
  pipelineRun: PipelineRunState
  selectedCode?: string
  flyRequest?: FlyRequest
  init: () => Promise<void>
  reset: () => Promise<void>
  select: (code?: string) => void
  flyTo: (focus: { lon: number; lat: number; height: number }) => void
  logEvent: (action: string, target: string, details: string) => Promise<void>
  decideIssue: (id: string, status: IssueStatus) => Promise<void>
  approveUnits: (codes: string[], to: Status) => Promise<void>
  setPipelineRun: (run: PipelineRunState) => void
  runPipeline: () => Promise<void>
}

async function sealAll(seed: Fixtures['auditSeed']): Promise<AuditEvent[]> {
  const out: AuditEvent[] = []
  let prev = GENESIS
  for (const e of seed) {
    const sealed = await sealEvent(e, prev)
    out.push(sealed)
    prev = sealed.hash
  }
  return out
}

function fresh() {
  const { auditSeed, ...rest } = generateFixtures()
  return { fixtures: rest, auditSeed }
}

const nowIso = () => new Date().toISOString()

function snapRing(u: SpatialUnit, dx0: number, dy1: number): SpatialUnit {
  const pts = u.ring.slice(0, -1).map(toLocal)
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const ring = rectRing(Math.min(...xs) + dx0, Math.min(...ys), Math.max(...xs), Math.max(...ys) + dy1)
  return { ...u, ring, version: u.version + 1 }
}

export const useData = create<DataState>()((set, get) => {
  const initial = fresh()

  const updateUnit = (code: string, fn: (u: SpatialUnit) => SpatialUnit) =>
    set({ units: get().units.map((u) => (u.code === code ? fn(u) : u)) })

  const updateIssue = (id: string, patch: Partial<ValidationIssue>) =>
    set({ issues: get().issues.map((i) => (i.id === id ? { ...i, ...patch } : i)) })

  return {
    ...initial.fixtures,
    ready: false,
    audit: [],
    pipelineRun: { status: 'idle', stageIndex: -1 },

    init: async () => {
      if (get().ready) return
      set({ audit: await sealAll(initial.auditSeed), ready: true })
    },

    reset: async () => {
      const next = fresh()
      set({ ...next.fixtures, audit: await sealAll(next.auditSeed), pipelineRun: { status: 'idle', stageIndex: -1 }, selectedCode: undefined })
    },

    select: (code) => set({ selectedCode: code }),

    flyTo: (focus) => set({ flyRequest: { ...focus, token: Date.now() } }),

    logEvent: async (action, target, details) => {
      const audit = get().audit
      const prev = audit.length ? audit[audit.length - 1].hash : GENESIS
      const sealed = await sealEvent(
        { id: `EVT-${String(audit.length + 1).padStart(4, '0')}`, at: nowIso(), actor: 'Official (demo)', role: 'official', action, target, details },
        prev,
      )
      set({ audit: [...get().audit, sealed] })
    },

    decideIssue: async (id, status) => {
      const issue = get().issues.find((i) => i.id === id)
      if (!issue) return
      updateIssue(id, { status })
      if (status === 'fix-approved') {
        if (id === 'ISS-002') updateUnit(issue.objectCodes[0], (u) => snapRing(u, 0.35, 0))
        if (id === 'ISS-005') updateUnit(issue.objectCodes[0], (u) => snapRing(u, 0, 0.018))
        if (id === 'ISS-001') {
          const metro = get().parties.find((p) => p.name.includes('Metro'))!
          const bays = issue.objectCodes.slice(0, -1)
          set({
            rights: [
              ...get().rights,
              ...bays.map((code, i) => ({
                id: `RRR-R${Date.now()}${i}`,
                unitCode: code,
                type: 'right-of-user' as const,
                partyId: metro.id,
                legalBasis: 'Restriction: within metro protection zone — no excavation, load limits apply',
                since: nowIso().slice(0, 10),
                note: `Recorded under ${id}`,
              })),
            ],
          })
        }
      }
      const verb: Record<IssueStatus, string> = {
        open: 'REOPEN',
        'fix-approved': 'APPROVE_FIX',
        rejected: 'REJECT_ISSUE',
        'sent-to-field': 'SEND_TO_FIELD',
        referred: 'ACKNOWLEDGE',
      }
      await get().logEvent(verb[status], id, issue.title.en)
    },

    approveUnits: async (codes, to) => {
      const set_ = new Set(codes)
      set({
        units: get().units.map((u) => (set_.has(u.code) ? { ...u, status: to, tier: to === 'registered' && u.tier === 'B' ? 'A' : u.tier, version: u.version + 1 } : u)),
      })
      await get().logEvent(to === 'registered' ? 'APPROVE_MINT' : `SET_${to.toUpperCase()}`, `${codes.length} units`, codes.slice(0, 3).join(', ') + (codes.length > 3 ? ' …' : ''))
    },

    setPipelineRun: (run) => set({ pipelineRun: run }),

    runPipeline: async () => {
      if (get().pipelineRun.status === 'running') return
      const stages = get().pipeline
      for (let i = 0; i < stages.length; i++) {
        set({ pipelineRun: { status: 'running', stageIndex: i } })
        await new Promise((r) => setTimeout(r, stages[i].durationMs))
        if (get().pipelineRun.status !== 'running') return
      }
      set({ pipelineRun: { status: 'done', stageIndex: stages.length, completedAt: nowIso() } })
      await get().logEvent('PIPELINE_RUN', 'Block 7', 'M1–M4 re-run completed: 84 volumes, 5 issues (simulated)')
    },
  }
})


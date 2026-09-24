import { Check, CircleCheck, CircleDashed, Clock, Cuboid, Gavel, HardHat, Lock, Ruler, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { CodeText, StatusChip, useBi } from '@/components/domain'
import { Page, PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { STATUS_LABEL, STATUS_ORDER, fmtArea } from '@/domain/display'
import type { SpatialUnit, VerificationTask } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useShowIn3d } from '@/lib/useShowIn3d'
import { useData } from '@/store/data'

function TaskCard({ task }: { task: VerificationTask }) {
  const { t } = useTranslation()
  const unit = useData((s) => s.units.find((u) => u.code === task.unitCode))!
  const issue = useData((s) => s.issues.find((i) => i.id === task.issueId))
  const complete = useData((s) => s.completeTask)
  const showIn3d = useShowIn3d()
  const bi = useBi()
  const [measured, setMeasured] = useState(task.expectedAreaSqm ? (task.expectedAreaSqm + 0.08).toFixed(2) : '')
  const [checks, setChecks] = useState({ walls: true, photos: true, rtk: unit.zMax > 0 })
  const done = task.status !== 'pending'
  const m = parseFloat(measured)
  const dev = task.expectedAreaSqm && !isNaN(m) ? ((m - task.expectedAreaSqm) / task.expectedAreaSqm) * 100 : undefined
  const within = dev === undefined || Math.abs(dev) <= 2

  const submit = async (pass: boolean) => {
    await complete(task.id, isNaN(m) ? undefined : m, pass)
    toast({ tone: pass ? 'success' : 'warning', title: pass ? t('verification.passedToast') : t('verification.failedToast'), body: unit.label })
  }

  return (
    <Card className={cn(done && 'opacity-80')}>
      <CardBody>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-navy-900">{unit.label}</span>
          <Badge tone={task.reason === 'flag' ? 'warning' : 'navy'}>{task.reason === 'flag' ? t('verification.flagged') : t('verification.sampled')}</Badge>
          {done && <Badge tone={task.status === 'passed' ? 'success' : 'blocking'}>{task.status === 'passed' ? t('verification.passed') : t('verification.failed')}</Badge>}
          <button type="button" onClick={() => showIn3d(unit.code)} className="ml-auto text-slate-500 hover:text-navy-700" aria-label="Show in 3D">
            <Cuboid className="h-4 w-4" />
          </button>
        </div>
        <CodeText code={unit.code} className="text-[0.72rem]" />
        {issue && <p className="mt-1.5 text-xs text-warning">{bi(issue.title)}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5 text-sm">
            {(
              [
                ['walls', t('verification.check.walls')],
                ['photos', t('verification.check.photos')],
                ['rtk', t('verification.check.rtk')],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-slate-700">
                <input type="checkbox" disabled={done} checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} className="accent-navy-600" />
                {label}
              </label>
            ))}
          </div>
          {task.expectedAreaSqm !== undefined && (
            <div className="rounded-md bg-surface px-3 py-2 text-sm">
              <div className="text-xs text-slate-500">{t('verification.expected')}</div>
              <div className="font-semibold">{fmtArea(task.expectedAreaSqm)}</div>
              <label className="mt-1.5 block text-xs text-slate-500" htmlFor={`m-${task.id}`}>
                <Ruler className="mr-1 inline h-3 w-3" /> {t('verification.measured')}
              </label>
              <input id={`m-${task.id}`} value={measured} disabled={done} onChange={(e) => setMeasured(e.target.value)} className="mt-0.5 h-8 w-28 rounded border border-line px-2 font-mono text-sm" />
              {dev !== undefined && <div className={cn('mt-1 text-xs font-semibold', within ? 'text-success' : 'text-blocking')}>{dev >= 0 ? '+' : ''}{dev.toFixed(2)}% · {within ? t('verification.within') : t('verification.outside')}</div>}
            </div>
          )}
        </div>
        {!done && (
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="success" onClick={() => void submit(true)} disabled={!within || !checks.walls}>
              <Check className="h-3.5 w-3.5" /> {t('verification.pass')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void submit(false)}>
              <X className="h-3.5 w-3.5" /> {t('verification.fail')}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  )
}

function StatusTimeline({ current }: { current: SpatialUnit['status'] }) {
  const bi = useBi()
  const idx = STATUS_ORDER.indexOf(current)
  return (
    <ol className="flex items-center gap-1">
      {STATUS_ORDER.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <span className={cn('flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold', i <= idx ? 'bg-success-bg text-success' : 'bg-slate-100 text-slate-500')}>
            {i <= idx ? <CircleCheck className="h-3 w-3" /> : <CircleDashed className="h-3 w-3" />}
            {bi(STATUS_LABEL[s])}
          </span>
          {i < STATUS_ORDER.length - 1 && <span className={cn('h-px w-3', i < idx ? 'bg-success' : 'bg-slate-200')} />}
        </li>
      ))}
    </ol>
  )
}

function Batch({ title, units, preconditions, blockedReason }: { title: string; units: SpatialUnit[]; preconditions: { label: string; ok: boolean }[]; blockedReason?: string }) {
  const { t } = useTranslation()
  const approve = useData((s) => s.approveUnits)
  const allOk = preconditions.every((p) => p.ok) && !blockedReason
  const registered = units.every((u) => u.status === 'registered')
  const act = async () => {
    await approve(
      units.map((u) => u.code),
      'registered',
    )
    toast({ tone: 'success', title: t('verification.mintedToast', { n: units.length }), body: t('verification.mintedBody') })
  }
  return (
    <Card>
      <CardHeader title={title} subtitle={`${units.length} ${t('verification.units')}`} actions={<StatusTimeline current={units[0]?.status ?? 'provisional'} />} />
      <CardBody className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div>
          <div className="mb-1.5 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-500">{t('verification.preconditions')}</div>
          <ul className="space-y-1.5">
            {preconditions.map((p) => (
              <li key={p.label} className={cn('flex items-center gap-2 text-sm', p.ok ? 'text-success' : 'text-slate-500')}>
                {p.ok ? <CircleCheck className="h-4 w-4" /> : <Clock className="h-4 w-4" />} {p.label}
              </li>
            ))}
          </ul>
          {blockedReason && (
            <div className="mt-3 flex items-start gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" /> {blockedReason}
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <div className="max-h-36 flex-1 space-y-1 overflow-y-auto rounded-md border border-line p-2">
            {units.map((u) => (
              <div key={u.code} className="flex items-center justify-between gap-2 text-[0.8rem]">
                <span className="truncate text-slate-700">{u.label}</span>
                <StatusChip status={u.status} />
              </div>
            ))}
          </div>
          <Button className="mt-3 self-end" variant={registered ? 'outline' : 'accent'} disabled={!allOk || registered} onClick={() => void act()}>
            <Gavel className="h-4 w-4" /> {registered ? t('verification.alreadyRegistered') : t('verification.approveMint')}
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}

export function VerificationPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const tasks = useData((s) => s.tasks)
  const units = useData((s) => s.units)
  const issues = useData((s) => s.issues)
  const tab = params.get('tab') ?? 'field'

  const sampled = tasks.filter((x) => x.reason === 'sample')
  const flagged = tasks.filter((x) => x.reason === 'flag')
  const done = tasks.filter((x) => x.status !== 'pending').length
  const b2 = units.filter((u) => u.level === 'B2')
  const floor5 = units.filter((u) => u.level === '05')
  const iss1 = issues.find((i) => i.id === 'ISS-001')
  const iss4 = issues.find((i) => i.id === 'ISS-004')
  const b2Task = tasks.find((x) => x.id === 'TSK-7')

  return (
    <Page>
      <PageHeader eyebrow="L7 — Human verification & approval" title={t('nav.verification')} description={t('verification.description')} />
      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="field">
            <HardHat className="h-4 w-4" /> {t('verification.gate1')}
          </TabsTrigger>
          <TabsTrigger value="approval">
            <Gavel className="h-4 w-4" /> {t('verification.gate2')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="field" className="pt-5">
          <Card className="mb-5">
            <CardBody className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-sm font-semibold text-slate-900">{t('verification.samplingPlan')}</div>
                <div className="text-sm text-slate-600">{t('verification.samplingRule', { s: sampled.length, n: 16, f: flagged.length })}</div>
              </div>
              <div className="min-w-[14rem] flex-1">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{t('verification.progress')}</span>
                  <span className="font-semibold">
                    {done}/{tasks.length}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-success transition-all" style={{ width: `${(done / tasks.length) * 100}%` }} />
                </div>
              </div>
              <Badge tone="neutral">QField · laser distance meter · CORS-RTK</Badge>
            </CardBody>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {[...flagged, ...sampled].map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approval" className="space-y-5 pt-5">
          <Batch
            title={t('verification.batchB2')}
            units={b2}
            preconditions={[
              { label: t('verification.pre.blocking'), ok: iss1?.status === 'fix-approved' },
              { label: t('verification.pre.field'), ok: b2Task?.status === 'passed' },
              { label: t('verification.pre.objection'), ok: true },
            ]}
          />
          <Batch
            title={t('verification.batchF5')}
            units={floor5}
            preconditions={[
              { label: t('verification.pre.plan'), ok: false },
              { label: t('verification.pre.objection'), ok: true },
            ]}
            blockedReason={iss4?.status === 'referred' ? t('verification.heldReferred') : t('verification.heldOpen')}
          />
        </TabsContent>
      </Tabs>
    </Page>
  )
}

export default VerificationPage

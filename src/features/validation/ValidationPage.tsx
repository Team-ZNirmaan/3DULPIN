import { ArrowRightLeft, Check, CircleCheck, Clock, Cuboid, Gavel, Lock, ShieldAlert, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { ClassSwatch, CodeText, SeverityBadge, StatusChip, useBi } from '@/components/domain'
import { Page, PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/toast'
import { Badge, type Tone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { SEVERITY_COLOR, classOf } from '@/domain/display'
import type { IssueStatus, Severity, ValidationIssue } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useShowIn3d } from '@/lib/useShowIn3d'
import { useData } from '@/store/data'

const STATUS_TONE: Record<IssueStatus, Tone> = {
  open: 'blocking',
  'fix-approved': 'success',
  rejected: 'neutral',
  'sent-to-field': 'info',
  referred: 'saffron',
}

function IssueListItem({ issue, active, onClick }: { issue: ValidationIssue; active: boolean; onClick: () => void }) {
  const bi = useBi()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('w-full border-l-4 px-4 py-3 text-left transition-colors', active ? 'bg-navy-50' : 'hover:bg-slate-50', issue.status !== 'open' && 'opacity-70')}
      style={{ borderLeftColor: SEVERITY_COLOR[issue.severity] }}
    >
      <div className="flex items-center gap-2">
        <SeverityBadge severity={issue.severity} />
        <span className="font-mono text-xs text-slate-500">{issue.id}</span>
        <Badge tone={STATUS_TONE[issue.status]} className="ml-auto">
          {t(`validation.status.${issue.status}`)}
        </Badge>
      </div>
      <div className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">{bi(issue.title)}</div>
    </button>
  )
}

function IssueDetail({ issue }: { issue: ValidationIssue }) {
  const { t } = useTranslation()
  const bi = useBi()
  const units = useData((s) => s.units)
  const decide = useData((s) => s.decideIssue)
  const showIn3d = useShowIn3d()
  const open = issue.status === 'open'

  const act = async (status: IssueStatus, message: string) => {
    await decide(issue.id, status)
    toast({ tone: status === 'rejected' ? 'info' : 'success', title: message, body: issue.id })
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={issue.severity} />
          <span className="font-mono text-sm text-slate-500">{issue.id}</span>
          <span className="text-sm text-slate-500">· {issue.rule}</span>
          <Badge tone={STATUS_TONE[issue.status]} className="ml-auto">
            {t(`validation.status.${issue.status}`)}
          </Badge>
        </div>
        <h2 className="mt-3 text-xl font-bold text-navy-900">{bi(issue.title)}</h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-700">{bi(issue.explanation)}</p>
        <div className="mt-2 text-xs text-slate-500">
          {t('validation.detectedBy')}: <strong className="font-semibold text-slate-700">{issue.detectedBy}</strong>
          {issue.anomalyScore !== undefined && (
            <>
              {' · '}
              {t('validation.anomaly')}: <strong className="font-semibold text-warning">{issue.anomalyScore.toFixed(2)}</strong>
            </>
          )}
        </div>
      </CardBody>

      <div className="grid gap-0 border-t border-line lg:grid-cols-2">
        <div className="border-b border-line p-4 lg:border-b-0 lg:border-r">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[0.72rem] font-semibold uppercase tracking-wider text-slate-500">{t('validation.objects')}</h3>
            <Button size="sm" variant="outline" onClick={() => showIn3d(issue.objectCodes[0], issue.focus)}>
              <Cuboid className="h-3.5 w-3.5" /> {t('validation.show3d')}
            </Button>
          </div>
          <div className="space-y-1.5">
            {issue.objectCodes.map((code) => {
              const u = units.find((x) => x.code === code)
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => showIn3d(code, u && u.zMax < 0 ? issue.focus : undefined)}
                  className="block w-full rounded-md border border-line px-3 py-2 text-left hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    {u && <ClassSwatch cls={classOf(u)} label={false} />}
                    <span className="text-sm font-semibold text-slate-800">{u?.label ?? code}</span>
                  </div>
                  <CodeText code={code} className="text-[0.72rem]" />
                </button>
              )
            })}
          </div>
        </div>
        <div className="p-4">
          <h3 className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-500">{t('validation.suggestion')}</h3>
          {issue.suggestion && <p className="text-sm leading-relaxed text-slate-700">{bi(issue.suggestion)}</p>}
          {issue.beforeAfter && (
            <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div className="rounded-md bg-blocking-bg px-3 py-2">
                <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-blocking/80">{t('validation.before')}</div>
                <div className="text-sm font-bold text-blocking">{issue.beforeAfter.before}</div>
              </div>
              <ArrowRightLeft className="h-4 w-4 text-slate-500" />
              <div className="rounded-md bg-success-bg px-3 py-2">
                <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-success/80">{t('validation.after')}</div>
                <div className="text-sm font-bold text-success">{issue.beforeAfter.after}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3">
        <span className="mr-auto text-sm text-slate-600">{open ? t('validation.decide') : t('validation.decided')}</span>
        {issue.fixable ? (
          <Button variant="success" disabled={!open} onClick={() => void act('fix-approved', t('validation.toast.fix'))}>
            <Check className="h-4 w-4" /> {issue.id === 'ISS-001' ? t('validation.recordRestriction') : t('validation.approveFix')}
          </Button>
        ) : (
          <Button variant="accent" disabled={!open} onClick={() => void act('referred', t('validation.toast.acknowledged'))}>
            <Check className="h-4 w-4" /> {t('validation.acknowledge')}
          </Button>
        )}
        <Button variant="ghost" disabled={!open} onClick={() => void act('rejected', t('validation.toast.rejected'))}>
          <X className="h-4 w-4" /> {t('validation.reject')}
        </Button>
      </div>
    </Card>
  )
}

function RegisterCard() {
  const { t } = useTranslation()
  const units = useData((s) => s.units)
  const issues = useData((s) => s.issues)
  const approve = useData((s) => s.approveUnits)
  const b2 = units.filter((u) => u.buildingId === 'BLD-7' && u.level === 'B2')
  const floor5 = units.filter((u) => u.buildingId === 'BLD-7' && u.level === '05')
  const tunnelResolved = issues.find((i) => i.id === 'ISS-001')?.status === 'fix-approved'
  const b2Registered = b2.every((u) => u.status === 'registered')

  const register = async () => {
    await approve(
      b2.map((u) => u.code),
      'registered',
    )
    toast({ tone: 'success', title: t('validation.registeredToast', { n: b2.length }), body: t('validation.registeredBody') })
  }

  const rows = [
    {
      key: 'b2',
      label: t('validation.batchB2'),
      count: b2.length,
      status: b2[0]?.status,
      ready: tunnelResolved && !b2Registered,
      note: b2Registered ? t('validation.done') : tunnelResolved ? t('validation.ready') : t('validation.blockedBy', { id: 'ISS-001' }),
    },
    { key: 'f5', label: t('validation.batchF5'), count: floor5.length, status: floor5[0]?.status, ready: false, note: t('validation.heldF5') },
  ]

  return (
    <Card className="mb-5">
      <CardHeader title={t('validation.registerTitle')} subtitle={t('validation.registerSubtitle')} />
      <CardBody className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-3 py-2.5">
            {r.status === 'registered' ? <CircleCheck className="h-5 w-5 text-success" /> : r.ready ? <Clock className="h-5 w-5 text-info" /> : <Lock className="h-5 w-5 text-warning" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">
                {r.label} <span className="font-normal text-slate-500">· {r.count} {t('validation.units')}</span>
              </div>
              <div className="text-xs text-slate-500">{r.note}</div>
            </div>
            {r.status && <StatusChip status={r.status} />}
            {r.key === 'b2' && (
              <Button variant="accent" disabled={!r.ready} onClick={() => void register()}>
                <Gavel className="h-4 w-4" /> {t('validation.approveRegister')}
              </Button>
            )}
          </div>
        ))}
      </CardBody>
    </Card>
  )
}

export function ValidationPage() {
  const { t } = useTranslation()
  const issues = useData((s) => s.issues)
  const [params, setParams] = useSearchParams()
  const activeId = params.get('issue') ?? issues[0]?.id
  const active = issues.find((i) => i.id === activeId)
  const counts = (s: Severity) => issues.filter((i) => i.severity === s && i.status === 'open').length

  return (
    <Page>
      <PageHeader
        eyebrow={t('validation.eyebrow')}
        title={t('nav.validation')}
        description={t('validation.description')}
        actions={
          <div className="flex gap-2">
            {(['blocking', 'warning', 'info'] as Severity[]).map((s) => (
              <span key={s} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[s] }} />
                <strong>{counts(s)}</strong>
                <span className="text-slate-500">{t(`validation.sev.${s}`)}</span>
              </span>
            ))}
          </div>
        }
      />

      <RegisterCard />

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <Card className="self-start overflow-hidden">
          <div className="divide-y divide-line">
            {issues.map((i) => (
              <IssueListItem key={i.id} issue={i} active={i.id === activeId} onClick={() => setParams({ issue: i.id })} />
            ))}
          </div>
        </Card>
        {active ? (
          <IssueDetail issue={active} />
        ) : (
          <Card className="flex items-center justify-center py-16 text-sm text-slate-500">
            <ShieldAlert className="mr-2 h-4 w-4" /> {t('validation.none')}
          </Card>
        )}
      </div>
    </Page>
  )
}

export default ValidationPage

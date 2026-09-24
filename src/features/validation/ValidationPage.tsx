import { ArrowRightLeft, Box, Check, Cuboid, HardHat, Landmark, Search, ShieldAlert, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { ClassSwatch, CodeText, SeverityBadge, useBi } from '@/components/domain'
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

const LAYERS = [
  ['L1', 'Geometric validity (val3dity)'],
  ['L2', '3D topology (SFCGAL)'],
  ['L3', 'Regulatory / bylaws'],
  ['L4', 'ML anomaly (Isolation Forest)'],
  ['L5', 'Repair suggestions'],
] as const

function IssueListItem({ issue, active, onClick }: { issue: ValidationIssue; active: boolean; onClick: () => void }) {
  const bi = useBi()
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full border-l-4 px-4 py-3 text-left transition-colors',
        active ? 'bg-navy-50' : 'hover:bg-slate-50',
        issue.status !== 'open' && 'opacity-70',
      )}
      style={{ borderLeftColor: SEVERITY_COLOR[issue.severity] }}
    >
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-semibold text-slate-500">{issue.id}</span>
        <span className="rounded bg-slate-100 px-1.5 font-mono text-[0.68rem] text-slate-500">{issue.layer}</span>
        <Badge tone={STATUS_TONE[issue.status]} className="ml-auto">
          {t(`validation.status.${issue.status}`)}
        </Badge>
      </div>
      <div className="mt-1 text-sm font-semibold leading-snug text-slate-900">{bi(issue.title)}</div>
      <div className="mt-0.5 text-xs text-slate-500">{issue.rule}</div>
    </button>
  )
}

function IssueDetail({ issue }: { issue: ValidationIssue }) {
  const { t, i18n } = useTranslation()
  const bi = useBi()
  const units = useData((s) => s.units)
  const decide = useData((s) => s.decideIssue)
  const showIn3d = useShowIn3d()
  const other = i18n.language === 'hi' ? issue.explanation.en : issue.explanation.hi

  const act = async (status: IssueStatus, message: string) => {
    await decide(issue.id, status)
    toast({ tone: status === 'rejected' ? 'info' : 'success', title: message, body: `${issue.id} · ${t('validation.logged')}` })
  }

  const open = issue.status === 'open'

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <span className="font-mono text-sm text-slate-500">{issue.id}</span>
            <span className="text-sm text-slate-500">·</span>
            <span className="text-sm text-slate-600">{issue.rule}</span>
            <Badge tone={STATUS_TONE[issue.status]} className="ml-auto">
              {t(`validation.status.${issue.status}`)}
            </Badge>
          </div>
          <h2 className="mt-3 text-xl font-bold text-navy-900">{bi(issue.title)}</h2>
          <p className="mt-2 text-[0.95rem] leading-relaxed text-slate-700">{bi(issue.explanation)}</p>
          <div className="mt-3 rounded-md border border-dashed border-line bg-surface px-3 py-2">
            <div className="mb-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{i18n.language === 'hi' ? 'English' : 'हिंदी'}</div>
            <p className="text-sm leading-relaxed text-slate-600">{other}</p>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>
              {t('validation.detectedBy')}: <strong className="font-semibold text-slate-700">{issue.detectedBy}</strong>
            </span>
            <span>{t('validation.templateNote')}</span>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('validation.objects')} actions={<Button size="sm" variant="outline" onClick={() => showIn3d(issue.objectCodes[0], issue.focus)}><Cuboid className="h-3.5 w-3.5" /> {t('validation.show3d')}</Button>} />
          <CardBody className="space-y-2">
            {issue.objectCodes.map((code) => {
              const u = units.find((x) => x.code === code)
              return (
                <button key={code} type="button" onClick={() => showIn3d(code, u?.zMax !== undefined && u.zMax < 0 ? issue.focus : undefined)} className="block w-full rounded-md border border-line px-3 py-2 text-left hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    {u && <ClassSwatch cls={classOf(u)} label={false} />}
                    <span className="text-sm font-semibold text-slate-800">{u?.label ?? code}</span>
                  </div>
                  <CodeText code={code} className="text-[0.72rem]" />
                </button>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t('validation.suggestion')} />
          <CardBody className="space-y-3">
            {issue.suggestion && <p className="text-sm leading-relaxed text-slate-700">{bi(issue.suggestion)}</p>}
            {issue.beforeAfter && (
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-md bg-blocking-bg px-3 py-2">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-blocking/80">{t('validation.before')}</div>
                  <div className="text-sm font-bold text-blocking">{issue.beforeAfter.before}</div>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-slate-500" />
                <div className="rounded-md bg-success-bg px-3 py-2">
                  <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-success/80">{t('validation.after')}</div>
                  <div className="text-sm font-bold text-success">{issue.beforeAfter.after}</div>
                </div>
                <div className="col-span-3 text-xs text-slate-500">{issue.beforeAfter.metric}</div>
              </div>
            )}
            {issue.anomalyScore !== undefined && (
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-600">{t('validation.anomaly')}</span>
                  <span className="font-bold text-warning">{issue.anomalyScore.toFixed(2)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-blocking" style={{ width: `${issue.anomalyScore * 100}%` }} />
                </div>
                <div className="mt-1 text-[0.7rem] text-slate-500">{t('validation.anomalyNote')}</div>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center gap-2">
          <span className="mr-auto text-sm text-slate-600">{open ? t('validation.decide') : t('validation.decided')}</span>
          {issue.fixable && (
            <Button variant="success" disabled={!open} onClick={() => void act('fix-approved', t('validation.toast.fix'))}>
              <Check className="h-4 w-4" /> {issue.id === 'ISS-001' ? t('validation.recordRestriction') : t('validation.approveFix')}
            </Button>
          )}
          {issue.id === 'ISS-004' && (
            <Button variant="accent" disabled={!open} onClick={() => void act('referred', t('validation.toast.referred'))}>
              <Landmark className="h-4 w-4" /> {t('validation.refer')}
            </Button>
          )}
          <Button variant="outline" disabled={!open} onClick={() => void act('sent-to-field', t('validation.toast.field'))}>
            <HardHat className="h-4 w-4" /> {t('validation.sendField')}
          </Button>
          <Button variant="ghost" disabled={!open} onClick={() => void act('rejected', t('validation.toast.rejected'))}>
            <X className="h-4 w-4" /> {t('validation.reject')}
          </Button>
          {!open && (
            <Button variant="ghost" onClick={() => void decide(issue.id, 'open')}>
              {t('validation.reopen')}
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  )
}

export function ValidationPage() {
  const { t } = useTranslation()
  const bi = useBi()
  const issues = useData((s) => s.issues)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const [sev, setSev] = useState<Severity | 'all'>('all')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const activeId = params.get('issue') ?? issues[0]?.id

  const filtered = useMemo(
    () =>
      issues.filter(
        (i) =>
          (sev === 'all' || i.severity === sev) &&
          (!onlyOpen || i.status === 'open') &&
          (!q || `${i.id} ${bi(i.title)} ${i.rule}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [issues, sev, onlyOpen, q, bi],
  )
  const active = issues.find((i) => i.id === activeId)
  const counts = (s: Severity) => issues.filter((i) => i.severity === s && i.status === 'open').length

  return (
    <Page>
      <PageHeader eyebrow="L6 — M4 Intelligent topology validation" title={t('nav.validation')} description={t('validation.description')} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(['blocking', 'warning', 'info'] as Severity[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSev(sev === s ? 'all' : s)}
            aria-pressed={sev === s}
            className={cn('flex items-center gap-3 rounded-lg border bg-white px-4 py-3 text-left', sev === s ? 'border-navy-600 ring-1 ring-navy-600' : 'border-line')}
          >
            <span className="h-9 w-1.5 rounded-full" style={{ backgroundColor: SEVERITY_COLOR[s] }} />
            <div>
              <div className="text-2xl font-bold text-navy-900">{counts(s)}</div>
              <div className="text-xs font-medium text-slate-500">
                {t(`validation.open`)} · {t(`validation.sev.${s}`)}
              </div>
            </div>
          </button>
        ))}
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Box className="h-3.5 w-3.5" /> {t('validation.layers')}
          </div>
          <ul className="space-y-0.5">
            {LAYERS.map(([k, v]) => (
              <li key={k} className="text-[0.72rem] text-slate-600">
                <span className="mr-1 font-mono font-semibold text-navy-700">{k}</span>
                {v}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[24rem_1fr]">
        <Card className="self-start overflow-hidden">
          <div className="space-y-2 border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('validation.search')}
                className="h-9 w-full rounded-md border border-line pl-8 pr-3 text-sm"
                aria-label={t('validation.search')}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} className="accent-navy-600" />
              {t('validation.onlyOpen')}
            </label>
          </div>
          <div className="divide-y divide-line">
            {filtered.map((i) => (
              <IssueListItem key={i.id} issue={i} active={i.id === activeId} onClick={() => setParams({ issue: i.id })} />
            ))}
            {filtered.length === 0 && <p className="px-4 py-6 text-sm text-slate-500">{t('validation.none')}</p>}
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

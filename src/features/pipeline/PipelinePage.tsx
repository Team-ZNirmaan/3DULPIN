import { Check, ChevronDown, ChevronRight, CircleAlert, Loader2, Play, RotateCcw, Satellite, ScanLine } from 'lucide-react'
import { Fragment, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { Page, PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import type { Dataset } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'

const RELIANCE_TONE = { core: 'navy', supporting: 'neutral', optional: 'saffron' } as const

function Stepper() {
  const { t } = useTranslation()
  const stages = useData((s) => s.pipeline)
  const run = useData((s) => s.pipelineRun)
  const [focus, setFocus] = useState<number | null>(null)
  const current = run.status === 'running' ? run.stageIndex : run.status === 'done' ? stages.length : -1
  const shown = focus ?? (run.status === 'running' ? run.stageIndex : run.status === 'done' ? stages.length - 1 : 0)
  const stage = stages[shown]

  return (
    <Card>
      <CardHeader
        title={t('pipeline.runTitle')}
        subtitle={t('pipeline.runSubtitle')}
        actions={<Badge tone="saffron">{t('common.simulated')}</Badge>}
      />
      <CardBody>
        <ol className="grid grid-cols-4 gap-2 xl:grid-cols-8">
          {stages.map((s, i) => {
            const state = i < current ? 'done' : i === current && run.status === 'running' ? 'running' : 'pending'
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setFocus(i)}
                  className={cn(
                    'relative flex h-full w-full flex-col items-start gap-1.5 rounded-lg border p-2.5 text-left transition-colors',
                    shown === i ? 'border-navy-600 ring-1 ring-navy-600' : 'border-line hover:border-navy-100',
                    state === 'done' && 'bg-success-bg/60',
                    state === 'running' && 'bg-saffron-50',
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-mono text-[0.68rem] font-semibold text-slate-500">{s.layer}</span>
                    {state === 'done' && <Check className="h-4 w-4 text-success" />}
                    {state === 'running' && <Loader2 className="h-4 w-4 animate-spin text-saffron-600" />}
                    {state === 'pending' && <span className="h-2 w-2 rounded-full bg-slate-300" />}
                  </div>
                  <span className="text-[0.8rem] font-semibold leading-tight text-slate-800">{s.label}</span>
                  {state === 'running' && (
                    <span className="absolute inset-x-2 bottom-1 h-0.5 overflow-hidden rounded bg-saffron-400/30">
                      <span className="block h-full animate-[progress_1.2s_ease-in-out_infinite] bg-saffron-500" style={{ width: '40%' }} />
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ol>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-lg bg-navy-950 p-4 font-mono text-[0.78rem] leading-relaxed text-navy-100">
            <div className="mb-2 flex items-center gap-2 text-[0.7rem] uppercase tracking-wider text-navy-100/50">
              <ScanLine className="h-3.5 w-3.5" /> {stage.layer} · {stage.label}
            </div>
            {stage.log.map((line, i) => {
              const visible = run.status !== 'running' || shown < current || (shown === current && i === 0)
              return (
                <div key={i} className={cn('flex gap-2', !visible && 'opacity-30')}>
                  <span className="text-saffron-400">›</span>
                  <span className={cn(line.includes('FLAG') || line.includes('WARN') ? 'text-amber-300' : line.includes('PASS') ? 'text-green-300' : '')}>{line}</span>
                </div>
              )
            })}
          </div>
          <div>
            <div className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-500">{t('pipeline.outputs')}</div>
            <div className="grid grid-cols-2 gap-2">
              {stage.outputs.map((o) => (
                <div key={o.label} className="rounded-lg border border-line bg-surface px-3 py-2">
                  <div className="text-xl font-bold text-navy-900">{o.value}</div>
                  <div className="text-xs text-slate-500">{o.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

function DatasetRow({ d }: { d: Dataset }) {
  const [open, setOpen] = useState(false)
  const passed = d.qc.filter((q) => q.pass).length
  const allPass = passed === d.qc.length
  return (
    <Fragment>
      <tr className="cursor-pointer border-t border-line hover:bg-slate-50" onClick={() => setOpen(!open)}>
        <td className="py-2.5 pl-4 pr-2">{open ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}</td>
        <td className="py-2.5 pr-3">
          <div className="font-medium text-slate-900">{d.name}</div>
          <div className="text-xs text-slate-500">{d.source}</div>
        </td>
        <td className="py-2.5 pr-3">
          <Badge tone={RELIANCE_TONE[d.reliance]}>{d.reliance}</Badge>
        </td>
        <td className="py-2.5 pr-3 text-sm text-slate-600">{d.captured}</td>
        <td className="py-2.5 pr-3 font-mono text-xs text-slate-600">{d.crs}</td>
        <td className="py-2.5 pr-3 text-sm text-slate-600">{d.accuracy}</td>
        <td className="py-2.5 pr-4">
          <Badge tone={allPass ? 'success' : 'warning'}>
            {allPass ? <Check className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />} {passed}/{d.qc.length}
          </Badge>
        </td>
      </tr>
      {open && (
        <tr className="bg-surface">
          <td />
          <td colSpan={6} className="pb-3 pr-4">
            <div className="grid gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-3">
              {d.qc.map((q) => (
                <div key={q.name} className="rounded-md border border-line bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-600">{q.name}</span>
                    {q.pass ? <Check className="h-3.5 w-3.5 text-success" /> : <CircleAlert className="h-3.5 w-3.5 text-warning" />}
                  </div>
                  <div className="font-semibold text-slate-900">{q.value}</div>
                  <div className="text-[0.7rem] text-slate-500">Threshold: {q.threshold}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Licence: {d.licence} · Size: {d.size}
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

export function PipelinePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const datasets = useData((s) => s.datasets)
  const run = useData((s) => s.pipelineRun)
  const runPipeline = useData((s) => s.runPipeline)
  const setPipelineRun = useData((s) => s.setPipelineRun)

  return (
    <Page>
      <PageHeader
        eyebrow="L1 → L7"
        title={t('nav.pipeline')}
        description={t('pipeline.description')}
        actions={
          <>
            {run.status === 'done' && (
              <Button variant="outline" onClick={() => navigate('/app/validation')}>
                {t('pipeline.reviewIssues')}
              </Button>
            )}
            {run.status !== 'idle' && (
              <Button variant="ghost" onClick={() => setPipelineRun({ status: 'idle', stageIndex: -1 })} disabled={run.status === 'running'}>
                <RotateCcw className="h-4 w-4" /> {t('pipeline.resetRun')}
              </Button>
            )}
            <Button variant="accent" onClick={() => void runPipeline()} disabled={run.status === 'running'}>
              {run.status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {run.status === 'running' ? t('pipeline.running') : t('pipeline.run')}
            </Button>
          </>
        }
      />

      <Stepper />

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_20rem]">
        <Card className="overflow-hidden">
          <CardHeader title={t('pipeline.catalogue')} subtitle={t('pipeline.catalogueSubtitle')} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-[0.7rem] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-8" />
                  <th className="py-2 pr-3 font-semibold">{t('pipeline.col.dataset')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('pipeline.col.reliance')}</th>
                  <th className="py-2 pr-3 font-semibold">{t('pipeline.col.captured')}</th>
                  <th className="py-2 pr-3 font-semibold">CRS</th>
                  <th className="py-2 pr-3 font-semibold">{t('pipeline.col.accuracy')}</th>
                  <th className="py-2 pr-4 font-semibold">QC</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <DatasetRow key={d.id} d={d} />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('pipeline.trustTitle')} />
            <CardBody className="space-y-3 text-sm">
              {[
                { label: 'CORS · drone survey · cadastre · AutoDCR plans · NGDRS deeds', tone: 'navy' as const, tag: 'core' },
                { label: 'Utility records · metro as-builts · satellite screening', tone: 'neutral' as const, tag: 'supporting' },
                { label: 'LiDAR — not used in this run', tone: 'saffron' as const, tag: 'optional' },
              ].map((r) => (
                <div key={r.tag} className="flex items-start gap-2">
                  <Badge tone={r.tone}>{r.tag}</Badge>
                  <span className="text-slate-600">{r.label}</span>
                </div>
              ))}
              <p className="border-t border-line pt-3 text-xs leading-relaxed text-slate-500">{t('pipeline.trustNote')}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="flex items-start gap-3">
              <Satellite className="mt-0.5 h-5 w-5 shrink-0 text-navy-600" />
              <div className="text-sm text-slate-600">{t('pipeline.photogrammetryNote')}</div>
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  )
}

export default PipelinePage

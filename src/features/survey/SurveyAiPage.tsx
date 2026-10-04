import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Map as MapIcon,
  Mountain,
  Plane,
  Play,
  RotateCcw,
  Satellite,
  ScanLine,
  ScanSearch,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { Page, PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CLASS_COLOR } from '@/domain/display'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'
import { FacadeView, OrthoView, PlanView } from './visuals'

const INPUTS = [
  { key: 'drone', icon: Plane, value: '2.5 cm GSD · 1,842' },
  { key: 'pointcloud', icon: ScanLine, value: '214 M pts' },
  { key: 'parcels', icon: MapIcon, value: '18 · ULPIN' },
  { key: 'plans', icon: FileText, value: 'PreDCR DXF' },
  { key: 'cors', icon: Satellite, value: 'RMSE 3.4 cm' },
  { key: 'dem', icon: Mountain, value: 'DSM 5 cm' },
] as const

function Metric({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'good' }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2.5">
      <div className={cn('text-xl font-bold', tone === 'good' ? 'text-success' : 'text-navy-900')}>{value}</div>
      <div className="text-xs font-medium text-slate-600">{label}</div>
      {hint && <div className="mt-0.5 text-[0.7rem] text-slate-500">{hint}</div>}
    </div>
  )
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn('rounded-md border px-2.5 py-1 text-xs font-semibold', on ? 'border-navy-600 bg-navy-50 text-navy-800' : 'border-line text-slate-500 hover:bg-slate-50')}
    >
      {children}
    </button>
  )
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-[0.75rem]">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          <span className="rounded-full bg-navy-50 px-2.5 py-1 font-medium text-navy-800">
            <span className="mr-1 font-mono text-navy-500">{i + 1}</span>
            {s}
          </span>
          {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
        </li>
      ))}
    </ol>
  )
}

function PipelineCard() {
  const { t } = useTranslation()
  const stages = useData((s) => s.pipeline)
  const run = useData((s) => s.pipelineRun)
  const runPipeline = useData((s) => s.runPipeline)
  const setPipelineRun = useData((s) => s.setPipelineRun)
  const current = run.status === 'running' ? run.stageIndex : run.status === 'done' ? stages.length : -1
  const shown = stages[Math.min(Math.max(current, 0), stages.length - 1)]
  const done = run.status === 'done'

  return (
    <Card className="mb-5">
      <CardHeader
        title={t('pipeline.runTitle')}
        subtitle={t('pipeline.runSubtitle')}
        actions={
          <>
            <Badge tone="saffron">{t('common.simulated')}</Badge>
            {run.status !== 'idle' && (
              <Button size="sm" variant="ghost" onClick={() => setPipelineRun({ status: 'idle', stageIndex: -1 })} disabled={run.status === 'running'}>
                <RotateCcw className="h-3.5 w-3.5" /> {t('pipeline.resetRun')}
              </Button>
            )}
            <Button size="sm" variant="accent" onClick={() => void runPipeline()} disabled={run.status === 'running'}>
              {run.status === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {run.status === 'running' ? t('pipeline.running') : t('pipeline.run')}
            </Button>
          </>
        }
      />
      <CardBody className="space-y-4">
        <div>
          <div className="mb-2 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-500">{t('survey.inputsTitle')}</div>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {INPUTS.map(({ key, icon: Icon, value }) => (
              <li key={key} className="flex items-start gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold leading-tight text-slate-900">{t(`survey.input.${key}.name`)}</div>
                  <div className="truncate text-[0.72rem] text-slate-500">{t(`survey.input.${key}.source`)}</div>
                  <div className="mt-0.5 flex items-center gap-1 font-mono text-[0.72rem] font-semibold text-navy-700">
                    {value}
                    {done && <Check className="h-3 w-3 text-success" aria-label="QC passed" />}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <ol className="flex flex-wrap items-center gap-1.5" aria-label={t('pipeline.runTitle')}>
            {stages.map((s, i) => {
              const state = i < current ? 'done' : i === current && run.status === 'running' ? 'running' : 'pending'
              return (
                <li key={s.id} className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.78rem] font-medium',
                      state === 'done' && 'border-success/30 bg-success-bg text-success',
                      state === 'running' && 'border-saffron-400 bg-saffron-50 text-saffron-700',
                      state === 'pending' && 'border-line bg-white text-slate-500',
                    )}
                  >
                    {state === 'done' && <Check className="h-3.5 w-3.5" />}
                    {state === 'running' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t(`survey.stage.${s.id}`)}
                  </span>
                  {i < stages.length - 1 && <ArrowRight className="h-3 w-3 text-slate-300" />}
                </li>
              )
            })}
          </ol>
          {run.status !== 'idle' && shown && (
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{done ? t('survey.completed') : t(`survey.stage.${shown.id}`)}</span>
              {!done && ' — '}
              {!done && shown.outputs.map((o) => `${o.label}: ${o.value}`).join(' · ')}
              {done && (
                <Link to="/app/explorer" className="ml-2 inline-flex items-center gap-1 font-semibold text-navy-700 hover:underline">
                  {t('survey.openModel')} <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

export function SurveyAiPage() {
  const { t } = useTranslation()
  const building = useData((s) => s.buildings.find((b) => b.id === 'BLD-7')!)
  const analysis = useData((s) => s.analysis.find((a) => a.buildingId === 'BLD-7')!)
  const units = useData((s) => s.units)
  const [roof, setRoof] = useState(true)
  const [wall, setWall] = useState(true)
  const [seg, setSeg] = useState(false)
  const [det, setDet] = useState(true)
  const [graph, setGraph] = useState(true)
  const [planLevel, setPlanLevel] = useState('03')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'm1'

  const levelUnits = useMemo(() => units.filter((u) => u.buildingId === 'BLD-7' && u.level === planLevel && u.type !== 'B'), [units, planLevel])

  return (
    <Page>
      <PageHeader eyebrow={t('survey.eyebrow')} title={t('steps.survey')} description={t('survey.description')} />

      <PipelineCard />

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-blocking/30 bg-blocking-bg px-4 py-2.5 text-sm text-blocking">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          <strong>{building.label}</strong> · {t('analysis.deviation')} — {building.floorsDetected} {t('analysis.detected')}, {building.floorsSanctioned} {t('analysis.sanctioned')} (+ stilt)
        </span>
      </div>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="m1">
            <ScanSearch className="h-4 w-4" /> M1 · {t('analysis.tab.m1')}
          </TabsTrigger>
          <TabsTrigger value="m2">
            <Layers className="h-4 w-4" /> M2 · {t('analysis.tab.m2')}
          </TabsTrigger>
          <TabsTrigger value="m3">
            <GitBranch className="h-4 w-4" /> M3 · {t('analysis.tab.m3')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="m1" className="pt-5">
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader
                title={t('analysis.m1.viewTitle')}
                subtitle={t('analysis.m1.viewSubtitle')}
                actions={
                  <div className="flex gap-1.5">
                    <Toggle on={seg} onClick={() => setSeg(!seg)}>
                      {t('analysis.m1.mask')}
                    </Toggle>
                    <Toggle on={roof} onClick={() => setRoof(!roof)}>
                      {t('analysis.m1.roof')}
                    </Toggle>
                    <Toggle on={wall} onClick={() => setWall(!wall)}>
                      {t('analysis.m1.wall')}
                    </Toggle>
                  </div>
                }
              />
              <CardBody>
                <div className="aspect-[5/4]">
                  <OrthoView showRoof={roof} showWall={wall} showSeg={seg} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-5 border-t-2 border-dashed border-saffron-500" /> {t('analysis.m1.roofLegend')}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-0.5 w-5 bg-navy-700" /> {t('analysis.m1.wallLegend')}
                  </span>
                </div>
              </CardBody>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader title={t('analysis.method')} />
                <CardBody>
                  <Steps steps={t('survey.m1Steps').split('|')} />
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('analysis.m1.explain')}</p>
                </CardBody>
              </Card>
              <div className="grid grid-cols-2 gap-2">
                <Metric label={t('survey.metric.iou')} value={analysis.m1.iou.toFixed(2)} hint={t('survey.metric.iouHint')} tone="good" />
                <Metric label={t('survey.metric.boundaryF')} value={analysis.m1.boundaryF.toFixed(2)} tone="good" />
                <Metric label={t('survey.metric.heightRmse')} value={`${(analysis.m1.heightRmseM * 100).toFixed(0)} cm`} hint={t('survey.metric.heightRmseHint')} />
                <Metric label={t('survey.metric.roofWall')} value={`${analysis.m1.roofVsWallOffsetM.toFixed(2)} m`} hint={t('survey.metric.roofWallHint')} />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="m2" className="pt-5">
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <Card>
              <CardHeader
                title={t('analysis.m2.viewTitle')}
                subtitle={`${analysis.m2.facadeDetections} ${t('analysis.m2.detections')}`}
                actions={
                  <Toggle on={det} onClick={() => setDet(!det)}>
                    {t('analysis.m2.showDetections')}
                  </Toggle>
                }
              />
              <CardBody>
                <div className="aspect-[30/23]">
                  <FacadeView evidence={analysis.m2.evidence} showDetections={det} />
                </div>
              </CardBody>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader title={t('analysis.m2.evidenceTitle')} subtitle="E1 plan · E2 facade · E3 DSM → fused" />
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface text-[0.7rem] uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">{t('analysis.m2.level')}</th>
                        <th className="px-2 py-2 text-right">E1 plan</th>
                        <th className="px-2 py-2 text-right">E2 facade</th>
                        <th className="px-4 py-2 text-right">{t('analysis.m2.fused')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.m2.evidence.map((e) => (
                        <tr key={e.level} className={cn('border-t border-line', !e.sanctioned && 'bg-blocking-bg')}>
                          <td className="px-4 py-1.5 font-mono font-semibold">{e.level}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{e.planZ === null ? <span className="font-sans text-xs font-semibold text-blocking">—</span> : e.planZ.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{e.facadeZ === null ? '—' : e.facadeZ.toFixed(2)}</td>
                          <td className="px-4 py-1.5 text-right font-mono font-semibold">{e.fusedZ.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-line bg-surface">
                        <td className="px-4 py-1.5 text-xs text-slate-500">E3 DSM</td>
                        <td colSpan={3} className="px-4 py-1.5 text-right text-xs text-slate-600">
                          {analysis.m2.groundZ.toFixed(2)} m → {analysis.m2.roofZ.toFixed(2)} m
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
              <div className="rounded-lg border border-blocking/30 bg-blocking-bg px-4 py-3 text-sm text-blocking">{t('analysis.m2.flag')}</div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="m3" className="pt-5">
          <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
            <Card>
              <CardHeader
                title={`${t('analysis.m3.viewTitle')} · ${planLevel}`}
                subtitle="PreDCR DXF · sanction DEMO/BP/2022/0147"
                actions={
                  <div className="flex items-center gap-1.5">
                    <select
                      value={planLevel}
                      onChange={(e) => setPlanLevel(e.target.value)}
                      className="h-7 rounded-md border border-line bg-white px-2 text-xs font-semibold"
                      aria-label={t('analysis.m2.level')}
                    >
                      {['01', '02', '03', '04', '05', '00', 'B1', 'B2'].map((l) => (
                        <option key={l} value={l}>
                          {l}
                        </option>
                      ))}
                    </select>
                    <Toggle on={graph} onClick={() => setGraph(!graph)}>
                      {t('analysis.m3.graph')}
                    </Toggle>
                  </div>
                }
              />
              <CardBody>
                <div className="aspect-[27/21]">
                  <PlanView units={levelUnits} showGraph={graph && levelUnits.some((u) => u.type === 'U')} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-600">
                  {(['exclusive', 'limited', 'common', 'parking'] as const).map((c) => (
                    <span key={c} className="flex items-center gap-1.5">
                      <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: CLASS_COLOR[c] }} /> {t(`analysis.m3.cls.${c}`)}
                    </span>
                  ))}
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3.5 rounded-sm bg-saffron-500" /> {t('analysis.m3.entrance')}
                  </span>
                </div>
              </CardBody>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader title={t('analysis.method')} />
                <CardBody>
                  <Steps steps={t('survey.m3Steps').split('|')} />
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('analysis.m3.explain')}</p>
                </CardBody>
              </Card>
              <div className="grid grid-cols-2 gap-2">
                <Metric label={t('survey.metric.unitsGraph')} value={String(analysis.m3.unitsFromGraph)} hint={t('survey.metric.unitsGraphHint', { n: analysis.m3.unitsInRera })} tone="good" />
                <Metric label={t('survey.metric.planScale')} value={analysis.m3.scale.toFixed(4)} hint={t('survey.metric.planScaleHint')} tone="good" />
                <Metric label={t('survey.metric.georeg')} value={`${analysis.m3.rmseCm} cm`} hint={t('survey.metric.georegHint')} />
                <Metric label={t('survey.metric.volumes')} value={String(Object.values(analysis.m3.spaces).reduce((a, b) => a + b, 0))} hint={t('survey.metric.volumesHint')} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  )
}

export default SurveyAiPage

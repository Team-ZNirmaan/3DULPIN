import { AlertTriangle, ArrowRight, Box, Cpu, GitBranch, Layers, ScanSearch } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router'
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CodeText, StatusChip, TierBadge } from '@/components/domain'
import { Page, PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CLASS_COLOR, fmtArea } from '@/domain/display'
import { ringCentroid } from '@/domain/geo'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'
import { FacadeView, OrthoView, PlanView, SectionView, localRect } from './visuals'

function Metric({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'good' | 'bad' }) {
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2.5">
      <div className={cn('text-xl font-bold', tone === 'good' ? 'text-success' : tone === 'bad' ? 'text-blocking' : 'text-navy-900')}>{value}</div>
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

export function AnalysisPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const building = useData((s) => s.buildings.find((b) => b.id === 'BLD-7')!)
  const analysis = useData((s) => s.analysis.find((a) => a.buildingId === 'BLD-7')!)
  const units = useData((s) => s.units)
  const select = useData((s) => s.select)
  const flyTo = useData((s) => s.flyTo)
  const [roof, setRoof] = useState(true)
  const [wall, setWall] = useState(true)
  const [seg, setSeg] = useState(false)
  const [det, setDet] = useState(true)
  const [graph, setGraph] = useState(true)
  const [planLevel, setPlanLevel] = useState('03')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'm1'

  const levelUnits = useMemo(() => units.filter((u) => u.buildingId === 'BLD-7' && u.level === planLevel && u.type !== 'B'), [units, planLevel])
  const residuals = analysis.m2.evidence
    .filter((e) => e.level !== '00')
    .map((e) => ({ level: e.level, residual: e.planZ === null || e.facadeZ === null ? 0 : Math.round((e.facadeZ - e.planZ) * 100), missing: e.planZ === null }))
  const flat301 = units.find((u) => u.label === 'Flat 301')!
  const r301 = localRect(flat301)
  const gross301 = (r301.x1 - r301.x0) * (r301.y1 - r301.y0)

  const showIn3d = (code: string) => {
    const u = units.find((x) => x.code === code)!
    const [lon, lat] = ringCentroid(u.ring)
    select(code)
    flyTo({ lon, lat, height: (u.zMin + u.zMax) / 2 })
    navigate('/app/explorer')
  }

  return (
    <Page>
      <PageHeader
        eyebrow="L4 · L5 — AI perception & legal-space modelling"
        title={t('nav.analysis')}
        description={t('analysis.description')}
        actions={<Badge tone="saffron">{t('analysis.precomputed')}</Badge>}
      />

      <Card className="mb-5">
        <CardBody className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div>
            <div className="text-lg font-bold text-navy-900">{building.label}</div>
            <CodeText code={building.code} showValidity />
          </div>
          <div className="flex gap-2">
            <StatusChip status={building.status} />
            <TierBadge tier={building.tier} long />
          </div>
          <div className="ml-auto flex items-center gap-3 rounded-lg border border-blocking/30 bg-blocking-bg px-3 py-2 text-sm text-blocking">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              <strong>{t('analysis.deviation')}</strong> — {building.floorsDetected} {t('analysis.detected')}, {building.floorsSanctioned} {t('analysis.sanctioned')} (+ stilt)
            </span>
          </div>
        </CardBody>
      </Card>

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
          <TabsTrigger value="vol">
            <Box className="h-4 w-4" /> {t('analysis.tab.vol')}
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
                  <Steps steps={['True orthophoto', 'Instance segmentation', 'DSM height fusion', 'Parcel priors', 'Mesh slice @ +1.5 m', 'Regularise']} />
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('analysis.m1.explain')}</p>
                </CardBody>
              </Card>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Mask IoU" value={analysis.m1.iou.toFixed(2)} hint="vs hand-digitised" tone="good" />
                <Metric label="Boundary F-score" value={analysis.m1.boundaryF.toFixed(2)} tone="good" />
                <Metric label="Model confidence" value={analysis.m1.confidence.toFixed(2)} />
                <Metric label="Height RMSE" value={`${(analysis.m1.heightRmseM * 100).toFixed(0)} cm`} hint="vs check points" />
                <Metric label="Roof → wall offset" value={`${analysis.m1.roofVsWallOffsetM.toFixed(2)} m`} hint="chajja removed" />
                <Metric label="Model" value="Mask2Former" hint="SAM2-assisted labels" />
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
                <CardHeader title={t('analysis.m2.evidenceTitle')} subtitle="E1 plan · E2 facade · E3 DSM → fused (least squares)" />
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
                          <td className="px-2 py-1.5 text-right font-mono">{e.planZ === null ? <span className="font-sans text-xs font-semibold text-blocking">none</span> : e.planZ.toFixed(2)}</td>
                          <td className="px-2 py-1.5 text-right font-mono">{e.facadeZ === null ? '—' : e.facadeZ.toFixed(2)}</td>
                          <td className="px-4 py-1.5 text-right font-mono font-semibold">{e.fusedZ.toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="border-t border-line bg-surface">
                        <td className="px-4 py-1.5 text-xs text-slate-500">E3 DSM</td>
                        <td colSpan={3} className="px-4 py-1.5 text-right text-xs text-slate-600">
                          ground {analysis.m2.groundZ.toFixed(2)} m · roof {analysis.m2.roofZ.toFixed(2)} m
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card>
                <CardHeader title={t('analysis.m2.residualTitle')} subtitle={t('analysis.m2.residualSubtitle')} />
                <CardBody className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={residuals} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
                      <CartesianGrid vertical={false} stroke="#eef1f5" />
                      <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} unit=" cm" domain={[-8, 8]} />
                      <ReferenceLine y={0} stroke="#98A2B3" />
                      <Tooltip formatter={(v) => [`${v} cm`, 'facade − plan']} />
                      <Bar isAnimationActive={false} dataKey="residual" radius={[3, 3, 0, 0]}>
                        {residuals.map((r) => (
                          <Cell key={r.level} fill={r.missing ? '#F04438' : '#3E7BD1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardBody>
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
                  <Steps steps={['Rule-based layer parsing', 'Legal-space classes', 'Room–door graph', 'Georegistration', 'Extrusion']} />
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{t('analysis.m3.explain')}</p>
                </CardBody>
              </Card>
              <div className="grid grid-cols-2 gap-2">
                <Metric label="Units from graph" value={String(analysis.m3.unitsFromGraph)} hint={`RERA filing: ${analysis.m3.unitsInRera}`} tone="good" />
                <Metric label="Plan scale" value={analysis.m3.scale.toFixed(4)} hint="tolerance 0.995–1.005" tone="good" />
                <Metric label="Georeg. RMSE" value={`${analysis.m3.rmseCm} cm`} hint="Procrustes + ICP to wall footprint" />
                <Metric label="Rotation" value={`${analysis.m3.rotationDeg}°`} />
              </div>
              <Card>
                <CardHeader title={t('analysis.m3.classesTitle')} />
                <CardBody className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(analysis.m3.spaces).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between rounded-md bg-surface px-3 py-1.5">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CLASS_COLOR[k as keyof typeof CLASS_COLOR] }} />
                        {t(`analysis.m3.cls.${k}`)}
                      </span>
                      <span className="font-semibold">{v}</span>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vol" className="pt-5">
          <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
            <Card>
              <CardHeader title={t('analysis.vol.sectionTitle')} subtitle={t('analysis.vol.sectionSubtitle')} />
              <CardBody>
                <div className="aspect-[38/41] max-h-[640px] w-full">
                  <SectionView levels={building.levels} highlight="B2" />
                </div>
              </CardBody>
            </Card>
            <div className="space-y-4">
              <Card>
                <CardHeader title={t('analysis.vol.conventionTitle')} subtitle="Policy parameter — configurable per state" />
                <CardBody className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                    <span className="text-slate-600">Legal boundary (wall median) — Flat 301</span>
                    <span className="font-semibold">{fmtArea(gross301)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md border border-line px-3 py-2">
                    <span className="text-slate-600">Carpet area (internal faces, RERA)</span>
                    <span className="font-semibold">{fmtArea(flat301.carpetAreaSqm)}</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-500">{t('analysis.vol.conventionNote')}</p>
                  <Button size="sm" variant="primary" onClick={() => showIn3d(flat301.code)}>
                    <Cpu className="h-3.5 w-3.5" /> {t('analysis.vol.open3d')}
                  </Button>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title={t('analysis.vol.stackTitle')} />
                <CardBody className="text-sm text-slate-600">
                  <p>{t('analysis.vol.stackNote')}</p>
                  <div className="mt-3 rounded-md bg-navy-950 p-3 font-mono text-[0.75rem] leading-relaxed text-navy-100">
                    ST_Extrude(unit_polygon, 0, 0, z_top(k+1) − z_top(k))
                    <br />→ ST_MakeSolid → val3dity check
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Page>
  )
}

export default AnalysisPage

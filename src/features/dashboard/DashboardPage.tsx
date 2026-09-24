import { ArrowRight, Building2, ClipboardCheck, Cuboid, IndianRupee, Layers3, ShieldAlert, SquareStack } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useBi } from '@/components/domain'
import { Page, PageHeader } from '@/components/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { SEVERITY_COLOR, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER, TIER_COLOR, TIER_LABEL } from '@/domain/display'
import { toLocal } from '@/domain/geo'
import type { Tier } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'
import { useExplorer } from '@/store/explorer'

const DEMO_TAX_RATE = 250

function Kpi({ icon: Icon, label, value, sub, to, tone = 'navy' }: { icon: typeof Layers3; label: string; value: string; sub?: string; to?: string; tone?: 'navy' | 'red' | 'amber' | 'green' }) {
  const toneCls = { navy: 'bg-navy-50 text-navy-700', red: 'bg-blocking-bg text-blocking', amber: 'bg-warning-bg text-warning', green: 'bg-success-bg text-success' }[tone]
  const body = (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-md">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneCls)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold leading-tight text-navy-900">{value}</div>
        <div className="text-sm font-medium text-slate-600">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
      </div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

function WardMap() {
  const parcels = useData((s) => s.parcels)
  const buildings = useData((s) => s.buildings)
  const issues = useData((s) => s.issues)
  const navigate = useNavigate()
  const openPilot = issues.filter((i) => i.status === 'open').length
  const X = (x: number) => x + 110
  const Y = (y: number) => 90 - y
  const poly = (ring: [number, number][]) =>
    ring
      .map(toLocal)
      .map(([x, y]) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`)
      .join(' ')
  return (
    <svg viewBox="0 0 270 205" className="h-full w-full" role="img" aria-label="Pilot ward map">
      <rect x="0" y={Y(-31)} width="270" height="18" fill="#dfe3ea" />
      <rect x={X(-112)} y="0" width="12" height="205" fill="#dfe3ea" />
      <text x="190" y={Y(-42)} fontSize="6" fill="#98A2B3" fontWeight="600">
        MAIN ROAD
      </text>
      <line x1="0" x2="270" y1={Y(-20 + 0.1 * -110)} y2={Y(-20 + 0.1 * 160)} stroke="#D55E00" strokeWidth="3" strokeDasharray="4 3" opacity=".7" />
      {parcels.map((p) => (
        <polygon
          key={p.id}
          points={poly(p.ring)}
          fill={p.isPilot ? '#fdf3e6' : p.landUse === 'open' ? '#e3efe1' : '#f5f7fa'}
          stroke={p.isPilot ? '#E07B00' : '#c5ccd6'}
          strokeWidth={p.isPilot ? 1.5 : 0.6}
        />
      ))}
      {buildings.map((b) => (
        <polygon
          key={b.id}
          points={poly(b.footprint)}
          fill={b.isPilot ? '#3E7BD1' : TIER_COLOR[b.tier]}
          opacity={b.isPilot ? 0.9 : 0.55}
          className="cursor-pointer"
          onClick={() => {
            useData.getState().select(b.isPilot ? undefined : b.code)
            useExplorer.getState().setColorMode('tier')
            navigate('/app/explorer')
          }}
        />
      ))}
      <g transform={`translate(${X(0)} ${Y(4) - 16})`}>
        <circle r="7" fill="#F04438" stroke="white" strokeWidth="1.5" />
        <text textAnchor="middle" y="2.5" fontSize="7" fontWeight="700" fill="white">
          {openPilot}
        </text>
      </g>
      <text x={X(0)} y={Y(-22)} textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#C26A00">
        Plot 7 · Tower 1
      </text>
    </svg>
  )
}

export function DashboardPage() {
  const { t } = useTranslation()
  const bi = useBi()
  const units = useData((s) => s.units)
  const parcels = useData((s) => s.parcels)
  const buildings = useData((s) => s.buildings)
  const issues = useData((s) => s.issues)
  const audit = useData((s) => s.audit)
  const tasks = useData((s) => s.tasks)

  const legal = useMemo(() => units.filter((u) => u.type !== 'S'), [units])
  const tierData = (['A', 'B', 'C', 'D'] as Tier[]).map((tier) => ({ tier, value: legal.filter((u) => u.tier === tier).length }))
  const tierA = Math.round((tierData[0].value / legal.length) * 100)
  const statusData = STATUS_ORDER.map((s) => ({ status: bi(STATUS_LABEL[s]), key: s, value: legal.filter((u) => u.status === s).length }))
  const open = issues.filter((i) => i.status === 'open')
  const flagTypes = [
    { label: t('dashboard.flag.sanction'), value: open.filter((i) => i.layer === 'L3').length, color: SEVERITY_COLOR.blocking },
    { label: t('dashboard.flag.infra'), value: open.filter((i) => i.rule.includes('Infrastructure')).length, color: '#D55E00' },
    { label: t('dashboard.flag.topology'), value: open.filter((i) => (i.layer === 'L1' || i.layer === 'L2') && !i.rule.includes('Infrastructure')).length, color: SEVERITY_COLOR.warning },
    { label: t('dashboard.flag.anomaly'), value: open.filter((i) => i.layer === 'L4').length, color: '#7A5AF8' },
  ]
  const unassessed = units.filter((u) => u.level === '05' && u.type === 'U').reduce((s, u) => s + (u.carpetAreaSqm ?? 0), 0)
  const pendingTasks = tasks.filter((x) => x.status === 'pending')

  return (
    <Page>
      <PageHeader eyebrow={t('dashboard.eyebrow')} title={t('nav.dashboard')} description={t('dashboard.description')} />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={SquareStack} label={t('dashboard.kpi.parcels')} value={String(parcels.length)} sub={t('dashboard.kpi.parcelsSub')} to="/app/registry" />
        <Kpi icon={Cuboid} label={t('dashboard.kpi.ulpins')} value={String(legal.length)} sub={`${buildings.length} ${t('dashboard.kpi.buildings')}`} to="/app/registry" />
        <Kpi icon={Layers3} label={t('dashboard.kpi.tierA')} value={`${tierA}%`} sub={t('dashboard.kpi.tierASub')} tone="green" to="/app/explorer" />
        <Kpi icon={ShieldAlert} label={t('dashboard.kpi.flags')} value={String(open.length)} sub={`${open.filter((i) => i.severity === 'blocking').length} ${t('dashboard.kpi.blocking')}`} tone="red" to="/app/validation" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_1fr_1fr]">
        <Card>
          <CardHeader title={t('dashboard.map')} subtitle={t('dashboard.mapSubtitle')} actions={<Link to="/app/explorer" className="flex items-center gap-1 text-xs font-semibold text-navy-700 hover:underline">3D <ArrowRight className="h-3 w-3" /></Link>} />
          <CardBody className="aspect-[270/205] p-2">
            <WardMap />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('dashboard.tierMix')} subtitle={t('dashboard.tierMixSubtitle')} />
          <CardBody className="flex items-center gap-2">
            <div className="h-44 w-44 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie isAnimationActive={false} data={tierData} dataKey="value" nameKey="tier" innerRadius="58%" outerRadius="95%" paddingAngle={2} stroke="none">
                    {tierData.map((d) => (
                      <Cell key={d.tier} fill={TIER_COLOR[d.tier]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-sm">
              {tierData.map((d) => (
                <li key={d.tier} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TIER_COLOR[d.tier] }} />
                  <span className="text-slate-600">{bi(TIER_LABEL[d.tier])}</span>
                  <span className="ml-auto pl-2 font-semibold">{d.value}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('dashboard.statusMix')} subtitle={t('dashboard.statusMixSubtitle')} />
          <CardBody className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="status" width={82} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar isAnimationActive={false} dataKey="value" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 12, fontWeight: 600 }}>
                  {statusData.map((d) => (
                    <Cell key={d.key} fill={STATUS_COLOR[d.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <Card>
          <CardHeader title={t('dashboard.flags')} subtitle={t('dashboard.flagsSubtitle')} actions={<Link to="/app/validation" className="text-xs font-semibold text-navy-700 hover:underline">{t('dashboard.review')}</Link>} />
          <CardBody className="space-y-2.5">
            {flagTypes.map((f) => (
              <div key={f.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-600">{f.label}</span>
                  <span className="font-semibold">{f.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, f.value * 34)}%`, backgroundColor: f.color }} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('dashboard.impact')} subtitle={t('dashboard.impactSubtitle')} />
          <CardBody className="space-y-3">
            <div className="flex items-start gap-3">
              <Building2 className="mt-0.5 h-5 w-5 text-saffron-600" />
              <div>
                <div className="text-xl font-bold text-navy-900">{unassessed.toFixed(0)} m²</div>
                <div className="text-sm text-slate-600">{t('dashboard.unassessed')}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <IndianRupee className="mt-0.5 h-5 w-5 text-success" />
              <div>
                <div className="text-xl font-bold text-navy-900">₹ {Math.round(unassessed * DEMO_TAX_RATE).toLocaleString('en-IN')}</div>
                <div className="text-sm text-slate-600">{t('dashboard.taxUplift', { rate: DEMO_TAX_RATE })}</div>
              </div>
            </div>
            <p className="rounded-md bg-surface px-3 py-2 text-xs text-slate-500">{t('dashboard.impactNote')}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('dashboard.activity')} actions={<Link to="/app/audit" className="text-xs font-semibold text-navy-700 hover:underline">{t('dashboard.auditLog')}</Link>} />
          <ul className="divide-y divide-line">
            {audit
              .slice(-5)
              .reverse()
              .map((e) => (
                <li key={e.id} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="rounded bg-navy-50 px-1.5 py-0.5 font-mono font-semibold text-navy-700">{e.action}</span>
                    <span className="ml-auto text-slate-500">{new Date(e.at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-700">{e.details}</div>
                </li>
              ))}
          </ul>
          <div className="border-t border-line px-4 py-2.5 text-sm">
            <Link to="/app/verification" className="flex items-center gap-2 font-medium text-slate-700 hover:text-navy-700">
              <ClipboardCheck className="h-4 w-4 text-navy-600" /> {pendingTasks.length} {t('dashboard.pendingTasks')}
              <ArrowRight className="ml-auto h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </Page>
  )
}

export default DashboardPage

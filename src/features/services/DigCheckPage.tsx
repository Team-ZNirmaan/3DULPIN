import { CircleAlert, CircleCheck, Cuboid, Loader2, MousePointerSquareDashed, Shovel } from 'lucide-react'
import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { digCheck } from '@/api'
import { Page, PageHeader } from '@/components/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { QL_LABEL } from '@/domain/display'
import { rectRing, ringCentroid, toLocal } from '@/domain/geo'
import type { DigHit } from '@/domain/geo'
import { cn } from '@/lib/cn'
import { useShowIn3d } from '@/lib/useShowIn3d'
import { useData } from '@/store/data'

type Rect = { x0: number; y0: number; x1: number; y1: number }

const VIEW = { x0: -130, x1: 170, y0: -120, y1: 95 }
const NET_COLOR: Record<string, string> = { water: '#2E90FA', sewer: '#8B5E34', power: '#F79009', metro: '#D55E00', viaduct: '#56B4E9' }

const PRESETS: { key: string; rect: Rect; depth: number }[] = [
  { key: 'water', rect: { x0: 30, y0: -38, x1: 42, y1: -31 }, depth: 1.6 },
  { key: 'sewer', rect: { x0: -60, y0: -48, x1: -52, y1: -41 }, depth: 2.0 },
  { key: 'basement', rect: { x0: -16, y0: -23, x1: 16, y1: 14 }, depth: 8 },
]

export function DigCheckPage() {
  const { t } = useTranslation()
  const units = useData((s) => s.units)
  const parcels = useData((s) => s.parcels)
  const showIn3d = useShowIn3d()
  const svgRef = useRef<SVGSVGElement>(null)
  const [rect, setRect] = useState<Rect | null>(PRESETS[0].rect)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null)
  const [depth, setDepth] = useState(1.6)
  const [hits, setHits] = useState<DigHit[] | null>(null)
  const [busy, setBusy] = useState(false)

  const infra = useMemo(() => units.filter((u) => u.type === 'G'), [units])
  const W = VIEW.x1 - VIEW.x0
  const H = VIEW.y1 - VIEW.y0
  const X = (x: number) => x - VIEW.x0
  const Y = (y: number) => VIEW.y1 - y
  const poly = (ring: [number, number][]) => ring.map(toLocal).map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')

  const toWorld = (e: PointerEvent<SVGSVGElement>) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: VIEW.x0 + ((e.clientX - r.left) / r.width) * W, y: VIEW.y1 - ((e.clientY - r.top) / r.height) * H }
  }

  const run = async () => {
    if (!rect) return
    setBusy(true)
    setHits(await digCheck(rectRing(rect.x0, rect.y0, rect.x1, rect.y1), depth))
    setBusy(false)
  }

  const verdict = hits && (hits.some((h) => h.hitsAsset) ? 'stop' : hits.some((h) => h.hitsProtection) ? 'caution' : 'clear')

  return (
    <Page>
      <PageHeader eyebrow="POST /dig-check" title={t('nav.digcheck')} description={t('dig.description')} />
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader
            title={t('dig.mapTitle')}
            subtitle={t('dig.mapSubtitle')}
            actions={
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <MousePointerSquareDashed className="h-3.5 w-3.5" /> {t('dig.drag')}
              </span>
            }
          />
          <CardBody>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full touch-none select-none rounded-lg bg-[#eef0f3]"
              onPointerDown={(e) => {
                const p = toWorld(e)
                setDrag(p)
                setRect({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
                setHits(null)
                ;(e.target as Element).setPointerCapture?.(e.pointerId)
              }}
              onPointerMove={(e) => {
                if (!drag) return
                const p = toWorld(e)
                setRect({ x0: Math.min(drag.x, p.x), y0: Math.min(drag.y, p.y), x1: Math.max(drag.x, p.x), y1: Math.max(drag.y, p.y) })
              }}
              onPointerUp={() => setDrag(null)}
              role="application"
              aria-label={t('dig.mapTitle')}
            >
              <rect x={0} y={Y(-31)} width={W} height={18} fill="#c9d0da" />
              <rect x={X(-112)} y={0} width={12} height={H} fill="#c9d0da" />
              {parcels.map((p) => (
                <polygon key={p.id} points={poly(p.ring)} fill={p.isPilot ? '#fdf3e6' : '#f8f9fb'} stroke={p.isPilot ? '#E07B00' : '#c5ccd6'} strokeWidth={p.isPilot ? 0.8 : 0.4} />
              ))}
              {infra.map((u) => (
                <g key={u.code}>
                  <polygon points={poly(u.infra!.protectionRing)} fill={NET_COLOR[u.infra!.network]} opacity={0.12} />
                  <polygon points={poly(u.ring)} fill={NET_COLOR[u.infra!.network]} opacity={u.infra!.network === 'metro' ? 0.45 : 0.95} />
                </g>
              ))}
              {rect && (
                <rect x={X(rect.x0)} y={Y(rect.y1)} width={rect.x1 - rect.x0} height={rect.y1 - rect.y0} fill="#E07B00" fillOpacity={0.25} stroke="#E07B00" strokeWidth={0.8} strokeDasharray="2 1.5" />
              )}
              <text x={X(120)} y={Y(-41.5)} fontSize="4" fill="#667085" fontWeight="600">
                MAIN ROAD
              </text>
              <text x={X(-6)} y={Y(-27)} fontSize="3.6" fill="#C26A00" fontWeight="700">
                Plot 7
              </text>
            </svg>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
              {infra.map((u) => (
                <span key={u.code} className="flex items-center gap-1.5">
                  <span className="h-2 w-4 rounded-sm" style={{ backgroundColor: NET_COLOR[u.infra!.network] }} /> {u.label.split(' (')[0]}
                </span>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={t('dig.params')} />
            <CardBody className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setRect(p.rect)
                      setDepth(p.depth)
                      setHits(null)
                    }}
                    className="rounded-full border border-line px-3 py-1 text-sm text-slate-700 hover:bg-navy-50"
                  >
                    {t(`dig.preset.${p.key}`)}
                  </button>
                ))}
              </div>
              <label className="block">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{t('dig.depth')}</span>
                  <span className="font-mono font-semibold">{depth.toFixed(1)} m</span>
                </div>
                <input type="range" min={0.5} max={12} step={0.1} value={depth} onChange={(e) => { setDepth(parseFloat(e.target.value)); setHits(null) }} className="w-full accent-saffron-500" />
              </label>
              <div className="text-xs text-slate-500">
                {rect ? `${t('dig.area')}: ${((rect.x1 - rect.x0) * (rect.y1 - rect.y0)).toFixed(0)} m²` : t('dig.noArea')}
              </div>
              <Button variant="accent" className="w-full justify-center" onClick={() => void run()} disabled={!rect || busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shovel className="h-4 w-4" />} {t('dig.check')}
              </Button>
            </CardBody>
          </Card>

          {hits && (
            <Card>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-t-lg px-4 py-3',
                  verdict === 'stop' ? 'bg-blocking-bg text-blocking' : verdict === 'caution' ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success',
                )}
              >
                {verdict === 'clear' ? <CircleCheck className="h-5 w-5" /> : <CircleAlert className="h-5 w-5" />}
                <div className="font-semibold">{t(`dig.verdict.${verdict}`)}</div>
              </div>
              <CardBody className="space-y-2">
                {hits.length === 0 && <p className="text-sm text-slate-500">{t('dig.noneNear')}</p>}
                {hits.map((h) => (
                  <div key={h.unit.code} className="rounded-md border border-line px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: NET_COLOR[h.unit.infra!.network] }} />
                      <span className="text-sm font-semibold text-slate-900">{h.unit.label}</span>
                      <button type="button" onClick={() => { const [lon, lat] = ringCentroid(h.unit.ring); showIn3d(h.unit.code, { lon, lat, height: h.unit.zMax }) }} className="ml-auto text-slate-500 hover:text-navy-700" aria-label="Show in 3D">
                        <Cuboid className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {h.hitsAsset && <Badge tone="blocking">{t('dig.hitsAsset')}</Badge>}
                      {!h.hitsAsset && h.hitsProtection && <Badge tone="warning">{t('dig.hitsZone')}</Badge>}
                      {!h.hitsAsset && !h.hitsProtection && <Badge tone="success">{t('dig.clearOf')}</Badge>}
                      <Badge tone="neutral">{QL_LABEL[h.unit.infra!.qualityLevel]}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {h.unit.infra!.agency} · {t('dig.crown')} {Math.abs(h.unit.zMax).toFixed(2)} m · {t('dig.clearance')} {h.clearanceM > 0 ? `${h.clearanceM.toFixed(2)} m` : '—'}
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-xs text-slate-500">{t('dig.cbud')}</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </Page>
  )
}

export default DigCheckPage

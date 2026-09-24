import { Braces, Building, Download, FileJson, Loader2, Map, Play, Scale } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { collateral, digCheck, resolvePoint } from '@/api'
import { Page, PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ringCentroid } from '@/domain/geo'
import { validateCode } from '@/domain/ulpin'
import { useData } from '@/store/data'
import { buildCityJson, buildGeoJson, buildLadm, download } from './exporters'

interface Endpoint {
  method: 'GET' | 'POST'
  path: string
  desc: string
  run: () => Promise<unknown>
}

function trim(v: unknown): unknown {
  return JSON.parse(
    JSON.stringify(v, (k, val) => {
      if (k === 'ring' || k === 'protectionRing' || k === 'path') return `[${(val as unknown[]).length} coords]`
      return val
    }),
  )
}

export function ExportsPage() {
  const { t } = useTranslation()
  const [out, setOut] = useState<{ path: string; body: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const flat = () => useData.getState().units.find((u) => u.label === 'Flat 402')!
  const endpoints: Endpoint[] = [
    { method: 'GET', path: '/resolve?x&y&z', desc: t('exports.ep.resolve'), run: async () => { const f = flat(); return resolvePoint(ringCentroid(f.ring), f.zMin + 1.5) } },
    { method: 'POST', path: '/dig-check', desc: t('exports.ep.dig'), run: async () => { const w = useData.getState().units.find((u) => u.id === 'U-G-WATER')!; return digCheck(w.infra!.protectionRing, 2) } },
    { method: 'GET', path: '/collateral/{code}', desc: t('exports.ep.collateral'), run: () => collateral(useData.getState().units.find((u) => u.label === 'Flat 204')!.code) },
    { method: 'POST', path: '/codes/validate', desc: t('exports.ep.validate'), run: async () => validateCode(flat().code) },
  ]

  const tryIt = async (e: Endpoint) => {
    setBusy(e.path)
    const res = await e.run()
    setOut({ path: `${e.method} ${e.path}`, body: JSON.stringify(trim(res), null, 2) })
    setBusy(null)
  }

  const exportsList = [
    { key: 'cityjson', icon: Building, name: 'CityJSON 2.0', file: 'bhu-aayam-tower1.city.json', build: buildCityJson },
    { key: 'ladm', icon: Scale, name: 'LADM (ISO 19152) JSON', file: 'bhu-aayam-ladm.json', build: buildLadm },
    { key: 'geojson', icon: Map, name: 'GeoJSON (2D footprints + Z range)', file: 'bhu-aayam-units.geojson', build: buildGeoJson },
    { key: 'fixtures', icon: FileJson, name: t('exports.fixtures'), file: 'bhu-aayam-demo-data.json', build: () => { const s = useData.getState(); return { parcels: s.parcels, units: s.units, rights: s.rights, deeds: s.deeds, issues: s.issues } } },
  ]

  return (
    <Page>
      <PageHeader eyebrow={t('exports.eyebrow')} title={t('nav.exports')} description={t('exports.description')} />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader title={t('exports.downloads')} subtitle={t('exports.downloadsSubtitle')} />
          <CardBody className="space-y-2">
            {exportsList.map((x) => (
              <div key={x.key} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
                <x.icon className="h-5 w-5 shrink-0 text-navy-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900">{x.name}</div>
                  <div className="font-mono text-[0.7rem] text-slate-500">{x.file}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    download(x.file, x.build())
                    toast({ tone: 'success', title: t('exports.downloaded'), body: x.file })
                  }}
                >
                  <Download className="h-3.5 w-3.5" /> {t('exports.download')}
                </Button>
              </div>
            ))}
            <p className="pt-2 text-xs leading-relaxed text-slate-500">{t('exports.note')}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t('exports.api')} subtitle={t('exports.apiSubtitle')} />
          <CardBody className="space-y-2">
            {endpoints.map((e) => (
              <div key={e.path} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2">
                <span className={`w-12 rounded px-1.5 py-0.5 text-center font-mono text-[0.7rem] font-bold ${e.method === 'GET' ? 'bg-info-bg text-info' : 'bg-success-bg text-success'}`}>{e.method}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm font-semibold text-slate-900">{e.path}</div>
                  <div className="text-xs text-slate-500">{e.desc}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => void tryIt(e)} disabled={busy !== null}>
                  {busy === e.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} {t('exports.try')}
                </Button>
              </div>
            ))}
            <div className="mt-3 rounded-lg bg-navy-950 p-3">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[0.7rem] text-navy-100/60">
                <Braces className="h-3.5 w-3.5" /> {out?.path ?? t('exports.response')}
              </div>
              <pre className="max-h-80 overflow-auto font-mono text-[0.72rem] leading-relaxed text-green-200">{out?.body ?? '// ' + t('exports.pick')}</pre>
            </div>
          </CardBody>
        </Card>
      </div>
    </Page>
  )
}

export default ExportsPage

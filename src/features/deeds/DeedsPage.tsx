import { AlertOctagon, ArrowRight, Check, Cuboid, Database, FileScan, Loader2, ScanText, Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { extractDeed, matchDeed, type MatchCandidate } from '@/api'
import { CodeText } from '@/components/domain'
import { Page, PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/toast'
import { UnitIsoView } from '@/components/UnitIsoView'
import { Badge, type Tone } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import type { Deed } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useShowIn3d } from '@/lib/useShowIn3d'
import { useData } from '@/store/data'

const STATUS_TONE: Record<Deed['status'], Tone> = {
  pending: 'neutral',
  extracted: 'info',
  linked: 'success',
  rejected: 'neutral',
  flagged: 'blocking',
}

function highlight(line: string, values: string[]) {
  const hits = values.filter((v) => v.length > 2 && line.toLowerCase().includes(v.toLowerCase().replace(' sq m', '').replace('₹ ', '')))
  if (!hits.length) return line
  const key = hits[0].replace(' sq m', '').replace('₹ ', '')
  const i = line.toLowerCase().indexOf(key.toLowerCase())
  return (
    <>
      {line.slice(0, i)}
      <mark className="rounded bg-yellow-200/80 px-0.5">{line.slice(i, i + key.length)}</mark>
      {line.slice(i + key.length)}
    </>
  )
}

function ScanView({ deed, extracted }: { deed: Deed; extracted: boolean }) {
  const values = extracted ? deed.fields.map((f) => f.value.replace('Tower 1, Demo Heights', 'Tower 1')) : []
  return (
    <div className="relative overflow-hidden rounded-md bg-[#f7f2e6] p-6 shadow-inner" style={{ transform: 'rotate(-0.4deg)' }}>
      <div className="pointer-events-none absolute right-5 top-5 flex h-20 w-20 rotate-[-12deg] items-center justify-center rounded-full border-2 border-[#8b2d2d]/50 text-center text-[0.55rem] font-bold uppercase leading-tight text-[#8b2d2d]/60">
        Sub-Registrar
        <br />
        Demo City
        <br />
        (demo)
      </div>
      <div className="space-y-1.5 font-serif text-[0.92rem] leading-relaxed text-[#2c2a26]" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        {deed.scanLines.map((l, i) => (
          <p key={i} className={cn(i === 0 && 'mb-3 text-center text-lg font-bold tracking-[0.3em]')}>
            {highlight(l, values)}
          </p>
        ))}
      </div>
      <div className="mt-4 font-mono text-[0.65rem] text-[#2c2a26]/50">
        {deed.number} · {deed.registeredOn} · scan 300 dpi
      </div>
    </div>
  )
}

function NgdrsView({ deed }: { deed: Deed }) {
  return (
    <div className="rounded-md bg-navy-950 p-4 font-mono text-[0.78rem] leading-relaxed text-navy-100">
      <div className="text-navy-100/50">{'// NGDRS structured record — no OCR needed'}</div>
      <div>{'{'}</div>
      <div className="pl-4">
        "document_no": <span className="text-saffron-400">"{deed.number}"</span>,
      </div>
      <div className="pl-4">
        "type": <span className="text-saffron-400">"{deed.kind}"</span>, "registered_on": <span className="text-saffron-400">"{deed.registeredOn}"</span>,
      </div>
      {deed.fields.map((f) => (
        <div key={f.key} className="pl-4">
          "{f.key}": <span className="text-green-300">"{f.value}"</span>,
        </div>
      ))}
      <div>{'}'}</div>
    </div>
  )
}

export function DeedsPage() {
  const { t } = useTranslation()
  const deeds = useData((s) => s.deeds)
  const units = useData((s) => s.units)
  const buildings = useData((s) => s.buildings)
  const rights = useData((s) => s.rights)
  const parties = useData((s) => s.parties)
  const linkDeed = useData((s) => s.linkDeed)
  const rejectDeed = useData((s) => s.rejectDeed)
  const showIn3d = useShowIn3d()
  const [activeId, setActiveId] = useState('DEED-2026-0533')
  const [extracting, setExtracting] = useState(false)
  const [matching, setMatching] = useState(false)
  const [candidates, setCandidates] = useState<MatchCandidate[] | null>(null)
  const deed = deeds.find((d) => d.id === activeId)!
  const extracted = deed.format === 'ngdrs' || deed.status !== 'pending'
  const pilot = buildings.find((b) => b.id === 'BLD-7')!

  useEffect(() => {
    setCandidates(null)
  }, [activeId])

  const runExtract = async () => {
    setExtracting(true)
    await extractDeed(deed.id)
    setExtracting(false)
  }
  const runMatch = async () => {
    setMatching(true)
    setCandidates(await matchDeed(deed.id))
    setMatching(false)
  }
  const confirm = async (code: string) => {
    const r = await linkDeed(deed.id, code)
    if (r.doubleSale) toast({ tone: 'warning', title: t('deeds.doubleSaleToast'), body: t('deeds.doubleSaleToastBody') })
    else toast({ tone: 'success', title: t('deeds.linkedToast'), body: code })
  }

  const linkedUnit = units.find((u) => u.code === deed.linkedUnitCode)
  const existingOwner = (() => {
    if (!linkedUnit) return undefined
    const r = rights.find((x) => x.unitCode === linkedUnit.code && x.type === 'ownership')
    const prior = deeds.find((d) => d.id === r?.sourceDeedId)
    return { name: parties.find((p) => p.id === r?.partyId)?.name, deed: prior }
  })()

  return (
    <Page>
      <PageHeader eyebrow="L8 — M6 Deed-to-unit rights linking" title={t('nav.deeds')} description={t('deeds.description')} />
      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <Card className="self-start overflow-hidden">
          <CardHeader title={t('deeds.inbox')} subtitle={t('deeds.inboxSubtitle')} />
          <ul className="divide-y divide-line">
            {deeds.map((d) => (
              <li key={d.id}>
                <button type="button" onClick={() => setActiveId(d.id)} className={cn('w-full px-4 py-3 text-left', d.id === activeId ? 'bg-navy-50' : 'hover:bg-slate-50')}>
                  <div className="flex items-center gap-2">
                    {d.format === 'ngdrs' ? <Database className="h-4 w-4 text-navy-600" /> : <FileScan className="h-4 w-4 text-slate-500" />}
                    <span className="font-mono text-xs font-semibold text-slate-700">{d.number}</span>
                    <Badge tone={STATUS_TONE[d.status]} className="ml-auto">
                      {t(`deeds.status.${d.status}`)}
                    </Badge>
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {t(`deeds.kind.${d.kind}`)} · Flat {d.fields.find((f) => f.key === 'flat')?.value} · {d.registeredOn}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          {deed.status === 'flagged' && linkedUnit && existingOwner && (
            <div className="rounded-xl border-2 border-blocking bg-blocking-bg p-5">
              <div className="flex items-start gap-3">
                <AlertOctagon className="mt-0.5 h-6 w-6 shrink-0 text-blocking" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-blocking">
                    {t('deeds.doubleSale')}: {linkedUnit.label}
                  </h2>
                  <p className="mt-1 text-sm text-blocking/90">{t('deeds.doubleSaleBody')}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-white p-3 text-sm">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{t('deeds.onRecord')}</div>
                      <div className="font-mono text-xs">{existingOwner.deed?.number}</div>
                      <div className="font-semibold">{existingOwner.name}</div>
                      <div className="text-xs text-slate-500">{existingOwner.deed?.registeredOn}</div>
                    </div>
                    <div className="rounded-lg bg-white p-3 text-sm ring-2 ring-blocking/40">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-blocking">{t('deeds.newClaim')}</div>
                      <div className="font-mono text-xs">{deed.number}</div>
                      <div className="font-semibold">
                        {deed.fields.find((f) => f.key === 'seller')?.value} → {deed.fields.find((f) => f.key === 'buyer')?.value}
                      </div>
                      <div className="text-xs text-slate-500">{deed.registeredOn}</div>
                    </div>
                  </div>
                  <Link to="/app/validation?issue=ISS-006" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blocking hover:underline">
                    {t('deeds.openIssue')} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card>
              <CardHeader
                title={`1 · ${t('deeds.step.document')}`}
                subtitle={deed.format === 'ngdrs' ? t('deeds.ngdrs') : t('deeds.scan')}
                actions={<Badge tone={deed.format === 'ngdrs' ? 'navy' : 'neutral'}>{deed.format === 'ngdrs' ? 'NGDRS' : 'Legacy scan'}</Badge>}
              />
              <CardBody>{deed.format === 'ngdrs' ? <NgdrsView deed={deed} /> : <ScanView deed={deed} extracted={extracted} />}</CardBody>
            </Card>

            <Card>
              <CardHeader
                title={`2 · ${t('deeds.step.extract')}`}
                subtitle={deed.format === 'ngdrs' ? t('deeds.structured') : 'OCR (Indic) → rules → local LLM (JSON schema)'}
                actions={
                  !extracted && (
                    <Button size="sm" onClick={() => void runExtract()} disabled={extracting}>
                      {extracting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanText className="h-3.5 w-3.5" />} {t('deeds.runOcr')}
                    </Button>
                  )
                }
              />
              <CardBody>
                {extracted ? (
                  <table className="w-full text-sm">
                    <tbody>
                      {deed.fields.map((f) => (
                        <tr key={f.key} className="border-b border-line last:border-0">
                          <td className="py-1.5 pr-2 text-slate-500">{t(`deeds.field.${f.key}`)}</td>
                          <td className="py-1.5 pr-2 font-semibold text-slate-900">{f.value}</td>
                          <td className="w-24 py-1.5">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div className={cn('h-full rounded-full', f.confidence >= 0.95 ? 'bg-success' : f.confidence >= 0.9 ? 'bg-navy-500' : 'bg-warning')} style={{ width: `${f.confidence * 100}%` }} />
                              </div>
                              <span className="w-8 text-right font-mono text-[0.7rem] text-slate-500">{f.confidence.toFixed(2)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">{extracting ? t('deeds.extracting') : t('deeds.notExtracted')}</p>
                )}
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader
              title={`3 · ${t('deeds.step.match')}`}
              subtitle={t('deeds.matchSubtitle')}
              actions={
                extracted &&
                deed.status !== 'linked' &&
                deed.status !== 'flagged' && (
                  <Button size="sm" variant="accent" onClick={() => void runMatch()} disabled={matching}>
                    {matching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} {t('deeds.findMatch')}
                  </Button>
                )
              }
            />
            <CardBody>
              {deed.status === 'linked' && linkedUnit ? (
                <div className="flex flex-wrap items-center gap-4">
                  <UnitIsoView unit={linkedUnit} building={pilot} className="h-40 w-56" />
                  <div>
                    <div className="flex items-center gap-2 text-success">
                      <Check className="h-4 w-4" /> <span className="font-semibold">{t('deeds.linkedTo')}</span>
                    </div>
                    <div className="text-lg font-bold text-navy-900">{linkedUnit.label}</div>
                    <CodeText code={linkedUnit.code} showValidity />
                    <div className="mt-2">
                      <Button size="sm" variant="outline" onClick={() => showIn3d(linkedUnit.code)}>
                        <Cuboid className="h-3.5 w-3.5" /> {t('validation.show3d')}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : candidates ? (
                <div className="grid gap-3 lg:grid-cols-3">
                  {candidates.map((c, i) => (
                    <div key={c.unit.code} className={cn('rounded-lg border p-3', i === 0 ? 'border-navy-600 ring-1 ring-navy-600' : 'border-line')}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-navy-900">{c.unit.label}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', c.score >= 0.9 ? 'bg-success-bg text-success' : 'bg-slate-100 text-slate-600')}>{Math.round(c.score * 100)}%</span>
                      </div>
                      <CodeText code={c.unit.code} className="text-[0.7rem]" />
                      <UnitIsoView unit={c.unit} building={pilot} className="my-2 h-28 w-full" />
                      <ul className="space-y-0.5 text-xs">
                        {c.reasons.map((r) => (
                          <li key={r.label} className={cn('flex items-center gap-1.5', r.ok ? 'text-success' : 'text-slate-500')}>
                            {r.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />} {r.label}
                          </li>
                        ))}
                      </ul>
                      {i === 0 && (
                        <div className="mt-3 flex gap-2">
                          <Button size="sm" variant="success" onClick={() => void confirm(c.unit.code)}>
                            <Check className="h-3.5 w-3.5" /> {t('deeds.confirm')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => void rejectDeed(deed.id)}>
                            {t('deeds.reject')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-sm text-slate-500">{deed.status === 'flagged' ? t('deeds.heldNote') : extracted ? t('deeds.readyToMatch') : t('deeds.extractFirst')}</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </Page>
  )
}

export default DeedsPage

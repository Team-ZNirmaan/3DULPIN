import { CircleAlert, CircleCheck, Landmark, Loader2, OctagonX, Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { collateral, type CollateralReport } from '@/api'
import { CodeText, StatusChip, TierBadge, useBi } from '@/components/domain'
import { Page, PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { RIGHT_LABEL } from '@/domain/display'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'

export function CollateralPage() {
  const { t } = useTranslation()
  const bi = useBi()
  const units = useData((s) => s.units)
  const parties = useData((s) => s.parties)
  const logEvent = useData((s) => s.logEvent)
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<CollateralReport | null | undefined>(undefined)

  const quick = ['Flat 101', 'Flat 204', 'Flat 402', 'Flat 503', 'Parking bay B2-01'].map((l) => units.find((u) => u.label === l)!).filter(Boolean)

  const check = async (code: string) => {
    setQ(code)
    setBusy(true)
    setReport(await collateral(code))
    setBusy(false)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const hit = units.find((u) => u.label.toLowerCase() === q.trim().toLowerCase())
    void check(hit?.code ?? q)
  }

  const verdictUi = report && {
    clear: { cls: 'bg-success-bg text-success border-success/30', Icon: CircleCheck },
    caution: { cls: 'bg-warning-bg text-warning border-warning/30', Icon: CircleAlert },
    hold: { cls: 'bg-blocking-bg text-blocking border-blocking/30', Icon: OctagonX },
  }[report.verdict]

  return (
    <Page>
      <PageHeader eyebrow="GET /collateral/{3d-ulpin}" title={t('nav.collateral')} description={t('collateral.description')} />
      <Card className="mb-5">
        <CardBody>
          <form onSubmit={submit} className="flex flex-wrap gap-2">
            <div className="relative min-w-[16rem] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('citizen.searchPlaceholder')} className="h-11 w-full rounded-md border border-line pl-9 pr-3 font-mono text-sm" aria-label={t('citizen.searchPlaceholder')} />
            </div>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} {t('collateral.check')}
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">{t('citizen.examples')}:</span>
            {quick.map((u) => (
              <button key={u.code} type="button" onClick={() => void check(u.code)} className="rounded-full border border-line px-3 py-1 text-slate-700 hover:bg-navy-50">
                {u.label.replace('Parking bay', 'Bay')}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {report === null && <Card className="py-10 text-center text-sm text-slate-500">{t('citizen.notFound')}</Card>}
      {report && verdictUi && (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
          <Card>
            <div className={cn('flex items-center gap-3 rounded-t-lg border-b px-5 py-4', verdictUi.cls)}>
              <verdictUi.Icon className="h-8 w-8 shrink-0" />
              <div>
                <div className="text-lg font-bold">{t(`collateral.verdict.${report.verdict}`)}</div>
                <div className="text-sm opacity-90">{t(`collateral.verdictBody.${report.verdict}`)}</div>
              </div>
            </div>
            <CardBody className="space-y-2">
              <div className="text-xl font-bold text-navy-900">{report.unit.label}</div>
              <CodeText code={report.unit.code} showValidity />
              <div className="flex flex-wrap gap-1.5">
                <StatusChip status={report.unit.status} />
                <TierBadge tier={report.unit.tier} long />
              </div>
              <Button
                className="mt-3"
                variant="primary"
                disabled={report.verdict === 'hold'}
                onClick={() => {
                  void logEvent('CERSAI_CHARGE_REQUEST', report.unit.code, 'Bank requested charge registration (demo)')
                  toast({ tone: 'success', title: t('collateral.chargeToast'), body: report.unit.label })
                }}
              >
                <Landmark className="h-4 w-4" /> {t('collateral.charge')}
              </Button>
            </CardBody>
          </Card>
          <div className="space-y-4">
            <Card>
              <CardHeader title={t('collateral.owners')} />
              <CardBody className="space-y-1 text-sm">
                {report.owners.length ? (
                  report.owners.map((o) => (
                    <div key={o.name} className="flex justify-between gap-2">
                      <span className="font-semibold">{o.name}</span>
                      <span className="text-slate-500">
                        {o.since}
                        {o.deed && ` · ${o.deed}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-slate-500">{t('card.commonOwnership')}</span>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={t('collateral.encumbrances')} />
              <CardBody className="space-y-2 text-sm">
                {report.mortgages.map((m) => (
                  <div key={m.lender} className="rounded-md bg-warning-bg px-3 py-2 text-warning">
                    <strong>{t('collateral.mortgage')}</strong> — {m.lender} · {m.since} {m.note && `· ${m.note}`}
                  </div>
                ))}
                {report.restrictions.map((r) => (
                  <div key={r.id} className="rounded-md bg-surface px-3 py-2">
                    <strong>{bi(RIGHT_LABEL[r.type])}</strong> — {parties.find((p) => p.id === r.partyId)?.name}
                    <div className="text-xs text-slate-500">{r.legalBasis}</div>
                  </div>
                ))}
                {report.openIssues.map((i) => (
                  <div key={i.id} className="rounded-md bg-blocking-bg px-3 py-2 text-blocking">
                    <strong>{i.id}</strong> — {i.title}
                  </div>
                ))}
                {!report.mortgages.length && !report.restrictions.length && !report.openIssues.length && <span className="text-slate-500">{t('card.none')}</span>}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </Page>
  )
}

export default CollateralPage

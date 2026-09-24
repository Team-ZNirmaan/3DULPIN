import { CircleCheck, CircleX, FileWarning, Printer, QrCode, Search, ShieldQuestion } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router'
import { verifyCard } from '@/api'
import { Page, PageHeader } from '@/components/PageHeader'
import { toast } from '@/components/toast'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { validateCode } from '@/domain/ulpin'
import { useData } from '@/store/data'
import { PropertyCard, usePayload } from './PropertyCard'
import type { SpatialUnit } from '@/domain/types'

function VerifyDialog({ unit, open, onOpenChange }: { unit: SpatialUnit; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation()
  const payload = usePayload(unit)
  const [text, setText] = useState('')
  const [result, setResult] = useState<null | boolean>(null)
  useEffect(() => {
    if (open) {
      setText(payload)
      setResult(null)
    }
  }, [open, payload])
  const check = async () => setResult((await verifyCard(text)).ok)
  const tamper = () => {
    const parts = text.split('|')
    if (parts.length === 5) parts[2] = parts[2] === 'registered' ? 'approved' : 'registered'
    setText(parts.join('|'))
    setResult(null)
  }
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('citizen.verifyTitle')}
      description={t('citizen.verifyDesc')}
      footer={
        <>
          <Button variant="outline" onClick={tamper}>
            {t('citizen.tamper')}
          </Button>
          <Button onClick={() => void check()}>
            <ShieldQuestion className="h-4 w-4" /> {t('citizen.verify')}
          </Button>
        </>
      }
    >
      <textarea value={text} onChange={(e) => { setText(e.target.value); setResult(null) }} rows={3} className="w-full rounded-md border border-line p-2 font-mono text-xs" aria-label="QR payload" />
      {result !== null && (
        <div className={`mt-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${result ? 'bg-success-bg text-success' : 'bg-blocking-bg text-blocking'}`}>
          {result ? <CircleCheck className="h-4 w-4" /> : <CircleX className="h-4 w-4" />}
          {result ? t('citizen.authentic') : t('citizen.forged')}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-500">{t('citizen.signNote')}</p>
    </Dialog>
  )
}

function ObjectionDialog({ unit, open, onOpenChange }: { unit: SpatialUnit; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation()
  const logEvent = useData((s) => s.logEvent)
  const [kind, setKind] = useState('boundary')
  const [text, setText] = useState('')
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await logEvent('OBJECTION_RAISED', unit.code, `${kind}: ${text || '(no details)'}`)
    toast({ tone: 'success', title: t('citizen.objectionFiled'), body: `${unit.label} · ${t('citizen.objectionNext')}` })
    setText('')
    onOpenChange(false)
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={t('citizen.objectionTitle')} description={`${unit.label} · ${unit.code}`}>
      <form onSubmit={(e) => void submit(e)} className="space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-500">{t('citizen.objectionType')}</span>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 w-full rounded-md border border-line px-2">
            {['boundary', 'area', 'owner', 'parking', 'other'].map((k) => (
              <option key={k} value={k}>
                {t(`citizen.kind.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-slate-500">{t('citizen.objectionDetails')}</span>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} className="w-full rounded-md border border-line p-2 text-sm" />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('registry.close')}
          </Button>
          <Button type="submit" variant="accent">
            {t('citizen.submit')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

export function CitizenPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const units = useData((s) => s.units)
  const [q, setQ] = useState(params.get('code') ?? '')
  const [verifyOpen, setVerifyOpen] = useState(false)
  const [objOpen, setObjOpen] = useState(false)
  const code = params.get('code') ?? ''
  const unit = units.find((u) => u.code === validateCode(code).normalized)

  const quick = ['Flat 402', 'Flat 204', 'Flat 503', 'Parking bay B1-04', 'Parking bay B2-01']
    .map((l) => units.find((u) => u.label === l))
    .filter((u): u is SpatialUnit => !!u)

  const search = (e?: FormEvent) => {
    e?.preventDefault()
    const v = validateCode(q)
    const hit = units.find((u) => u.code === v.normalized || u.label.toLowerCase() === q.trim().toLowerCase())
    if (hit) setParams({ code: hit.code })
    else toast({ tone: 'warning', title: t('citizen.notFound'), body: v.formatOk && !v.checkOk ? v.errors[0] : undefined })
  }

  return (
    <Page>
      <div className="no-print">
        <PageHeader eyebrow={t('citizen.eyebrow')} title={t('nav.citizen')} description={t('citizen.description')} />
        <Card className="mb-5">
          <CardBody>
            <form onSubmit={search} className="flex flex-wrap gap-2">
              <div className="relative min-w-[16rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t('citizen.searchPlaceholder')}
                  className="h-11 w-full rounded-md border border-line pl-9 pr-3 font-mono text-sm"
                  aria-label={t('citizen.searchPlaceholder')}
                />
              </div>
              <Button type="submit" size="lg">
                {t('citizen.find')}
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">{t('citizen.examples')}:</span>
              {quick.map((u) => (
                <button key={u.code} type="button" onClick={() => { setQ(u.code); setParams({ code: u.code }) }} className="rounded-full border border-line px-3 py-1 text-slate-700 hover:border-navy-100 hover:bg-navy-50">
                  {u.label.replace('Parking bay', 'Bay')}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {unit ? (
        <>
          <div className="no-print mb-3 flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => setObjOpen(true)}>
              <FileWarning className="h-4 w-4" /> {t('citizen.objection')}
            </Button>
            <Button variant="outline" onClick={() => setVerifyOpen(true)}>
              <QrCode className="h-4 w-4" /> {t('citizen.verifyQr')}
            </Button>
            <Button variant="primary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> {t('citizen.print')}
            </Button>
          </div>
          <PropertyCard unit={unit} />
          <VerifyDialog unit={unit} open={verifyOpen} onOpenChange={setVerifyOpen} />
          <ObjectionDialog unit={unit} open={objOpen} onOpenChange={setObjOpen} />
        </>
      ) : (
        <Card className="no-print py-14 text-center text-sm text-slate-500">{t('citizen.empty')}</Card>
      )}
    </Page>
  )
}

export default CitizenPage

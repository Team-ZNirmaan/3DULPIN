import { AlertTriangle } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { signCard } from '@/api'
import { CodeText, StatusChip, TierBadge, useBi } from '@/components/domain'
import { LogoMark } from '@/components/Logo'
import { UnitIsoView } from '@/components/UnitIsoView'
import { RIGHT_LABEL, fmtArea, fmtMsl } from '@/domain/display'
import type { SpatialUnit } from '@/domain/types'
import { UNIT_TYPES, describeLevel } from '@/domain/ulpin'
import { useData } from '@/store/data'

export function maskName(name: string) {
  return name
    .split(' ')
    .map((w) => (w.length <= 1 ? w : `${w[0]}${'•'.repeat(Math.min(5, w.length - 1))}`))
    .join(' ')
}

export const ISSUED = new Date().toISOString().slice(0, 10)

export function usePayload(unit: SpatialUnit) {
  const [payload, setPayload] = useState('')
  useEffect(() => {
    let alive = true
    void signCard({ code: unit.code, label: unit.label, status: unit.status, issued: ISSUED }).then((p) => alive && setPayload(p))
    return () => {
      alive = false
    }
  }, [unit.code, unit.label, unit.status])
  return payload
}

export function verifyUrl(payload: string) {
  return `${window.location.origin}${window.location.pathname}#/verify?p=${encodeURIComponent(payload)}`
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500">{k}</div>
      <div className="text-sm font-semibold text-slate-900">{v}</div>
    </div>
  )
}

export function PropertyCard({ unit, publicView = false }: { unit: SpatialUnit; publicView?: boolean }) {
  const { t } = useTranslation()
  const bi = useBi()
  const building = useData((s) => s.buildings.find((b) => b.id === unit.buildingId))
  const parcel = useData((s) => s.parcels.find((p) => p.id === unit.parcelId))
  const rights = useData((s) => s.rights)
  const parties = useData((s) => s.parties)
  const units = useData((s) => s.units)
  const issues = useData((s) => s.issues)
  const payload = usePayload(unit)

  const name = (id: string) => {
    const n = parties.find((p) => p.id === id)?.name ?? id
    return publicView ? maskName(n) : n
  }
  const own = rights.filter((r) => r.unitCode === unit.code)
  const owners = own.filter((r) => r.type === 'ownership')
  const share = own.find((r) => r.type === 'undivided-share')
  const encumbrances = own.filter((r) => r.type === 'mortgage' || r.type === 'right-of-user' || r.type === 'easement')
  const parking = rights.filter((r) => r.type === 'parking-allotment' && r.note === `Allotted with ${unit.label}`)
  const allottedTo = own.find((r) => r.type === 'parking-allotment')
  const flags = issues.filter((i) => i.status !== 'fix-approved' && i.status !== 'rejected' && (i.objectCodes.includes(unit.code) || (unit.level === '05' && i.id === 'ISS-004')))

  return (
    <article className="print-area mx-auto w-full max-w-[60rem] overflow-hidden rounded-xl border border-line bg-white shadow-lg print:shadow-none">
      <header className="flex flex-wrap items-center gap-3 bg-navy-900 px-5 py-3 text-white">
        <LogoMark />
        <div className="min-w-0 flex-1">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-saffron-400">Bhu-Aayam</div>
          <div className="text-lg font-bold leading-tight">
            {t('card.title')} <span className="font-medium text-navy-100/80">· 3D संपत्ति कार्ड</span>
          </div>
        </div>
        <span className="rounded border border-saffron-400/70 px-2 py-0.5 text-[0.68rem] font-bold tracking-wider text-saffron-400">{t('card.demo')}</span>
      </header>

      {flags.length > 0 && (
        <div className="flex items-start gap-2 border-b border-warning/30 bg-warning-bg px-5 py-2.5 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{flags.map((f) => bi(f.title)).join(' · ')}</div>
        </div>
      )}

      <div className="grid gap-0 md:grid-cols-[1fr_1.15fr]">
        <div className="flex flex-col border-b border-line bg-gradient-to-b from-surface to-white p-4 md:border-b-0 md:border-r">
          {building ? <UnitIsoView unit={unit} building={building} className="aspect-[78/54] w-full" /> : <div className="aspect-[78/54] w-full rounded bg-surface" />}
          <p className="mt-2 text-center text-[0.72rem] text-slate-500">{t('card.isoCaption')}</p>
        </div>
        <div className="space-y-4 p-5">
          <div>
            <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">3D-ULPIN</div>
            <CodeText code={unit.code} className="text-base" showValidity />
            <h2 className="mt-1 text-2xl font-bold text-navy-900">{unit.label}</h2>
            <div className="text-sm text-slate-600">
              {building?.label} · {parcel?.label}, Demo Ward 7 · {bi(UNIT_TYPES[unit.type])}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Field k={t('card.level')} v={unit.level ? `${unit.level} · ${describeLevel(unit.level)}` : '—'} />
            <Field k={t('card.carpet')} v={fmtArea(unit.carpetAreaSqm)} />
            <Field k={t('card.share')} v={share?.sharePct !== undefined ? `${share.sharePct}%` : unit.undividedSharePct ? `${unit.undividedSharePct}%` : '—'} />
            <Field k={t('card.height')} v={`${fmtMsl(unit.zMin).replace(' m MSL', '')} – ${fmtMsl(unit.zMax)}`} />
            <Field k="DIGIPIN" v={<span className="font-mono">{unit.digipin ?? '—'}</span>} />
            <Field k={t('card.parent')} v={<span className="font-mono text-[0.8rem]">{parcel?.ulpin}</span>} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusChip status={unit.status} />
            <TierBadge tier={unit.tier} long />
            <span className="rounded-full bg-surface px-2 py-0.5 text-[0.72rem] font-medium text-slate-500 ring-1 ring-line">
              v{unit.version} · {t('card.issued')} {ISSUED}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-0 border-t border-line md:grid-cols-[1fr_auto]">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{t('card.holders')}</div>
            {owners.length ? (
              owners.map((o) => (
                <div key={o.id} className="text-sm">
                  <span className="font-semibold text-slate-900">{name(o.partyId)}</span>
                  <span className="text-slate-500"> · {t('card.since')} {o.since}</span>
                </div>
              ))
            ) : allottedTo ? (
              <div className="text-sm">
                <span className="font-semibold text-slate-900">{name(allottedTo.partyId)}</span>
                <span className="text-slate-500"> · {allottedTo.note}</span>
              </div>
            ) : (
              <div className="text-sm text-slate-500">{t('card.commonOwnership')}</div>
            )}
            {parking.length > 0 && (
              <div className="mt-2">
                <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{t('card.parking')}</div>
                {parking.map((p) => {
                  const bay = units.find((u) => u.code === p.unitCode)
                  return (
                    <div key={p.id} className="text-sm text-slate-800">
                      {bay?.label.replace('Parking bay ', '').replace('Stilt parking bay ', 'Stilt ')} <span className="font-mono text-[0.72rem] text-slate-500">{p.unitCode.slice(15)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{t('card.encumbrances')}</div>
            {encumbrances.length ? (
              encumbrances.map((e) => (
                <div key={e.id} className="mb-1 text-sm">
                  <span className="font-semibold text-slate-900">{bi(RIGHT_LABEL[e.type])}</span>
                  <span className="text-slate-600"> — {name(e.partyId)}</span>
                  <div className="text-[0.72rem] text-slate-500">{e.legalBasis}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500">{t('card.none')}</div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-1.5 border-t border-line px-6 py-4 md:border-l md:border-t-0">
          {payload ? <QRCodeSVG value={verifyUrl(payload)} size={132} level="M" marginSize={0} /> : <div className="h-[132px] w-[132px] rounded bg-surface" />}
          <div className="max-w-[9.5rem] text-center text-[0.68rem] leading-tight text-slate-500">{t('card.scan')}</div>
        </div>
      </div>
      <footer className="border-t border-line bg-surface px-5 py-2 text-center text-[0.68rem] text-slate-500">{t('card.footer')}</footer>
    </article>
  )
}

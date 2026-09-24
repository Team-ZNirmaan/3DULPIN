import { CircleCheck, CircleX, Loader2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { verifyCard } from '@/api'
import { CodeText, StatusChip, TierBadge, useBi } from '@/components/domain'
import { Logo } from '@/components/Logo'
import { STATUS_LABEL } from '@/domain/display'
import type { Status } from '@/domain/types'
import { useData } from '@/store/data'
import { maskName } from './PropertyCard'

export function VerifyPage() {
  const { t } = useTranslation()
  const bi = useBi()
  const [params] = useSearchParams()
  const payload = params.get('p') ?? ''
  const [res, setRes] = useState<Awaited<ReturnType<typeof verifyCard>> | null>(null)
  const unit = useData((s) => s.units.find((u) => u.code === res?.code))
  const owner = useData((s) => {
    const r = s.rights.find((x) => x.unitCode === res?.code && x.type === 'ownership')
    return r ? s.parties.find((p) => p.id === r.partyId)?.name : undefined
  })

  useEffect(() => {
    void verifyCard(payload).then(setRes)
  }, [payload])

  const stale = res?.ok && unit && res.status !== unit.status

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-navy-900 px-4 py-3">
        <Logo light subtitle={t('verify.subtitle')} />
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">
        <div className="mb-3 text-center text-[0.7rem] font-bold tracking-wider text-saffron-600">{t('app.prototype')}</div>
        {!res ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> {t('verify.checking')}
          </div>
        ) : !res.ok ? (
          <div className="rounded-xl border border-blocking/30 bg-white p-6 text-center shadow-sm">
            <CircleX className="mx-auto h-12 w-12 text-blocking" />
            <h1 className="mt-3 text-xl font-bold text-blocking">{t('verify.invalid')}</h1>
            <p className="mt-2 text-sm text-slate-600">{t('verify.invalidBody')}</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
            <div className="flex items-center gap-3 bg-success-bg px-5 py-4">
              <CircleCheck className="h-9 w-9 shrink-0 text-success" />
              <div>
                <h1 className="text-lg font-bold text-success">{t('verify.valid')}</h1>
                <p className="text-sm text-success/80">{t('verify.validBody')}</p>
              </div>
            </div>
            {stale && (
              <div className="flex items-start gap-2 border-b border-warning/30 bg-warning-bg px-5 py-3 text-sm text-warning">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                {t('verify.stale', { was: bi(STATUS_LABEL[res.status as Status]), now: bi(STATUS_LABEL[unit!.status]) })}
              </div>
            )}
            <div className="space-y-3 px-5 py-4">
              <CodeText code={res.code!} showValidity />
              <div className="text-xl font-bold text-navy-900">{unit?.label}</div>
              <div className="text-sm text-slate-600">Tower 1, Demo Heights · Plot 7 · Demo Ward 7</div>
              {unit && (
                <div className="flex flex-wrap gap-1.5">
                  <StatusChip status={unit.status} />
                  <TierBadge tier={unit.tier} long />
                </div>
              )}
              <dl className="grid grid-cols-2 gap-3 border-t border-line pt-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">{t('verify.holder')}</dt>
                  <dd className="font-semibold">{owner ? maskName(owner) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">{t('verify.issued')}</dt>
                  <dd className="font-semibold">{res.issued}</dd>
                </div>
              </dl>
              <p className="text-xs text-slate-500">{t('verify.privacy')}</p>
            </div>
          </div>
        )}
        <p className="mt-6 text-center text-xs text-slate-500">{t('app.disclaimer')}</p>
        <div className="mt-2 text-center">
          <Link to="/" className="text-xs font-semibold text-navy-700 hover:underline">
            Bhu-Aayam
          </Link>
        </div>
      </main>
    </div>
  )
}

export default VerifyPage

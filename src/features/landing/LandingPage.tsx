import { ArrowRight, BrainCircuit, Layers3, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LanguageToggle } from '@/app/AppShell'
import { FIRST_SCREEN, SCREENS } from '@/app/screens'
import { Logo } from '@/components/Logo'
import { useData } from '@/store/data'

function isoBox(cx: number, top: number, w: number, d: number, h: number) {
  return {
    top: `M${cx} ${top - d} L${cx + w} ${top} L${cx} ${top + d} L${cx - w} ${top}Z`,
    left: `M${cx - w} ${top} L${cx} ${top + d} L${cx} ${top + d + h} L${cx - w} ${top + h}Z`,
    right: `M${cx} ${top + d} L${cx + w} ${top} L${cx + w} ${top + h} L${cx} ${top + d + h}Z`,
  }
}

function IsoStack() {
  const floors = 6
  const highlight = 4
  const ground = isoBox(170, 214, 150, 75, 0)
  return (
    <svg viewBox="0 0 340 330" className="h-full w-full" aria-hidden="true">
      <path d={ground.top} fill="#12294D" stroke="#3E7BD1" strokeOpacity=".35" />
      <path d="M40 262 L170 327 L300 262" fill="none" stroke="#D55E00" strokeWidth="3.5" strokeDasharray="9 6" />
      <path d="M70 240 L230 320" fill="none" stroke="#56B4E9" strokeWidth="2.5" strokeDasharray="4 5" opacity=".8" />
      {Array.from({ length: floors }, (_, i) => {
        const b = isoBox(170, 196 - i * 30, 78, 39, 24)
        const hl = i === highlight
        return (
          <g key={i}>
            <path d={b.left} fill={hl ? '#C26A00' : '#1B3A6B'} />
            <path d={b.right} fill={hl ? '#E8A33D' : '#24508F'} />
            <path d={b.top} fill={hl ? '#F3C27A' : '#3E7BD1'} opacity={i === floors - 1 || hl ? 1 : 0.9} />
          </g>
        )
      })}
      <path d="M250 70 L300 70" stroke="#E8A33D" strokeWidth="1.5" />
      <circle cx="250" cy="70" r="3" fill="#E8A33D" />
    </svg>
  )
}

export function LandingPage() {
  const { t } = useTranslation()
  const sample = useData((s) => s.units.find((u) => u.label === 'Flat 402')?.code ?? '')

  const pillars = [
    { key: 'data', icon: Layers3 },
    { key: 'ai', icon: BrainCircuit },
    { key: 'standard', icon: ShieldCheck },
  ] as const

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 pt-6">
          <Logo light subtitle={t('app.tagline')} />
          <div className="flex items-center gap-3">
            <span className="hidden whitespace-nowrap rounded border border-saffron-400/60 px-2 py-0.5 text-[0.7rem] font-bold tracking-wider text-saffron-400 sm:inline">{t('app.prototype')}</span>
            <LanguageToggle />
          </div>
        </div>
        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-6 pb-16 pt-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-saffron-400">3D ULPIN · Volumetric Cadastre</p>
            <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">{t('landing.heroTitle')}</h1>
            <p className="mt-4 max-w-xl text-lg text-navy-100/85">{t('landing.heroSubtitle')}</p>
            <div className="mt-6 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm">
              <span className="text-navy-100/60">{sample.slice(0, 14)}</span>
              <span className="text-saffron-400">-{sample.slice(15, 22)}</span>
              <span className="ml-1 rounded bg-success/30 px-1.5 text-green-200">{sample.slice(22)}</span>
            </div>
            <p className="mt-2 text-xs text-navy-100/60">{t('landing.codeCaption')}</p>
            <Link
              to={FIRST_SCREEN}
              className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-saffron-600 px-6 text-base font-semibold text-white shadow-lg hover:bg-saffron-700"
            >
              {t('landing.enter')} <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
          <div className="hidden h-72 md:block">
            <IsoStack />
          </div>
        </div>
      </section>

      <section className="mx-auto -mt-8 grid max-w-6xl gap-4 px-6 md:grid-cols-3">
        {pillars.map(({ key, icon: Icon }) => (
          <div key={key} className="relative rounded-xl border border-line bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-semibold text-slate-900">{t(`landing.pillars.${key}.title`)}</h2>
            <p className="mt-1 text-sm text-slate-600">{t(`landing.pillars.${key}.body`)}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-4 text-lg font-semibold text-navy-900">{t('landing.flowTitle')}</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SCREENS.map((s, i) => {
            const Icon = s.icon
            return (
              <li key={s.id}>
                <Link to={s.path} className="group flex h-full flex-col gap-2 rounded-xl border border-line bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-navy-100 hover:shadow-md">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">{i + 1}</span>
                    <Icon className="h-4 w-4 text-navy-600" />
                  </div>
                  <div className="font-semibold text-slate-900">{t(`steps.${s.id}`)}</div>
                  <div className="text-sm text-slate-500">{t(`landing.flow.${s.id}`)}</div>
                </Link>
              </li>
            )
          })}
        </ol>
        <p className="mt-10 border-t border-line pt-4 text-center text-xs text-slate-500">{t('app.disclaimer')}</p>
      </section>
    </div>
  )
}

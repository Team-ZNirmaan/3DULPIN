import { ArrowRight, BrainCircuit, Layers3, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { homePathFor, ROLES, type RoleId } from '@/app/roles'
import { useSession } from '@/app/session-store'
import { Logo } from '@/components/Logo'
import { cn } from '@/lib/cn'
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
  const navigate = useNavigate()
  const setRole = useSession((s) => s.setRole)
  const lang = useSession((s) => s.lang)
  const setLang = useSession((s) => s.setLang)
  const sample = useData((s) => s.units.find((u) => u.label === 'Flat 402')?.code ?? '')

  const enter = (id: RoleId) => {
    setRole(id)
    navigate(homePathFor(id))
  }

  const pillars = [
    { key: 'data', icon: Layers3 },
    { key: 'ai', icon: BrainCircuit },
    { key: 'standard', icon: ShieldCheck },
  ] as const

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-navy-900 text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-6 pt-6">
          <Logo light subtitle={t('app.tagline')} />
          <div className="flex items-center gap-3">
            <span className="whitespace-nowrap rounded border border-saffron-400/60 px-2 py-0.5 text-[0.7rem] font-bold tracking-wider text-saffron-400">{t('app.prototype')}</span>
            <div className="flex rounded-md bg-white/10 p-0.5 text-sm">
              {(['en', 'hi'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={cn('h-8 rounded px-2.5 font-medium', lang === l ? 'bg-white text-navy-900' : 'text-navy-100')}
                >
                  {l === 'en' ? 'EN' : 'हिं'}
                </button>
              ))}
            </div>
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
            <p className="mt-2 text-xs text-navy-100/60">Flat 402 · Parent ULPIN · Type/Tower/Level/Unit · Check character</p>
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
        <h2 className="mb-4 text-lg font-semibold text-navy-900">{t('landing.chooseRole')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ROLES.map((r) => {
            const Icon = r.icon
            const featured = r.id === 'presenter'
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => enter(r.id)}
                className={cn(
                  'group flex items-start gap-3 rounded-xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md',
                  featured ? 'border-saffron-400 ring-1 ring-saffron-400/40' : 'border-line hover:border-navy-100',
                )}
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', featured ? 'bg-saffron-50 text-saffron-600' : 'bg-navy-50 text-navy-700')}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{t(`roles.${r.id}.name`)}</div>
                  <div className="mt-0.5 text-sm text-slate-500">{t(`roles.${r.id}.desc`)}</div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 text-slate-300 transition-colors group-hover:text-navy-600" />
              </button>
            )
          })}
        </div>
        <p className="mt-10 border-t border-line pt-4 text-center text-xs text-slate-500">{t('app.disclaimer')}</p>
      </section>
    </div>
  )
}

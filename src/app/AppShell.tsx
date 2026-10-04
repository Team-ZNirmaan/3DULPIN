import { ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router'
import { Logo } from '@/components/Logo'
import { Toaster } from '@/components/toast'
import { cn } from '@/lib/cn'
import { SCREENS } from './screens'
import { useSession } from './session-store'

export function LanguageToggle() {
  const { t } = useTranslation()
  const lang = useSession((s) => s.lang)
  const setLang = useSession((s) => s.setLang)
  return (
    <div role="group" aria-label={t('common.language')} className="flex h-9 shrink-0 items-center rounded-md bg-white/10 p-0.5 text-sm">
      {(['en', 'hi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn('h-8 rounded px-2 font-medium transition-colors sm:px-2.5', lang === l ? 'bg-white text-navy-900' : 'text-navy-100 hover:text-white')}
        >
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  )
}

function StepNav({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <nav aria-label={t('steps.label')} className={className}>
      <ol className="flex items-center gap-1">
        {SCREENS.map((s, i) => (
          <Fragment key={s.id}>
            <li className="shrink-0">
              <NavLink
                to={s.path}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3 text-sm font-medium transition-colors',
                    isActive ? 'bg-white text-navy-900 shadow-sm' : 'text-navy-100 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                        isActive ? 'bg-saffron-600 text-white' : 'bg-white/15 text-white',
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="whitespace-nowrap">{t(`steps.${s.id}`)}</span>
                  </>
                )}
              </NavLink>
            </li>
            {i < SCREENS.length - 1 && (
              <li aria-hidden="true" className="shrink-0 text-navy-100/40">
                <ChevronRight className="h-4 w-4" />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  )
}

export function AppShell() {
  const { t } = useTranslation()
  return (
    <div className="flex h-screen flex-col">
      <header className="no-print z-30 shrink-0 bg-navy-900">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          <NavLink to="/" className="shrink-0" aria-label="Bhu-Aayam home">
            <Logo light subtitle={t('app.tagline')} />
          </NavLink>
          <span className="hidden whitespace-nowrap rounded border border-saffron-400/60 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-saffron-400 2xl:inline">
            {t('app.prototype')}
          </span>
          <StepNav className="hidden flex-1 justify-center lg:flex" />
          <div className="ml-auto lg:ml-0">
            <LanguageToggle />
          </div>
        </div>
        <StepNav className="overflow-x-auto border-t border-white/5 px-3 pb-2 pt-1.5 lg:hidden" />
        <div className="border-t border-white/5 bg-navy-950 px-4 py-1 text-center text-[0.7rem] text-navy-100/70">{t('app.disclaimer')}</div>
      </header>
      <main id="main" className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}

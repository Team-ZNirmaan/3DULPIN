import { NavLink, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LogoMark } from './icons'
import { LanguageToggle } from './LanguageToggle'
import s from './AppShell.module.css'

const MENU = [
  { to: '/search', key: 'nav.search' },
  { to: '/map', key: 'nav.map' },
  { to: '/register', key: 'nav.register' },
] as const

export function AppShell() {
  const { t } = useTranslation()

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <NavLink to="/map" className={s.brand}>
          <LogoMark />
          <span className={s.brandText}>
            <span className={s.name}>{t('app.name')}</span>
            <span className={s.tagline}>{t('app.tagline')}</span>
          </span>
        </NavLink>

        <nav aria-label={t('nav.label')} className={s.nav}>
          {MENU.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? `${s.link} ${s.active}` : s.link)}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className={s.tools}>
          <span className={s.badge}>
            <span className={s.dot} aria-hidden="true" />
            {t('badge')}
          </span>
          <LanguageToggle />
        </div>
      </header>

      <main className={s.main}>
        <Outlet />
      </main>
    </div>
  )
}

import { Bell, Check, ChevronDown, Menu, PanelLeftClose, PanelLeftOpen, Search, Type, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { Logo } from '@/components/Logo'
import { Toaster } from '@/components/toast'
import { DemoGuide, useGuide } from '@/features/demo-guide/DemoGuide'
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from '@/components/ui/dropdown'
import { cn } from '@/lib/cn'
import { getRole, homePathFor, NAV_GROUPS, ROLES, SCREENS, type RoleId } from './roles'
import { useSession } from './session-store'

function RoleSwitcher() {
  const { t } = useTranslation()
  const role = useSession((s) => s.role)
  const setRole = useSession((s) => s.setRole)
  const navigate = useNavigate()
  const current = getRole(role)
  const Icon = current.icon

  const choose = (id: RoleId) => {
    setRole(id)
    navigate(homePathFor(id))
  }

  return (
    <Dropdown>
      <DropdownTrigger className="flex h-9 items-center gap-2 rounded-md bg-white/10 px-2 text-sm text-white hover:bg-white/15 sm:px-3" aria-label={t('roles.switch')}>
        <Icon className="h-4 w-4 text-saffron-400" />
        <span className="hidden text-navy-100/70 lg:inline">{t('roles.label')}:</span>
        <span className="hidden max-w-40 truncate font-medium sm:inline">{t(`roles.${role}.name`)}</span>
        <ChevronDown className="hidden h-3.5 w-3.5 opacity-70 sm:block" />
      </DropdownTrigger>
      <DropdownContent align="end" className="w-80">
        <DropdownLabel>{t('roles.switch')}</DropdownLabel>
        {ROLES.map((r) => {
          const RIcon = r.icon
          return (
            <DropdownItem key={r.id} onSelect={() => choose(r.id)}>
              <RIcon className="mt-0.5 h-4 w-4 shrink-0 text-navy-600" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900">{t(`roles.${r.id}.name`)}</div>
                <div className="text-xs text-slate-500">{t(`roles.${r.id}.desc`)}</div>
              </div>
              {r.id === role && <Check className="mt-0.5 h-4 w-4 text-success" />}
            </DropdownItem>
          )
        })}
        <DropdownSeparator />
        <DropdownItem onSelect={() => navigate('/')}>
          <span className="text-slate-500">← Back to role selection</span>
        </DropdownItem>
      </DropdownContent>
    </Dropdown>
  )
}

function LanguageToggle() {
  const { t } = useTranslation()
  const lang = useSession((s) => s.lang)
  const setLang = useSession((s) => s.setLang)
  return (
    <div role="group" aria-label={t('common.language')} className="flex h-9 items-center rounded-md bg-white/10 p-0.5 text-sm">
      {(['en', 'hi'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            'h-8 rounded px-2 font-medium transition-colors sm:px-2.5',
            lang === l ? 'bg-white text-navy-900' : 'text-navy-100 hover:text-white',
          )}
        >
          {l === 'en' ? 'EN' : 'हिं'}
        </button>
      ))}
    </div>
  )
}

function GlobalSearch() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!q.trim()) return
    navigate(`/app/registry?q=${encodeURIComponent(q.trim())}`)
  }
  return (
    <form onSubmit={submit} className="relative hidden w-full max-w-md md:block" role="search">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy-100/60" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t('app.searchPlaceholder')}
        aria-label={t('app.searchPlaceholder')}
        className="h-9 w-full rounded-md border border-white/10 bg-white/10 pl-9 pr-3 font-mono text-sm text-white placeholder:font-sans placeholder:text-navy-100/60 focus:border-white/30 focus:bg-white/15 focus:outline-none"
      />
    </form>
  )
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { t } = useTranslation()
  const largeFont = useSession((s) => s.largeFont)
  const toggleLargeFont = useSession((s) => s.toggleLargeFont)
  return (
    <header className="no-print z-30 shrink-0 bg-navy-900">
      <div className="flex h-14 items-center gap-2 px-3 sm:gap-4 sm:px-4">
        <button type="button" onClick={onMenu} className="flex h-9 w-9 items-center justify-center rounded-md text-white hover:bg-white/10 md:hidden" aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
        <NavLink to="/" className="shrink-0" aria-label="Bhu-Aayam home">
          <Logo light subtitle={t('app.tagline')} />
        </NavLink>
        <span className="hidden whitespace-nowrap rounded border border-saffron-400/60 px-1.5 py-0.5 text-[0.65rem] font-bold tracking-wider text-saffron-400 lg:inline">
          {t('app.prototype')}
        </span>
        <div className="flex flex-1 justify-center px-2">
          <GlobalSearch />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLargeFont}
            aria-pressed={largeFont}
            title="Large text (projector mode)"
            className={cn('hidden h-9 w-9 items-center justify-center rounded-md text-navy-100 hover:bg-white/10 sm:flex', largeFont && 'bg-white/15 text-white')}
          >
            <Type className="h-4 w-4" />
          </button>
          <LanguageToggle />
          <button
            type="button"
            className="relative hidden h-9 w-9 items-center justify-center rounded-md text-navy-100 hover:bg-white/10 sm:flex"
            aria-label={t('common.notifications')}
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-saffron-500 ring-2 ring-navy-900" />
          </button>
          <RoleSwitcher />
        </div>
      </div>
      <div className="border-t border-white/5 bg-navy-950 px-4 py-1 text-center text-[0.7rem] text-navy-100/70">{t('app.disclaimer')}</div>
    </header>
  )
}

function Sidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { t } = useTranslation()
  const role = useSession((s) => s.role)
  const collapsed = useSession((s) => s.sidebarCollapsed) && !mobile
  const toggle = useSession((s) => s.toggleSidebar)
  const allowed = new Set(getRole(role).screens)

  return (
    <nav
      aria-label="Main"
      className={cn(
        'no-print shrink-0 flex-col border-r border-line bg-white transition-[width] duration-200',
        mobile ? 'flex h-full w-64' : 'hidden md:flex',
        !mobile && (collapsed ? 'w-16' : 'w-60'),
      )}
    >
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group) => {
          const items = SCREENS.filter((s) => s.group === group && allowed.has(s.id))
          if (items.length === 0) return null
          return (
            <div key={group} className="mb-4">
              {!collapsed && (
                <div className="px-3 pb-1.5 text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">
                  {t(`nav.groups.${group}`)}
                </div>
              )}
              <ul className="space-y-0.5">
                {items.map((s) => {
                  const Icon = s.icon
                  return (
                    <li key={s.id}>
                      <NavLink
                        to={s.path}
                        onClick={onNavigate}
                        title={collapsed ? t(`nav.${s.id}`) : undefined}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                            collapsed && 'justify-center px-0',
                            isActive ? 'bg-navy-50 text-navy-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <Icon className={cn('h-[1.1rem] w-[1.1rem] shrink-0', isActive ? 'text-navy-600' : 'text-slate-500')} />
                            {!collapsed && <span className="truncate">{t(`nav.${s.id}`)}</span>}
                            {!collapsed && isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-saffron-500" />}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
      <div className="border-t border-line p-2">
        {!collapsed && (
          <div className="mb-2 rounded-md bg-surface px-3 py-2">
            <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-slate-500">{t('app.pilotSite')}</div>
            <div className="text-sm font-medium text-slate-800">{t('app.pilotSiteName')}</div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          className={cn('w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-500 hover:bg-slate-50', mobile ? 'hidden' : 'flex', collapsed && 'justify-center px-0')}
          aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          {!collapsed && t('nav.collapse')}
        </button>
      </div>
    </nav>
  )
}

export function AppShell() {
  const role = useSession((s) => s.role)
  const guideOpen = useGuide((s) => s.open)
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => setNavOpen(false), [location.pathname])
  const screen = SCREENS.find((s) => location.pathname.startsWith(s.path))
  if (screen && !getRole(role).screens.includes(screen.id)) {
    return <Navigate to={homePathFor(role)} replace />
  }
  return (
    <div className="flex h-screen flex-col">
      <TopBar onMenu={() => setNavOpen(true)} />
      {navOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setNavOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex shadow-2xl">
            <Sidebar mobile onNavigate={() => setNavOpen(false)} />
            <button type="button" onClick={() => setNavOpen(false)} className="absolute right-2 top-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close navigation">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main id="main" className={cn('min-w-0 flex-1 overflow-y-auto', guideOpen && 'pb-[76px]')}>
          <Outlet />
        </main>
      </div>
      <Toaster />
      {role === 'presenter' && <DemoGuide />}
    </div>
  )
}

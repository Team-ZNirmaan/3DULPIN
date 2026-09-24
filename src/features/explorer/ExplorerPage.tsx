import { Crosshair, Eye, Layers3, Palette, RotateCcw, Rows3, SlidersHorizontal, Waves } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolvePoint, type ResolveResult } from '@/api'
import { useBi } from '@/components/domain'
import { CLASS_COLOR, CLASS_LABEL, SEVERITY_COLOR, SEVERITY_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER, TIER_COLOR, TIER_LABEL } from '@/domain/display'
import type { LegalClass, Severity, Tier } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'
import { useExplorer, type ColorMode, type LayerState, type LevelMode } from '@/store/explorer'
import { DetailsPanel } from './DetailsPanel'
import { ExplorerScene, type HoverInfo } from './scene'

let consumedFlyToken = 0

const LEVELS_TOP_DOWN = ['RF', '05', '04', '03', '02', '01', '00', 'B1', 'B2']

function Section({ icon: Icon, title, children }: { icon: typeof Layers3; title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line px-4 py-3">
      <h2 className="mb-2 flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {title}
      </h2>
      {children}
    </section>
  )
}

function Legend({ mode }: { mode: ColorMode }) {
  const bi = useBi()
  const items: { color: string; label: string }[] =
    mode === 'class'
      ? (['exclusive', 'limited', 'common', 'parking', 'underground', 'elevated'] as LegalClass[]).map((c) => ({ color: CLASS_COLOR[c], label: bi(CLASS_LABEL[c]) }))
      : mode === 'tier'
        ? (['A', 'B', 'C', 'D'] as Tier[]).map((t) => ({ color: TIER_COLOR[t], label: bi(TIER_LABEL[t]) }))
        : mode === 'status'
          ? STATUS_ORDER.map((s) => ({ color: STATUS_COLOR[s], label: bi(STATUS_LABEL[s]) }))
          : [...(['blocking', 'warning', 'info'] as Severity[]).map((s) => ({ color: SEVERITY_COLOR[s], label: bi(SEVERITY_LABEL[s]) })), { color: '#C8CED8', label: 'No open issue' }]
  return (
    <ul className="mt-2 space-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-[0.78rem] text-slate-600">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

function ControlPanel({ onUnderground, className }: { onUnderground: (on: boolean) => void; className?: string }) {
  const { t } = useTranslation()
  const ex = useExplorer()
  const layerKeys: (keyof LayerState)[] = ['parcels', 'context', 'pilot', 'underground', 'elevated', 'issues', 'labels']
  const modes: ColorMode[] = ['class', 'tier', 'status', 'issues']
  const levelModes: LevelMode[] = ['all', 'only', 'upto']

  return (
    <aside className={cn('w-64 shrink-0 flex-col overflow-y-auto border-r border-line bg-white', className)}>
      <Section icon={Layers3} title={t('explorer.layers')}>
        <ul className="space-y-1">
          {layerKeys.map((k) => (
            <li key={k}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-slate-700 hover:bg-slate-50">
                <input type="checkbox" checked={ex.layers[k]} onChange={() => ex.toggleLayer(k)} className="h-4 w-4 accent-navy-600" />
                {t(`explorer.layer.${k}`)}
              </label>
            </li>
          ))}
        </ul>
      </Section>
      <Section icon={Waves} title={t('explorer.subsurface')}>
        <button
          type="button"
          onClick={() => onUnderground(!ex.undergroundView)}
          aria-pressed={ex.undergroundView}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold',
            ex.undergroundView ? 'bg-lc-underground text-white' : 'border border-line text-slate-700 hover:bg-slate-50',
          )}
        >
          <Eye className="h-4 w-4" /> {ex.undergroundView ? t('explorer.undergroundOn') : t('explorer.undergroundOff')}
        </button>
        <p className="mt-2 text-[0.72rem] leading-snug text-slate-500">{t('explorer.undergroundHint')}</p>
      </Section>
      <Section icon={Palette} title={t('explorer.colorBy')}>
        <div className="grid grid-cols-2 gap-1">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => ex.setColorMode(m)}
              aria-pressed={ex.colorMode === m}
              className={cn('rounded-md border px-2 py-1.5 text-[0.8rem] font-medium', ex.colorMode === m ? 'border-navy-600 bg-navy-50 text-navy-800' : 'border-line text-slate-600 hover:bg-slate-50')}
            >
              {t(`explorer.mode.${m}`)}
            </button>
          ))}
        </div>
        <Legend mode={ex.colorMode} />
      </Section>
      <Section icon={Rows3} title={t('explorer.floorSlicer')}>
        <div className="mb-2 flex rounded-md border border-line p-0.5">
          {levelModes.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => ex.setLevel(m)}
              aria-pressed={ex.levelMode === m}
              className={cn('flex-1 rounded px-1.5 py-1 text-[0.78rem] font-medium', ex.levelMode === m ? 'bg-navy-700 text-white' : 'text-slate-600')}
            >
              {t(`explorer.levelMode.${m}`)}
            </button>
          ))}
        </div>
        <div className="space-y-0.5" role="listbox" aria-label={t('explorer.floorSlicer')}>
          {LEVELS_TOP_DOWN.map((l) => {
            const active = ex.levelMode !== 'all' && ex.level === l
            const below = l.startsWith('B')
            return (
              <button
                key={l}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  ex.setLevel(ex.levelMode === 'all' ? 'only' : ex.levelMode, l)
                  if (below && !ex.undergroundView) onUnderground(true)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded px-2.5 py-1 text-left text-[0.8rem]',
                  active ? 'bg-saffron-600 font-semibold text-white' : 'text-slate-600 hover:bg-slate-100',
                  below && !active && 'bg-slate-50',
                )}
              >
                <span className="font-mono">{l}</span>
                <span className={cn('text-[0.72rem]', active ? 'text-white/90' : 'text-slate-500')}>{t(`explorer.levelName.${l}`)}</span>
              </button>
            )
          })}
        </div>
      </Section>
    </aside>
  )
}

export function ExplorerPage() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ExplorerScene | null>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [query, setQuery] = useState<ResolveResult | null>(null)
  const [querying, setQuerying] = useState(false)
  const [controlsOpen, setControlsOpen] = useState(false)

  const units = useData((s) => s.units)
  const parcels = useData((s) => s.parcels)
  const issues = useData((s) => s.issues)
  const selectedCode = useData((s) => s.selectedCode)
  const select = useData((s) => s.select)
  const flyRequest = useData((s) => s.flyRequest)
  const ex = useExplorer()

  const issueByCode = useMemo(() => {
    const rank: Record<Severity, number> = { blocking: 3, warning: 2, info: 1 }
    const m = new Map<string, Severity>()
    for (const i of issues) {
      if (i.status !== 'open' && i.status !== 'sent-to-field') continue
      for (const c of i.objectCodes) {
        const cur = m.get(c)
        if (!cur || rank[i.severity] > rank[cur]) m.set(c, i.severity)
      }
    }
    return m
  }, [issues])

  const runQuery = async (lon: number, lat: number, z: number) => {
    setQuerying(true)
    sceneRef.current?.showQueryMarker({ lon, lat, z })
    const r = await resolvePoint([lon, lat], z)
    setQuery(r)
    setQuerying(false)
  }

  useEffect(() => {
    if (!containerRef.current) return
    const scene = new ExplorerScene(containerRef.current, {
      onPick: ({ code, point }) => {
        if (point) {
          void runQuery(point.lon, point.lat, point.z)
          return
        }
        setQuery(null)
        if (!code) {
          select(undefined)
          return
        }
        if (code.startsWith('parcel:')) {
          const pid = code.slice(7)
          const u = useData.getState().units.find((x) => x.type === 'S' && x.parcelId === pid)
          select(u?.code)
          return
        }
        if (code.startsWith('label:')) return
        select(code)
      },
      onHover: setHover,
    })
    sceneRef.current = scene
    const s = useData.getState()
    scene.build(s.units, s.parcels, s.issues)
    const fr = s.flyRequest
    if (fr && fr.token !== consumedFlyToken) {
      consumedFlyToken = fr.token
      scene.flyTo(fr)
    } else {
      scene.resetView(0)
    }
    return () => {
      scene.destroy()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    sceneRef.current?.build(units, parcels, issues)
  }, [units, parcels, issues])

  useEffect(() => {
    sceneRef.current?.applyStyle({
      colorMode: ex.colorMode,
      levelMode: ex.levelMode,
      level: ex.level,
      layers: ex.layers,
      underground: ex.undergroundView,
      selectedCode,
      issueByCode,
    })
  }, [ex.colorMode, ex.levelMode, ex.level, ex.layers, ex.undergroundView, selectedCode, issueByCode, units, parcels, issues])

  useEffect(() => {
    sceneRef.current?.setQueryMode(ex.queryMode)
    if (!ex.queryMode) {
      setQuery(null)
      sceneRef.current?.showQueryMarker(undefined)
    }
  }, [ex.queryMode])

  useEffect(() => {
    if (flyRequest && flyRequest.token !== consumedFlyToken && sceneRef.current) {
      consumedFlyToken = flyRequest.token
      sceneRef.current.flyTo(flyRequest)
    }
  }, [flyRequest])

  const setUnderground = (on: boolean) => {
    ex.setUndergroundView(on)
    if (on) sceneRef.current?.undergroundView()
  }

  return (
    <div className="relative flex h-full min-h-0">
      <ControlPanel
        onUnderground={setUnderground}
        className={controlsOpen ? 'absolute inset-y-0 left-0 z-20 flex shadow-2xl md:static md:shadow-none' : 'hidden md:flex'}
      />
      <div className="relative min-w-0 flex-1 bg-slate-200">
        <div ref={containerRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute left-3 top-3 flex gap-2">
          <button
            type="button"
            onClick={() => setControlsOpen(!controlsOpen)}
            aria-pressed={controlsOpen}
            aria-label={t('explorer.layers')}
            className="pointer-events-auto flex h-9 w-9 items-center justify-center rounded-md bg-white text-slate-700 shadow-md md:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => ex.setQueryMode(!ex.queryMode)}
            aria-pressed={ex.queryMode}
            className={cn(
              'pointer-events-auto flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-semibold shadow-md',
              ex.queryMode ? 'bg-saffron-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            <Crosshair className="h-4 w-4" /> {t('explorer.pointQuery')}
          </button>
          <button
            type="button"
            onClick={() => {
              ex.setUndergroundView(false)
              sceneRef.current?.resetView()
            }}
            className="pointer-events-auto flex h-9 items-center gap-2 whitespace-nowrap rounded-md bg-white px-3 text-sm font-semibold text-slate-700 shadow-md hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">{t('explorer.resetView')}</span>
          </button>
        </div>
        {ex.queryMode && (
          <div className="pointer-events-none absolute bottom-12 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full bg-navy-900/90 px-4 py-1.5 text-center text-xs font-medium text-white shadow-lg">
            {t('explorer.queryHint')}
          </div>
        )}
        {hover && !ex.queryMode && (
          <div
            className="pointer-events-none absolute z-10 max-w-xs rounded-md bg-navy-900/95 px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{ left: hover.x + 14, top: hover.y + 14 }}
          >
            <div className="font-semibold">{hover.label}</div>
            <div className="font-mono text-[0.68rem] text-navy-100/80">{hover.code}</div>
          </div>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 hidden rounded bg-white/85 px-2 py-1 text-[0.68rem] font-medium text-slate-500 shadow-sm sm:block">
          {t('explorer.footer')}
        </div>
      </div>
      <DetailsPanel
        className={
          selectedCode || query || ex.queryMode
            ? 'absolute inset-x-0 bottom-0 z-20 flex max-h-[55%] w-full border-t shadow-2xl lg:static lg:max-h-none lg:w-[22rem] lg:border-t-0 lg:shadow-none'
            : 'hidden lg:flex'
        }
        query={query}
        querying={querying}
        queryMode={ex.queryMode}
        onRequery={(z) => query && void runQuery(query.point.lon, query.point.lat, z)}
      />
    </div>
  )
}

export default ExplorerPage

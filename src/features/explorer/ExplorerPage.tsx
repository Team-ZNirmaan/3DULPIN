import { Crosshair, Eye, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { resolvePoint, type ResolveResult } from '@/api'
import { useBi } from '@/components/domain'
import { CLASS_COLOR, CLASS_LABEL, STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from '@/domain/display'
import type { LegalClass } from '@/domain/types'
import { cn } from '@/lib/cn'
import { useData } from '@/store/data'
import { useExplorer, type ColorMode, type LayerState } from '@/store/explorer'
import { DetailsCard } from './DetailsPanel'
import { ExplorerScene, type HoverInfo } from './scene'

let consumedFlyToken = 0

const LEVELS_TOP_DOWN = ['RF', '05', '04', '03', '02', '01', '00', 'B1', 'B2']
const CLASSES: LegalClass[] = ['exclusive', 'limited', 'common', 'parking', 'underground', 'elevated']

function ToolButton({ active, onClick, children, label, className }: { active?: boolean; onClick: () => void; children: React.ReactNode; label: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex h-9 items-center gap-2 whitespace-nowrap rounded-lg px-3 text-sm font-semibold transition-colors',
        active ? 'bg-navy-800 text-white' : 'text-slate-700 hover:bg-slate-100',
        className,
      )}
    >
      {children}
    </button>
  )
}

function ViewPopover({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const ex = useExplorer()
  const layerKeys: (keyof LayerState)[] = ['parcels', 'context', 'underground']
  const modes: ColorMode[] = ['class', 'status']
  return (
    <div className="pointer-events-auto w-60 rounded-xl border border-line bg-white p-3 shadow-2xl" role="dialog" aria-label={t('explorer.view')}>
      <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">{t('explorer.colorBy')}</div>
      <div className="mb-3 flex rounded-lg bg-surface p-0.5">
        {modes.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => ex.setColorMode(m)}
            aria-pressed={ex.colorMode === m}
            className={cn('flex-1 rounded-md px-2 py-1.5 text-[0.8rem] font-medium', ex.colorMode === m ? 'bg-white text-navy-800 shadow-sm' : 'text-slate-600')}
          >
            {t(`explorer.mode.${m}`)}
          </button>
        ))}
      </div>
      <div className="mb-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-slate-500">{t('explorer.layers')}</div>
      <ul className="space-y-0.5">
        {layerKeys.map((k) => (
          <li key={k}>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm text-slate-700 hover:bg-slate-50">
              {t(`explorer.layer.${k}`)}
              <input type="checkbox" checked={ex.layers[k]} onChange={() => ex.toggleLayer(k)} className="h-4 w-4 accent-navy-600" />
            </label>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onClose} className="mt-2 w-full rounded-md py-1 text-xs font-medium text-slate-500 hover:bg-slate-50">
        {t('explorer.close')}
      </button>
    </div>
  )
}

function FloorRail({ onUnderground }: { onUnderground: (on: boolean) => void }) {
  const { t } = useTranslation()
  const ex = useExplorer()
  return (
    <div className="pointer-events-auto flex flex-col gap-0.5 rounded-xl border border-line bg-white/95 p-1 shadow-lg backdrop-blur" role="listbox" aria-label={t('explorer.floorSlicer')}>
      <button
        type="button"
        role="option"
        aria-selected={ex.levelMode === 'all'}
        onClick={() => ex.setLevel('all')}
        className={cn('h-8 w-11 rounded-lg text-[0.72rem] font-bold', ex.levelMode === 'all' ? 'bg-navy-800 text-white' : 'text-slate-600 hover:bg-slate-100')}
      >
        {t('explorer.levelMode.all')}
      </button>
      <div className="mx-1.5 my-0.5 h-px bg-line" />
      {LEVELS_TOP_DOWN.map((l) => {
        const active = ex.levelMode === 'only' && ex.level === l
        const below = l.startsWith('B')
        return (
          <button
            key={l}
            type="button"
            role="option"
            aria-selected={active}
            title={t(`explorer.levelName.${l}`)}
            onClick={() => {
              ex.setLevel('only', l)
              if (below && !ex.undergroundView) onUnderground(true)
            }}
            className={cn(
              'h-7 w-11 rounded-lg font-mono text-[0.75rem] font-semibold',
              active ? 'bg-saffron-600 text-white' : below ? 'text-lc-underground hover:bg-orange-50' : 'text-slate-600 hover:bg-slate-100',
              l === '00' && !active && 'mb-1',
            )}
          >
            {l}
          </button>
        )
      })}
    </div>
  )
}

function Legend() {
  const bi = useBi()
  const mode = useExplorer((s) => s.colorMode)
  const items =
    mode === 'class'
      ? CLASSES.map((c) => ({ color: CLASS_COLOR[c], label: bi(CLASS_LABEL[c]) }))
      : STATUS_ORDER.map((s) => ({ color: STATUS_COLOR[s], label: bi(STATUS_LABEL[s]) }))
  return (
    <ul className="pointer-events-auto flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/90 px-3 py-1.5 shadow-md backdrop-blur">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-[0.72rem] font-medium text-slate-600">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ backgroundColor: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  )
}

export function ExplorerPage() {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<ExplorerScene | null>(null)
  const [hover, setHover] = useState<HoverInfo | null>(null)
  const [query, setQuery] = useState<ResolveResult | null>(null)
  const [querying, setQuerying] = useState(false)
  const [viewOpen, setViewOpen] = useState(false)

  const units = useData((s) => s.units)
  const parcels = useData((s) => s.parcels)
  const selectedCode = useData((s) => s.selectedCode)
  const select = useData((s) => s.select)
  const flyRequest = useData((s) => s.flyRequest)
  const ex = useExplorer()

  const runQuery = async (lon: number, lat: number, z: number) => {
    setQuerying(true)
    sceneRef.current?.showQueryMarker({ lon, lat, z })
    setQuery(await resolvePoint([lon, lat], z))
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
        if (!code || code.startsWith('label:')) {
          select(undefined)
          return
        }
        if (code.startsWith('parcel:')) {
          const pid = code.slice(7)
          select(useData.getState().units.find((x) => x.type === 'S' && x.parcelId === pid)?.code)
          return
        }
        select(code)
      },
      onHover: setHover,
    })
    sceneRef.current = scene
    const s = useData.getState()
    scene.build(s.units, s.parcels)
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
    sceneRef.current?.build(units, parcels)
  }, [units, parcels])

  useEffect(() => {
    sceneRef.current?.applyStyle({
      colorMode: ex.colorMode,
      levelMode: ex.levelMode,
      level: ex.level,
      layers: ex.layers,
      underground: ex.undergroundView,
      selectedCode,
    })
  }, [ex.colorMode, ex.levelMode, ex.level, ex.layers, ex.undergroundView, selectedCode, units, parcels])

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

  const closeDetails = () => {
    select(undefined)
    ex.setQueryMode(false)
  }

  return (
    <div className="relative h-full min-h-[420px] bg-slate-200">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute inset-0 p-3">
        <div className="relative flex items-start gap-2">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-xl border border-line bg-white/95 p-1 shadow-lg backdrop-blur">
            <ToolButton active={viewOpen} onClick={() => setViewOpen(!viewOpen)} label={t('explorer.view')}>
              <SlidersHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">{t('explorer.view')}</span>
            </ToolButton>
            <span className="mx-0.5 h-5 w-px bg-line" />
            <ToolButton active={ex.queryMode} onClick={() => ex.setQueryMode(!ex.queryMode)} label={t('explorer.pointQuery')}>
              <Crosshair className="h-4 w-4" /> <span className="hidden sm:inline">{t('explorer.pointQuery')}</span>
            </ToolButton>
            <ToolButton
              active={ex.undergroundView}
              onClick={() => setUnderground(!ex.undergroundView)}
              label={t('explorer.underground')}
              className={ex.undergroundView ? 'bg-lc-underground text-white' : ''}
            >
              <Eye className="h-4 w-4" /> <span className="hidden sm:inline">{t('explorer.underground')}</span>
            </ToolButton>
            <ToolButton
              onClick={() => {
                ex.resetExplorer()
                closeDetails()
                sceneRef.current?.resetView()
              }}
              label={t('explorer.resetView')}
            >
              <RotateCcw className="h-4 w-4" />
            </ToolButton>
          </div>
          {viewOpen && (
            <div className="absolute left-0 top-12 z-20">
              <ViewPopover onClose={() => setViewOpen(false)} />
            </div>
          )}
        </div>

        <div className="absolute left-3 top-1/2 -translate-y-1/2">
          <FloorRail onUnderground={setUnderground} />
        </div>

        <DetailsCard
          className="absolute inset-x-2 bottom-2 max-h-[55%] sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-3 sm:max-h-[calc(100%-1.5rem)] sm:w-[22rem]"
          query={query}
          querying={querying}
          queryMode={ex.queryMode}
          onRequery={(z) => query && void runQuery(query.point.lon, query.point.lat, z)}
          onClose={closeDetails}
        />

        <div className="absolute bottom-3 left-3 hidden max-w-[calc(100%-24rem)] md:block">
          <Legend />
        </div>

        {!selectedCode && !ex.queryMode && (
          <div className="absolute bottom-14 left-1/2 hidden -translate-x-1/2 rounded-full bg-navy-900/85 px-4 py-1.5 text-xs font-medium text-white shadow-lg sm:block md:bottom-14">
            {t('explorer.clickHint')}
          </div>
        )}
        {ex.queryMode && !query && (
          <div className="absolute bottom-14 left-1/2 max-w-[80%] -translate-x-1/2 rounded-full bg-saffron-600 px-4 py-1.5 text-center text-xs font-semibold text-white shadow-lg">
            {t('explorer.queryHint')}
          </div>
        )}
      </div>

      {hover && !ex.queryMode && (
        <div className="pointer-events-none absolute z-10 max-w-xs rounded-md bg-navy-900/95 px-2.5 py-1.5 text-xs text-white shadow-lg" style={{ left: hover.x + 14, top: hover.y + 14 }}>
          <div className="font-semibold">{hover.label}</div>
          <div className="font-mono text-[0.68rem] text-navy-100/80">{hover.code}</div>
        </div>
      )}
    </div>
  )
}

export default ExplorerPage

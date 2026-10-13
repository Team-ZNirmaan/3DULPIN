import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CesiumMap, type MapApi, type MapHit, type MapHover, type MapStatus } from '../map/CesiumMap'
import { usingEvaluationToken } from '../map/config'
import { HoverTip } from '../map/HoverTip'
import { MapLegend } from '../map/MapLegend'
import { PlotPanel } from '../map/panels/PlotPanel'
import { SpacePanel } from '../map/panels/SpacePanel'
import { SceneDock } from '../map/SceneDock'
import { MAP_VIEWS, type MapView } from '../map/scene/camera'
import { ViewToggle } from '../map/ViewToggle'
import { findByCode, plots, spaces, towerPlot, type Space } from '../data'
import type { Level } from '../lib/ulpin'
import { useDemoState } from '../state/demo'
import { AlertIcon, PinIcon } from '../components/icons'
import s from './MapPage.module.css'

const LEAF = new Set(['U', 'L', 'P', 'C'])

/** A 3D space that can be selected on the map (flats, bays, common areas). */
function leafSpace(code: string | null): Space | null {
  const found = code ? findByCode(code) : undefined
  return found && 'type' in found && LEAF.has(found.type) ? (found as Space) : null
}

export function MapPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const { towerRegistered } = useDemoState()
  const [status, setStatus] = useState<MapStatus>('loading')
  const [hover, setHover] = useState<MapHover>(null)
  const [exploded, setExploded] = useState(false)
  const [slice, setSlice] = useState<Level | null>(null)
  const mapRef = useRef<MapApi>(null)

  // URL state: view, selected space (code) and selected plot. Codes only select once the tower is registered.
  const code = params.get('code')
  const space = towerRegistered ? leafSpace(code) : null
  const codeOnTower = !!code && (!!leafSpace(code) || spaces.some((sp) => sp.code === code))
  const plotCts = params.get('plot') ?? (codeOnTower ? towerPlot.cts : null)
  const plot = plots.find((p) => p.cts === plotCts) ?? null
  const viewParam = params.get('view')
  // A shared link to a space opens straight in 3D.
  const view: MapView = MAP_VIEWS.includes(viewParam as MapView) ? (viewParam as MapView) : space ? '3d' : '2d'

  // Every change keeps the current view in the URL, so selecting or clearing never moves the camera
  // to a different view by itself.
  const update = (changes: Record<string, string | null>) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p)
        if (!('view' in changes)) {
          if (view === '2d') n.delete('view')
          else n.set('view', view)
        }
        for (const [k, v] of Object.entries(changes)) {
          if (v === null) n.delete(k)
          else n.set(k, v)
        }
        return n
      },
      { replace: true },
    )

  const setView = (next: '2d' | '3d') => update({ view: next === '2d' ? null : next })
  const clear = () => update({ code: null, plot: null })
  /** Select a space; optionally fly the camera to it (from a list or a link, not from a click on the block). */
  const selectSpace = (next: string, fly: boolean) => {
    update({ code: next, plot: towerPlot.cts, view: fly && view === '2d' ? '3d' : view === '2d' ? null : view })
    if (fly) setTimeout(() => mapRef.current?.flyToSpace(next), 0)
  }

  const onPick = (hit: MapHit) => {
    if (!hit) return clear()
    if ('space' in hit) return selectSpace(hit.space, false)
    update({ code: null, plot: hit.plot })
  }

  // Deep link: once the map is ready, fly to the space in the link.
  const deepLinkDone = useRef(false)
  useEffect(() => {
    if (status !== 'ready' || deepLinkDone.current) return
    deepLinkDone.current = true
    if (space) mapRef.current?.flyToSpace(space.code)
  }, [status, space])

  // Escape clears the selection.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const showTools = towerRegistered && view !== '2d'

  return (
    <div className={s.page}>
      <CesiumMap
        ref={mapRef}
        view={view}
        towerRegistered={towerRegistered}
        notRegisteredText={t('map.notRegistered')}
        selectedCode={space?.code ?? null}
        selectedPlot={plot?.cts ?? null}
        exploded={exploded}
        slice={slice}
        onStatus={setStatus}
        onPick={onPick}
        onHover={setHover}
      />

      {plot ? (
        <PlotPanel plot={plot} towerRegistered={towerRegistered} selectedCode={space?.code ?? null} onSelect={(c) => selectSpace(c, true)} onBack={clear} />
      ) : (
        <section className={s.panel} aria-labelledby="map-title">
          <h1 id="map-title" className={s.title}>
            {t('map.title')}
          </h1>
          <p className={s.place}>
            <PinIcon size={15} />
            {t('map.place')}
          </p>
          <p className={s.intro}>{t('map.intro')}</p>

          <button type="button" className={s.tower} onClick={() => update({ plot: towerPlot.cts })}>
            <span className={s.towerName}>{t('map.towerLine', { cts: towerPlot.cts })}</span>
            <span className={towerRegistered ? `${s.state} ${s.issued}` : `${s.state} ${s.pending}`}>
              {towerRegistered ? t('map.issued', { count: spaces.length }) : t('map.notIssued')}
            </span>
          </button>

          {status === 'loading' && (
            <p className={s.status} role="status">
              <span className={s.spinner} aria-hidden="true" />
              {t('map.loading')}
            </p>
          )}
          {status === 'error' && (
            <p className={`${s.status} ${s.error}`} role="alert">
              <AlertIcon size={15} />
              {t('map.loadError')}
            </p>
          )}
          {usingEvaluationToken && <p className={s.note}>{t('map.evalToken')}</p>}
        </section>
      )}

      {space && <SpacePanel space={space} onClose={() => update({ code: null })} onSelect={(c) => selectSpace(c, true)} />}
      {showTools && <SceneDock exploded={exploded} onExplode={setExploded} slice={slice} onSlice={setSlice} />}
      <HoverTip hover={hover && hover.space !== space?.code ? hover : null} />
      <MapLegend towerRegistered={towerRegistered} />
      <ViewToggle value={view === '2d' ? '2d' : '3d'} onChange={setView} />
    </div>
  )
}

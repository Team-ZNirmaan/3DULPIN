import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CesiumMap, type MapApi, type MapHit, type MapHover, type MapStatus } from '../map/CesiumMap'
import { usingEvaluationToken } from '../map/config'
import { HoverTip } from '../map/HoverTip'
import { MapLegend } from '../map/MapLegend'
import { PlotPanel } from '../map/panels/PlotPanel'
import { LinePanel } from '../map/panels/LinePanel'
import { SpacePanel } from '../map/panels/SpacePanel'
import { SceneDock } from '../map/SceneDock'
import { MAP_VIEWS, type MapView } from '../map/scene/camera'
import { ViewToggle, type ToggleView } from '../map/ViewToggle'
import { findByCode, plots, spaces, towerPlot, type Space, type UndergroundAsset } from '../data'
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

/** An underground line (metro tunnel or water main), selectable in the underground view. */
function lineAsset(code: string | null): UndergroundAsset | null {
  const found = code ? findByCode(code) : undefined
  return found && !('type' in found) ? found : null
}

const isBasement = (level: Level | null) => level === 'B1' || level === 'B2'
/** Basement spaces and underground lines can only be seen in the underground view. */
const belowGround = (code: string) => !!lineAsset(code) || isBasement(leafSpace(code)?.level ?? null)

const subscribeOnline = (cb: () => void) => {
  window.addEventListener('online', cb)
  window.addEventListener('offline', cb)
  return () => {
    window.removeEventListener('online', cb)
    window.removeEventListener('offline', cb)
  }
}
/** Whether the browser has a network connection; the 3D city streams from the internet. */
const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine)

export function MapPage() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const { towerRegistered } = useDemoState()
  const [status, setStatus] = useState<MapStatus>('loading')
  const [hover, setHover] = useState<MapHover>(null)
  const [exploded, setExploded] = useState(false)
  const [sliceChoice, setSlice] = useState<Level | null>(null)
  const mapRef = useRef<MapApi>(null)
  const online = useOnline()
  // A camera flight to a space, requested by a list or a link. URL changes reach the page as a
  // transition, later than this state, so the flight waits until the page shows its view; otherwise the
  // view change would start its own camera move and cancel the flight.
  const [flight, setFlight] = useState<{ code: string; view: MapView } | null>(null)
  const flown = useRef<object | null>(null)

  // URL state: view, selected space (code) and selected plot. Tower codes only select once the tower is
  // registered; the underground lines have their codes already.
  const code = params.get('code')
  const space = towerRegistered ? leafSpace(code) : null
  const line = lineAsset(code)
  const selectedCode = space?.code ?? line?.code ?? null
  const codeOnTower = !!code && (!!leafSpace(code) || spaces.some((sp) => sp.code === code))
  const plotCts = params.get('plot') ?? (codeOnTower ? towerPlot.cts : null)
  const plot = plots.find((p) => p.cts === plotCts) ?? null
  const viewParam = params.get('view')
  // A shared link to a space opens straight in 3D, or underground for a basement space or a line.
  const view: MapView = MAP_VIEWS.includes(viewParam as MapView)
    ? (viewParam as MapView)
    : selectedCode
      ? belowGround(selectedCode)
        ? 'under'
        : '3d'
      : '2d'
  // Basement floors are only in the floor picker in the underground view.
  const slice = view !== 'under' && isBasement(sliceChoice) ? null : sliceChoice

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

  // Leaving the underground view also lets go of a basement space or line, which can no longer be seen.
  const setView = (next: ToggleView) =>
    update({ view: next === '2d' ? null : next, ...(next !== 'under' && selectedCode && belowGround(selectedCode) ? { code: null } : {}) })
  const clear = () => update({ code: null, plot: null })
  /**
   * Select a space or an underground line; optionally fly the camera to it (from a list or a link, not
   * from a click on the map). Spaces below ground switch to the underground view.
   */
  const selectSpace = (next: string, fly: boolean) => {
    const target: MapView = belowGround(next) ? 'under' : view === '2d' ? '3d' : view
    update({ code: next, view: target, ...(leafSpace(next) ? { plot: towerPlot.cts } : {}) })
    if (fly) setFlight({ code: next, view: target })
  }

  const onPick = (hit: MapHit) => {
    if (!hit) return clear()
    if ('space' in hit) return selectSpace(hit.space, false)
    update({ code: null, plot: hit.plot })
  }

  useEffect(() => {
    if (!flight || flight.view !== view || flown.current === flight) return
    flown.current = flight
    mapRef.current?.flyToSpace(flight.code)
  }, [flight, view])

  // Deep link: once the map is ready, fly to the space in the link.
  const deepLinkDone = useRef(false)
  useEffect(() => {
    if (status !== 'ready' || deepLinkDone.current) return
    deepLinkDone.current = true
    if (selectedCode) mapRef.current?.flyToSpace(selectedCode)
  }, [status, selectedCode])

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
        selectedCode={selectedCode}
        selectedPlot={plot?.cts ?? null}
        exploded={exploded}
        slice={slice}
        onStatus={setStatus}
        onPick={onPick}
        onHover={setHover}
      />

      {plot ? (
        <PlotPanel plot={plot} towerRegistered={towerRegistered} selectedCode={selectedCode} onSelect={(c) => selectSpace(c, true)} onBack={clear} />
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
          {!online && (
            <p className={`${s.status} ${s.error}`} role="alert">
              <AlertIcon size={15} />
              {t('map.offline')}
            </p>
          )}
          {status === 'error' && online && (
            <p className={`${s.status} ${s.error}`} role="alert">
              <AlertIcon size={15} />
              {t('map.loadError')}
            </p>
          )}
          {usingEvaluationToken && <p className={s.note}>{t('map.evalToken')}</p>}
        </section>
      )}

      {space && <SpacePanel space={space} onClose={() => update({ code: null })} onSelect={(c) => selectSpace(c, true)} />}
      {line && <LinePanel line={line} onClose={() => update({ code: null })} onSelectPlot={(cts) => update({ plot: cts })} />}
      {showTools && <SceneDock exploded={exploded} onExplode={setExploded} slice={slice} onSlice={setSlice} includeBasements={view === 'under'} />}
      <HoverTip hover={hover && hover.space !== selectedCode ? hover : null} />
      <MapLegend towerRegistered={towerRegistered} view={view} />
      <ViewToggle value={view === 'close' ? '3d' : view} onChange={setView} />
    </div>
  )
}

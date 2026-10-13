import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Cesium3DTileStyle,
  ClippingPolygon,
  ClippingPolygonCollection,
  createOsmBuildingsAsync,
  HeadingPitchRange,
  JulianDate,
  Math as CesiumMath,
  sampleTerrainMostDetailed,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  ShadowMode,
  Terrain,
  Viewer,
  type Cesium3DTileset,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { plots, towerPlot, underground } from '../data'
import { SITE } from '../data/site'
import { COLOURS } from './palette'
import { goTo, lookDownOn, type MapView } from './scene/camera'
import { addGroundFade, fadedArea } from './scene/ground'
import { addNetworks } from './scene/networks'
import { addPlots } from './scene/plots'
import { addTower } from './scene/tower'
import type { Level } from '../lib/ulpin'
import s from './CesiumMap.module.css'

export type MapStatus = 'loading' | 'ready' | 'error'

/** A click on the map: a 3D space (a block of the tower or an underground line, by its 3D-ULPIN) or a plot. */
export type MapHit = { space: string } | { plot: string } | null
export type MapHover = { space: string; x: number; y: number } | null
export type MapApi = { flyToSpace: (code: string) => void }

type Props = {
  view: MapView
  towerRegistered: boolean
  notRegisteredText: string
  selectedCode: string | null
  selectedPlot: string | null
  exploded: boolean
  slice: Level | null
  onStatus?: (status: MapStatus) => void
  onPick?: (hit: MapHit) => void
  onHover?: (hover: MapHover) => void
  ref?: Ref<MapApi>
}

type Handles = {
  viewer: Viewer
  groundHeight: number
  plotsLayer: ReturnType<typeof addPlots>
  tower: ReturnType<typeof addTower>
  networks: ReturnType<typeof addNetworks>
  ground: ReturnType<typeof addGroundFade>
  /** In the underground view, hides the city buildings that stand on the faded ground. */
  setBuildingsUnderground: (underground: boolean) => void
  whenLoaded: () => Promise<void>
}

// A fixed late-afternoon sun (16:00 IST in mid March) for long, soft shadows across the street.
const SUN_TIME = JulianDate.fromIso8601('2026-03-15T10:30:00Z')

export function CesiumMap(props: Props) {
  const { view, towerRegistered, notRegisteredText, selectedCode, selectedPlot, exploded, slice, onStatus, ref } = props
  const containerRef = useRef<HTMLDivElement>(null)
  const [handles, setHandles] = useState<Handles | null>(null)
  const initial = useRef({ view, notRegisteredText, towerRegistered })
  const onStatusRef = useRef(onStatus)
  const onPickRef = useRef(props.onPick)
  const onHoverRef = useRef(props.onHover)
  useEffect(() => {
    onStatusRef.current = onStatus
    onPickRef.current = props.onPick
    onHoverRef.current = props.onHover
  })

  // Build the scene once.
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let cancelled = false
    const report = (status: MapStatus) => {
      onStatusRef.current?.(status)
      document.body.dataset.mapStatus = status
    }
    report('loading')

    const terrain = Terrain.fromWorldTerrain()
    const viewer = new Viewer(container, {
      terrain,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      sceneModePicker: false,
      navigationHelpButton: false,
      fullscreenButton: false,
      infoBox: false,
      selectionIndicator: false,
      shadows: true,
      terrainShadows: ShadowMode.RECEIVE_ONLY,
    })
    const { scene } = viewer

    // Light, shadows and image quality
    viewer.clock.currentTime = SUN_TIME
    viewer.clock.shouldAnimate = false
    scene.globe.enableLighting = true
    scene.globe.depthTestAgainstTerrain = true
    scene.highDynamicRange = false
    scene.postProcessStages.fxaa.enabled = true
    viewer.shadowMap.softShadows = true
    viewer.shadowMap.size = 2048
    viewer.shadowMap.darkness = 0.42
    viewer.shadowMap.maximumDistance = 1500

    // Muted aerial imagery, so the parcels and the tower stand out.
    const base = viewer.imageryLayers.get(0)
    if (base) {
      base.saturation = 0.4
      base.brightness = 1.08
      base.contrast = 0.94
    }

    const terrainReady = new Promise<void>((resolve) => {
      terrain.readyEvent.addEventListener(() => resolve())
      terrain.errorEvent.addEventListener(() => {
        report('error')
        resolve() // carry on with the plain globe
      })
    })

    const buildingsReady = createOsmBuildingsAsync({ style: buildingStyle(false, false) }).catch(() => undefined)

    let cleanupInput: (() => void) | undefined
    ;(async () => {
      await terrainReady
      const buildings = await buildingsReady
      if (cancelled || viewer.isDestroyed()) return

      // Ground height (metres above the WGS84 ellipsoid) where Tower 1 stands.
      let groundHeight = 0
      try {
        const [c] = await sampleTerrainMostDetailed(viewer.terrainProvider, [Cartographic.fromDegrees(SITE.origin.lon, SITE.origin.lat)])
        groundHeight = c.height ?? 0
      } catch {
        // plain globe: the ellipsoid is the ground
      }
      if (cancelled || viewer.isDestroyed()) return
      document.body.dataset.groundEllipsoidHeight = groundHeight.toFixed(2)

      let hideByStyle = false
      if (buildings) {
        // Real buildings cast shadows on the ground but do not shadow themselves (no striped acne).
        buildings.shadows = ShadowMode.CAST_ONLY
        hideByStyle = !hideRealBuildingOnTowerPlot(viewer, buildings)
        scene.primitives.add(buildings)
      }
      const setBuildingsUnderground = (underground: boolean) => {
        if (buildings) buildings.style = buildingStyle(underground, hideByStyle)
      }
      const plotsLayer = addPlots(viewer, plots, groundHeight)
      const tower = addTower(viewer, groundHeight, initial.current.notRegisteredText)
      tower.setRegistered(initial.current.towerRegistered)
      const networks = addNetworks(viewer, underground, plots, groundHeight)
      const ground = addGroundFade(viewer)
      const under = initial.current.view === 'under'
      tower.setUnderground(under)
      networks.setVisible(under)
      plotsLayer.setUnderground(under)
      ground.setUnderground(under)
      setBuildingsUnderground(under)

      // Resolves once the visible tiles have loaded, or after a few seconds if one never finishes.
      const whenLoaded = () =>
        new Promise<void>((resolve) => {
          const done = () => {
            remove()
            clearTimeout(timer)
            resolve()
          }
          const timer = setTimeout(done, 15000)
          const remove = scene.postRender.addEventListener(() => {
            if (scene.globe.tilesLoaded && (!buildings || buildings.tilesLoaded)) done()
          })
        })

      plotsLayer.showLabels(initial.current.view === '2d')
      await goTo(viewer, initial.current.view, groundHeight, false)
      if (cancelled || viewer.isDestroyed()) return
      setHandles({ viewer, groundHeight, plotsLayer, tower, networks, ground, setBuildingsUnderground, whenLoaded })

      // Hover and click. Hover picks at most once per frame.
      viewer.screenSpaceEventHandler.removeInputAction(ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
      const input = new ScreenSpaceEventHandler(scene.canvas)
      let pending: { x: number; y: number } | null = null
      let frame = 0
      input.setInputAction((e: ScreenSpaceEventHandler.MotionEvent) => {
        pending = { x: e.endPosition.x, y: e.endPosition.y }
        if (frame) return
        frame = requestAnimationFrame(() => {
          frame = 0
          if (!pending || viewer.isDestroyed()) return
          const picked = scene.pick(new Cartesian2(pending.x, pending.y))
          const hit = tower.identify(picked)
          const line = networks.identify(picked)
          const space = hit && 'space' in hit ? hit.space : line
          tower.setHovered(space)
          networks.setHovered(line)
          const clickable = !!hit || !!plotsLayer.identify(picked)
          scene.canvas.style.cursor = clickable ? 'pointer' : ''
          onHoverRef.current?.(space ? { space, x: pending.x, y: pending.y } : null)
        })
      }, ScreenSpaceEventType.MOUSE_MOVE)
      input.setInputAction((e: ScreenSpaceEventHandler.PositionedEvent) => {
        const picked = scene.pick(e.position)
        const hit = tower.identify(picked)
        if (hit && 'space' in hit) return onPickRef.current?.({ space: hit.space })
        const line = networks.identify(picked)
        if (line) return onPickRef.current?.({ space: line })
        if (hit && 'towerMass' in hit) return onPickRef.current?.({ plot: towerPlot.cts })
        const cts = plotsLayer.identify(picked)
        onPickRef.current?.(cts ? { plot: cts } : null)
      }, ScreenSpaceEventType.LEFT_CLICK)
      cleanupInput = () => {
        cancelAnimationFrame(frame)
        input.destroy()
        tower.destroy()
        networks.destroy()
        ground.destroy()
      }
      await whenLoaded()
      if (cancelled) return
      if (document.body.dataset.mapStatus !== 'error') report('ready')
      document.body.dataset.mapView = initial.current.view
    })()

    return () => {
      cancelled = true
      cleanupInput?.()
      setHandles(null)
      viewer.destroy()
      delete document.body.dataset.mapStatus
      delete document.body.dataset.mapView
    }
  }, [])

  // Tower state follows the demo (registered or not).
  useEffect(() => {
    handles?.tower.setRegistered(towerRegistered)
  }, [handles, towerRegistered])

  useEffect(() => {
    handles?.tower.setSelected(selectedCode)
    handles?.networks.setSelected(selectedCode)
  }, [handles, selectedCode])

  useEffect(() => {
    handles?.plotsLayer.setSelected(selectedPlot)
  }, [handles, selectedPlot])

  // Explode and slice. With nothing selected, the camera reframes: the whole exploded tower, or one
  // floor seen from above like a plan. With a space selected, the camera stays on it.
  const frameState = useRef({ exploded, slice, selectedCode, view })
  frameState.current = { exploded, slice, selectedCode, view }
  const reframe = (h: Handles) => {
    const { exploded: ex, slice: sl, selectedCode: sel, view: v } = frameState.current
    const tag = `${sl ?? 'all'}-${ex}`
    delete document.body.dataset.mapFrame
    const done = () => h.whenLoaded().then(() => (document.body.dataset.mapFrame = tag))
    if (sel || v === '2d') return void done()
    const sphere = sl ? h.tower.boundingSphereOfLevel(sl) : null
    ;(sphere ? lookDownOn(h.viewer, sphere) : goTo(h.viewer, v, h.groundHeight, true, ex)).then(done)
  }

  const firstSlice = useRef(true)
  useEffect(() => {
    if (!handles) return
    handles.tower.setSlice(slice)
    if (firstSlice.current) {
      firstSlice.current = false
      return
    }
    reframe(handles)
  }, [handles, slice])

  const firstExplode = useRef(true)
  useEffect(() => {
    if (!handles) return
    delete document.body.dataset.exploded
    handles.tower.setExploded(exploded, () => {
      document.body.dataset.exploded = String(exploded)
    })
    if (firstExplode.current) {
      firstExplode.current = false
      return
    }
    if (!frameState.current.slice) reframe(handles)
  }, [handles, exploded])

  useImperativeHandle(
    ref,
    () => ({
      flyToSpace(code: string) {
        if (!handles) return
        // An underground line is long; the underground view shows it best, under the tower and the plots.
        if (handles.networks.has(code)) {
          delete document.body.dataset.mapFocus
          goTo(handles.viewer, 'under', handles.groundHeight, true, frameState.current.exploded)
            .then(() => handles.whenLoaded())
            .then(() => (document.body.dataset.mapFocus = code))
          return
        }
        const sphere = handles.tower.boundingSphereOf(code)
        if (!sphere) return
        delete document.body.dataset.mapFocus
        const heading = handles.tower.viewHeadingOf(code) ?? CesiumMath.toRadians(40)
        // A basement space is looked at more steeply, down through the faded ground.
        const below = Cartographic.fromCartesian(sphere.center).height < handles.groundHeight
        handles.viewer.camera.flyToBoundingSphere(sphere, {
          offset: new HeadingPitchRange(heading, CesiumMath.toRadians(below ? -38 : -20), Math.max(below ? 70 : 72, sphere.radius * 4)),
          duration: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 1.6,
          complete: () => handles.whenLoaded().then(() => (document.body.dataset.mapFocus = code)),
        })
      },
    }),
    [handles],
  )

  // Label text follows the language.
  useEffect(() => {
    handles?.tower.setNotRegisteredText(notRegisteredText)
  }, [handles, notRegisteredText])

  // Camera glides between the parcel map and the 3D views.
  const shownView = useRef(initial.current.view)
  useEffect(() => {
    if (!handles || shownView.current === view) return
    shownView.current = view
    let stale = false
    delete document.body.dataset.mapView
    handles.plotsLayer.showLabels(view === '2d')
    const under = view === 'under'
    handles.ground.setUnderground(under)
    handles.tower.setUnderground(under)
    handles.networks.setVisible(under)
    handles.plotsLayer.setUnderground(under)
    handles.setBuildingsUnderground(under)
    goTo(handles.viewer, view, handles.groundHeight, true, frameState.current.exploded)
      .then(() => handles.whenLoaded())
      .then(() => {
        if (!stale) document.body.dataset.mapView = view
      })
    return () => {
      stale = true
    }
  }, [handles, view])

  return <div ref={containerRef} className={s.map} />
}

/**
 * Cuts away the real OpenStreetMap building on the tower plot, so Tower 1 stands in its place.
 * Returns false when clipping is not supported and the building has to be hidden by style instead.
 */
function hideRealBuildingOnTowerPlot(viewer: Viewer, buildings: Cesium3DTileset): boolean {
  if (ClippingPolygonCollection.isSupported(viewer.scene)) {
    buildings.clippingPolygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions: Cartesian3.fromDegreesArray(towerPlot.polygon.flat()) })],
    })
    return true
  }
  buildings.style = buildingStyle(false, true)
  return false
}

/**
 * Soft off-white study-model buildings. In the underground view the buildings standing on the faded
 * ground are hidden, so nothing stands on thin air; the rest of the city stays as it is.
 */
function buildingStyle(underground: boolean, hideTowerPlotBuilding: boolean) {
  const conditions: string[] = []
  if (hideTowerPlotBuilding && towerPlot.osmBuildingId) conditions.push(`\${elementId} !== ${towerPlot.osmBuildingId}`)
  if (underground) {
    const [w, s, e, n] = fadedArea()
    const lon = "${feature['cesium#longitude']}"
    const lat = "${feature['cesium#latitude']}"
    conditions.push(`(${lon} < ${w} || ${lon} > ${e} || ${lat} < ${s} || ${lat} > ${n})`)
  }
  return new Cesium3DTileStyle({
    color: `color('${COLOURS.contextBuildings}')`,
    ...(conditions.length ? { show: conditions.join(' && ') } : {}),
  })
}

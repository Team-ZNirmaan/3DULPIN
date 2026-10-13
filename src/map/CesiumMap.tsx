import { useEffect, useRef, useState } from 'react'
import {
  Cartesian3,
  Cartographic,
  Cesium3DTileStyle,
  ClippingPolygon,
  ClippingPolygonCollection,
  createOsmBuildingsAsync,
  JulianDate,
  sampleTerrainMostDetailed,
  ShadowMode,
  Terrain,
  Viewer,
  type Cesium3DTileset,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { plots, towerPlot } from '../data'
import { SITE } from '../data/site'
import { COLOURS } from './palette'
import { goTo, type MapView } from './scene/camera'
import { addPlots } from './scene/plots'
import { addTower } from './scene/tower'
import s from './CesiumMap.module.css'

export type MapStatus = 'loading' | 'ready' | 'error'

type Props = {
  view: MapView
  towerRegistered: boolean
  notRegisteredText: string
  onStatus?: (status: MapStatus) => void
}

type Handles = {
  viewer: Viewer
  groundHeight: number
  plotsLayer: ReturnType<typeof addPlots>
  tower: ReturnType<typeof addTower>
  whenLoaded: () => Promise<void>
}

// A fixed late-afternoon sun (16:00 IST in mid March) for long, soft shadows across the street.
const SUN_TIME = JulianDate.fromIso8601('2026-03-15T10:30:00Z')

export function CesiumMap({ view, towerRegistered, notRegisteredText, onStatus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [handles, setHandles] = useState<Handles | null>(null)
  const initial = useRef({ view, notRegisteredText, towerRegistered })
  const onStatusRef = useRef(onStatus)
  useEffect(() => {
    onStatusRef.current = onStatus
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

    const buildingsReady = createOsmBuildingsAsync({
      style: new Cesium3DTileStyle({ color: `color('${COLOURS.contextBuildings}')` }),
    }).catch(() => undefined)

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

      if (buildings) {
        // Real buildings cast shadows on the ground but do not shadow themselves (no striped acne).
        buildings.shadows = ShadowMode.CAST_ONLY
        hideRealBuildingOnTowerPlot(viewer, buildings)
        scene.primitives.add(buildings)
      }
      const plotsLayer = addPlots(viewer, plots, groundHeight)
      const tower = addTower(viewer, groundHeight, initial.current.notRegisteredText)
      tower.setRegistered(initial.current.towerRegistered)

      const whenLoaded = () =>
        new Promise<void>((resolve) => {
          const remove = scene.postRender.addEventListener(() => {
            if (scene.globe.tilesLoaded && (!buildings || buildings.tilesLoaded)) {
              remove()
              resolve()
            }
          })
        })

      plotsLayer.showLabels(initial.current.view === '2d')
      await goTo(viewer, initial.current.view, groundHeight, false)
      if (cancelled || viewer.isDestroyed()) return
      setHandles({ viewer, groundHeight, plotsLayer, tower, whenLoaded })
      await whenLoaded()
      if (cancelled) return
      if (document.body.dataset.mapStatus !== 'error') report('ready')
      document.body.dataset.mapView = initial.current.view
    })()

    return () => {
      cancelled = true
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
    goTo(handles.viewer, view, handles.groundHeight, true)
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

/** Cuts away the real OpenStreetMap building on the tower plot, so Tower 1 stands in its place. */
function hideRealBuildingOnTowerPlot(viewer: Viewer, buildings: Cesium3DTileset) {
  if (ClippingPolygonCollection.isSupported(viewer.scene)) {
    buildings.clippingPolygons = new ClippingPolygonCollection({
      polygons: [new ClippingPolygon({ positions: Cartesian3.fromDegreesArray(towerPlot.polygon.flat()) })],
    })
  } else if (towerPlot.osmBuildingId) {
    buildings.style = new Cesium3DTileStyle({
      color: `color('${COLOURS.contextBuildings}')`,
      show: `\${elementId} !== ${towerPlot.osmBuildingId}`,
    })
  }
}

import { useEffect, useRef } from 'react'
import {
  Cartesian3,
  Cesium3DTileStyle,
  createOsmBuildingsAsync,
  Math as CesiumMath,
  Terrain,
  Viewer,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { CONTEXT_BUILDING_COLOUR, OPENING_HEIGHT_M, SHIVAJINAGAR } from './config'
import s from './CesiumMap.module.css'

export type MapStatus = 'loading' | 'ready' | 'error'

type Props = { onStatus?: (status: MapStatus) => void }

export function CesiumMap({ onStatus }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const onStatusRef = useRef(onStatus)
  useEffect(() => {
    onStatusRef.current = onStatus
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
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
    })

    const { scene } = viewer
    scene.globe.depthTestAgainstTerrain = true
    scene.postProcessStages.fxaa.enabled = true

    // Muted aerial imagery so the parcels and our tower stand out later.
    const base = viewer.imageryLayers.get(0)
    if (base) {
      base.saturation = 0.45
      base.brightness = 1.06
      base.contrast = 0.95
    }

    // Opening view: straight down over Shivajinagar, like a parcel map.
    viewer.camera.setView({
      destination: Cartesian3.fromDegrees(SHIVAJINAGAR.lon, SHIVAJINAGAR.lat, OPENING_HEIGHT_M),
      orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
    })

    terrain.errorEvent.addEventListener(() => report('error'))

    let removeReadyCheck: (() => void) | undefined
    createOsmBuildingsAsync({
      style: new Cesium3DTileStyle({ color: `color('${CONTEXT_BUILDING_COLOUR}')` }),
    })
      .then((buildings) => {
        if (viewer.isDestroyed()) return
        scene.primitives.add(buildings)
        removeReadyCheck = scene.postRender.addEventListener(() => {
          if (scene.globe.tilesLoaded && buildings.tilesLoaded) {
            report('ready')
            removeReadyCheck?.()
            removeReadyCheck = undefined
          }
        })
      })
      .catch(() => {
        if (!viewer.isDestroyed()) report('error')
      })

    return () => {
      removeReadyCheck?.()
      viewer.destroy()
      delete document.body.dataset.mapStatus
    }
  }, [])

  return <div ref={containerRef} className={s.map} />
}

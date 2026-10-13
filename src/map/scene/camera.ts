import { BoundingSphere, Cartesian3, HeadingPitchRange, Math as CesiumMath, type Viewer } from 'cesium'
import { plots } from '../../data'
import { localToLonLat } from '../../data/geo'

// The three camera positions of the map: the parcel map from above, the 3D view of Tower 1,
// and a closer 3D view.

export type MapView = '2d' | '3d' | 'close'
export const MAP_VIEWS: MapView[] = ['2d', '3d', 'close']

/** Seconds for a camera glide, or 0 when the user prefers reduced motion. */
const flightSeconds = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 1.8)

function plotsCentre(): [number, number] {
  const pts = plots.flatMap((p) => p.polygon)
  const lons = pts.map((p) => p[0])
  const lats = pts.map((p) => p[1])
  return [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2]
}

// Looking north-east, so the afternoon sun lights the two faces we see.
const TOWER_VIEW = { heading: 40, pitch: -24 }
const RANGE: Record<Exclude<MapView, '2d'>, number> = { '3d': 150, close: 84 }

export function goTo(viewer: Viewer, view: MapView, groundHeight: number, animate: boolean): Promise<void> {
  return new Promise((resolve) => {
    const duration = animate ? flightSeconds() : 0
    if (view === '2d') {
      const [lon, lat] = plotsCentre()
      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(lon, lat, groundHeight + 620),
        orientation: { heading: 0, pitch: -CesiumMath.PI_OVER_TWO, roll: 0 },
        duration,
        complete: resolve,
        cancel: resolve,
      })
      return
    }
    const [lon, lat] = localToLonLat([0, 0])
    const sphere = new BoundingSphere(Cartesian3.fromDegrees(lon, lat, groundHeight + 13), 22)
    viewer.camera.flyToBoundingSphere(sphere, {
      offset: new HeadingPitchRange(CesiumMath.toRadians(TOWER_VIEW.heading), CesiumMath.toRadians(TOWER_VIEW.pitch), RANGE[view]),
      duration,
      complete: resolve,
      cancel: resolve,
    })
  })
}

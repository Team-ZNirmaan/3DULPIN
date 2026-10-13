import { BoundingSphere, Cartesian3, HeadingPitchRange, Math as CesiumMath, type Viewer } from 'cesium'
import { plots } from '../../data'
import { localToLonLat } from '../../data/geo'

// The camera positions of the map: the parcel map from above, the 3D view of Tower 1, a closer
// 3D view, and the underground view (tower, basements and the metro tunnels below, seen through
// the faded ground).

export type MapView = '2d' | '3d' | 'close' | 'under'
export const MAP_VIEWS: MapView[] = ['2d', '3d', 'close', 'under']

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
/** For each 3D view: the height of the point looked at (metres above the ground floor), the pitch and the distance. */
const FRAME: Record<Exclude<MapView, '2d'>, { z: number; radius: number; pitch: number; range: number }> = {
  '3d': { z: 13, radius: 22, pitch: TOWER_VIEW.pitch, range: 150 },
  close: { z: 13, radius: 22, pitch: TOWER_VIEW.pitch, range: 84 },
  // From the tower roof down to the metro tunnels, about 60 m tall, seen from above the faded ground.
  under: { z: -8, radius: 32, pitch: -22, range: 190 },
}

/** Looks down on one floor at an angle, so its flats read like a floor plan. */
export function lookDownOn(viewer: Viewer, sphere: BoundingSphere): Promise<void> {
  return new Promise((resolve) => {
    viewer.camera.flyToBoundingSphere(sphere, {
      offset: new HeadingPitchRange(CesiumMath.toRadians(TOWER_VIEW.heading), CesiumMath.toRadians(-55), Math.max(95, sphere.radius * 5)),
      duration: flightSeconds(),
      complete: resolve,
      cancel: resolve,
    })
  })
}

/** Glides to a view. With exploded floors the tower is taller, so the 3D views pull back to fit it. */
export function goTo(viewer: Viewer, view: MapView, groundHeight: number, animate: boolean, exploded = false): Promise<void> {
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
    const f = FRAME[view]
    const z = exploded ? (view === 'under' ? f.z : f.z * 2) : f.z
    const sphere = new BoundingSphere(Cartesian3.fromDegrees(lon, lat, groundHeight + z), f.radius * (exploded ? 1.5 : 1))
    viewer.camera.flyToBoundingSphere(sphere, {
      offset: new HeadingPitchRange(CesiumMath.toRadians(TOWER_VIEW.heading), CesiumMath.toRadians(f.pitch), f.range * (exploded ? 1.35 : 1)),
      duration,
      complete: resolve,
      cancel: resolve,
    })
  })
}

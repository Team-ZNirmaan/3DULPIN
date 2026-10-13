import { Color, Rectangle, type Viewer } from 'cesium'
import { plots } from '../../data'

// The underground view fades the ground around the site so the basements, the metro tunnels and the
// water main show through it, and lets the camera go below the surface.

/** Ground opacity in the underground view. */
const FADED = 0.3
const FADE_MS = 600
/** How far past the plots the ground fades, in degrees (about 130 m). */
const MARGIN = 0.0012
/**
 * Seen through the faded ground. Below the faded area the camera looks at the inside of the far side of
 * the globe, which Cesium paints with its "underground colour" (black by default); a light soil colour
 * makes the ground fade to pale instead of dark.
 */
const SOIL = Color.fromCssColorString('#ddd4c4')

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** The area where the ground fades, as [west, south, east, north] in degrees. */
export function fadedArea(): [number, number, number, number] {
  const lons = plots.flatMap((p) => p.polygon.map((q) => q[0]))
  const lats = plots.flatMap((p) => p.polygon.map((q) => q[1]))
  return [Math.min(...lons) - MARGIN, Math.min(...lats) - MARGIN, Math.max(...lons) + MARGIN, Math.max(...lats) + MARGIN]
}

export function addGroundFade(viewer: Viewer) {
  const { scene } = viewer
  const { globe } = scene
  globe.translucency.rectangle = Rectangle.fromDegrees(...fadedArea())

  const original = { colour: globe.undergroundColor?.clone(), byDistance: globe.undergroundColorAlphaByDistance?.clone() }
  let alpha = 1
  let frame = 0
  const apply = () => {
    const solid = alpha > 0.999
    globe.translucency.enabled = !solid
    globe.translucency.frontFaceAlpha = alpha
    globe.translucency.backFaceAlpha = 0
    globe.undergroundColor = solid ? original.colour! : SOIL
    globe.undergroundColorAlphaByDistance = solid ? original.byDistance! : undefined!
    // Tile skirts hang below the surface to hide seams; through faded ground they would show as walls.
    globe.showSkirts = solid
    scene.requestRender()
  }

  return {
    setUnderground(underground: boolean) {
      scene.screenSpaceCameraController.enableCollisionDetection = !underground
      cancelAnimationFrame(frame)
      const [from, to] = [alpha, underground ? FADED : 1]
      if (reducedMotion() || from === to) {
        alpha = to
        apply()
        return
      }
      const start = performance.now()
      const step = (now: number) => {
        // The first frame's timestamp can be a little earlier than `start`; Cesium rejects alpha above 1.
        const t = Math.max(0, Math.min(1, (now - start) / FADE_MS))
        alpha = from + (to - from) * t
        apply()
        if (t < 1) frame = requestAnimationFrame(step)
      }
      frame = requestAnimationFrame(step)
    },
    destroy() {
      cancelAnimationFrame(frame)
    },
  }
}

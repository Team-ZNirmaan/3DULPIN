import {
  Cartesian2,
  Cartesian3,
  ClassificationType,
  Color,
  ColorGeometryInstanceAttribute,
  CornerType,
  GeometryInstance,
  GroundPolylineGeometry,
  GroundPolylinePrimitive,
  PerInstanceColorAppearance,
  PolylineColorAppearance,
  PolylineVolumeGeometry,
  Primitive,
  PrimitiveCollection,
  type Viewer,
} from 'cesium'
import type { Plot, UndergroundAsset } from '../../data'
import { enuToLonLat, lonLatToEnu } from '../../data/geo'
import { rightOfUserHatch, type XY } from '../../lib/hatch'
import { COLOURS, token } from '../palette'

// Underground lines (metro tunnels, water main) as 3D-ULPIN spaces, and the hatched "right of user"
// strips on the plots above the metro.
//
//  - tubes: one round tube per line at its real depth, shown only in the underground view
//  - hatch: diagonal lines draped on the ground over the part of each plot above a metro tube,
//    shown in every view, because the restriction applies at the surface too

const circle = (r: number, n = 40) => Array.from({ length: n }, (_, i) => new Cartesian2(r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)))

export type NetworksScene = ReturnType<typeof addNetworks>

export function addNetworks(viewer: Viewer, assets: UndergroundAsset[], plots: Plot[], groundHeight: number) {
  const { scene } = viewer
  const collection = scene.primitives.add(new PrimitiveCollection({ show: false })) as PrimitiveCollection
  // The plain type colour: the tubes are seen through the faded ground, which already softens them.
  const base = token('--type-g')
  const ink = COLOURS.ink()
  const axisHeight = (a: UndergroundAsset) => groundHeight - a.axisDepthM
  const enu = new Map(assets.map((a) => [a.code, a.line.map(lonLatToEnu) as XY[]]))

  const tubes = collection.add(
    new Primitive({
      geometryInstances: assets.map(
        (a) =>
          new GeometryInstance({
            id: a.code,
            geometry: new PolylineVolumeGeometry({
              polylinePositions: Cartesian3.fromDegreesArrayHeights(a.line.flatMap(([lon, lat]) => [lon, lat, axisHeight(a)])),
              shapePositions: circle(a.radiusM),
              cornerType: CornerType.ROUNDED,
              vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            }),
            attributes: { color: ColorGeometryInstanceAttribute.fromColor(base) },
          }),
      ),
      // Translucent, so the lines that are not selected can fade back.
      appearance: new PerInstanceColorAppearance({ translucent: true, closed: true }),
      asynchronous: false,
    }),
  ) as Primitive

  // Right of user hatching, draped on the terrain.
  const hatchColour = Color.lerp(token('--type-g'), ink, 0.35, new Color())
  const hatchLines: GeometryInstance[] = []
  for (const plot of plots) {
    const outline = plot.polygon.map(lonLatToEnu) as XY[]
    for (const r of plot.restrictions.filter((x) => x.kind === 'right-of-user')) {
      const asset = assets.find((a) => a.code === r.segmentCode)
      if (!asset) continue
      const { hatch, edges } = rightOfUserHatch(outline, enu.get(asset.code)!, asset.radiusM)
      for (const [list, width, alpha] of [
        [hatch, 1.5, 0.85],
        [edges, 2.5, 1],
      ] as const) {
        for (const [a, b] of list) {
          hatchLines.push(
            new GeometryInstance({
              geometry: new GroundPolylineGeometry({ positions: Cartesian3.fromDegreesArray([...enuToLonLat(a), ...enuToLonLat(b)]), width }),
              attributes: { color: ColorGeometryInstanceAttribute.fromColor(hatchColour.withAlpha(alpha)) },
            }),
          )
        }
      }
    }
  }
  const hatch = scene.groundPrimitives.add(
    new GroundPolylinePrimitive({
      geometryInstances: hatchLines,
      appearance: new PolylineColorAppearance(),
      // Over the terrain and the roofs of the real buildings, like the hatching on a paper parcel map.
      classificationType: ClassificationType.BOTH,
    }),
  ) as GroundPolylinePrimitive

  // ---------- state and styling ----------
  const state = { selected: null as string | null, hovered: null as string | null }
  let dirty = true
  function restyle(): boolean {
    if (!tubes.ready) return false
    for (const a of assets) {
      const isSelected = state.selected === a.code
      const isHovered = state.hovered === a.code && !isSelected
      const faded = state.selected !== null && !isSelected
      const colour = Color.lerp(base, Color.WHITE, isSelected ? 0.3 : isHovered ? 0.2 : 0, new Color()).withAlpha(faded && !isHovered ? 0.25 : 1)
      const attrs = tubes.getGeometryInstanceAttributes(a.code)
      attrs.color = ColorGeometryInstanceAttribute.toValue(colour, attrs.color)
    }
    return true
  }
  const removePreRender = scene.preRender.addEventListener(() => {
    if (dirty && restyle()) dirty = false
  })
  const markDirty = () => {
    dirty = true
    scene.requestRender()
  }
  const ours = new Set<unknown>([tubes])

  return {
    /** The tunnels and pipes are only drawn in the underground view. */
    setVisible(visible: boolean) {
      collection.show = visible
    },
    setSelected(code: string | null) {
      state.selected = assets.some((a) => a.code === code) ? code : null
      markDirty()
    },
    setHovered(code: string | null) {
      if (state.hovered === code) return
      state.hovered = code
      markDirty()
    },
    /** The 3D-ULPIN a pick result points at, if it is one of the underground lines. */
    identify(picked: unknown): string | null {
      const p = picked as { primitive?: unknown; id?: unknown } | undefined
      if (!collection.show || !p?.primitive || !ours.has(p.primitive) || typeof p.id !== 'string') return null
      return p.id
    },
    has: (code: string) => assets.some((a) => a.code === code),
    destroy() {
      removePreRender()
      scene.groundPrimitives.remove(hatch)
    },
  }
}

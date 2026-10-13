import {
  Cartesian2,
  Cartesian3,
  ClassificationType,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  CustomDataSource,
  LabelStyle,
  NearFarScalar,
  VerticalOrigin,
  type Viewer,
} from 'cesium'
import type { Plot } from '../../data'
import { COLOURS } from '../palette'

// Plot outlines and numbers draped on the terrain, like a Bhu-Naksha parcel map.

const ring = (p: Plot) => Cartesian3.fromDegreesArray([...p.polygon, p.polygon[0]].flat())

export function addPlots(viewer: Viewer, plots: Plot[], groundHeight: number) {
  const source = new CustomDataSource('plots')
  for (const p of plots) {
    source.entities.add({
      id: `plot-fill-${p.cts}`,
      polygon: {
        hierarchy: Cartesian3.fromDegreesArray(p.polygon.flat()),
        material: p.hasTower ? COLOURS.towerPlotFill() : COLOURS.plotFill(),
        classificationType: ClassificationType.TERRAIN,
      },
    })
    source.entities.add({
      id: `plot-line-${p.cts}`,
      polyline: {
        positions: ring(p),
        width: p.hasTower ? 3 : 2,
        clampToGround: true,
        classificationType: ClassificationType.TERRAIN,
        material: COLOURS.ink().withAlpha(0.85),
      },
    })
    const [lon, lat] = p.polygon.reduce((a, b) => [a[0] + b[0] / p.polygon.length, a[1] + b[1] / p.polygon.length], [0, 0])
    source.entities.add({
      id: `plot-label-${p.cts}`,
      position: Cartesian3.fromDegrees(lon, lat, groundHeight + 2),
      label: {
        text: `CTS ${p.cts}`,
        font: `600 13px Inter, 'Noto Sans Devanagari', sans-serif`,
        fillColor: COLOURS.ink(),
        outlineColor: Color.WHITE,
        outlineWidth: 0,
        style: LabelStyle.FILL,
        showBackground: true,
        backgroundColor: Color.WHITE.withAlpha(0.88),
        backgroundPadding: new Cartesian2(7, 4),
        verticalOrigin: VerticalOrigin.CENTER,
        // Readable over the buildings in the parcel map, fading out when zoomed far away.
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        translucencyByDistance: new NearFarScalar(900, 1, 2600, 0),
        scaleByDistance: new NearFarScalar(200, 1.05, 2000, 0.8),
      },
    })
  }
  // Saffron outline for the selected plot, drawn over the others.
  const selected = source.entities.add({
    id: 'plot-selected',
    show: false,
    polyline: {
      positions: ring(plots[0]),
      width: 4,
      clampToGround: true,
      classificationType: ClassificationType.TERRAIN,
      material: COLOURS.accent(),
      zIndex: 2,
    },
  })
  viewer.dataSources.add(source)

  return {
    /** The CTS number a pick result points at, if it is one of our plots. */
    identify(picked: unknown): string | null {
      const id = ((picked as { id?: { id?: unknown } } | undefined)?.id?.id ?? '') as string
      const m = /^plot-(?:fill|line|label)-(.+)$/.exec(typeof id === 'string' ? id : '')
      return m ? m[1] : null
    },
    setSelected(cts: string | null) {
      const plot = plots.find((p) => p.cts === cts)
      selected.show = !!plot
      if (plot && selected.polyline) selected.polyline.positions = new ConstantProperty(ring(plot))
    },
    /** In the underground view the plot fills are thinner, so they do not wash over the basements below. */
    setUnderground(underground: boolean) {
      for (const p of plots) {
        const fill = source.entities.getById(`plot-fill-${p.cts}`)
        const colour = p.hasTower ? COLOURS.towerPlotFill() : COLOURS.plotFill()
        if (fill?.polygon) fill.polygon.material = new ColorMaterialProperty(underground ? colour.withAlpha(colour.alpha * 0.35) : colour)
      }
    },
    /** Plot numbers are shown in the parcel map and hidden in the 3D view, where the tower is the focus. */
    showLabels(show: boolean) {
      for (const p of plots) {
        const e = source.entities.getById(`plot-label-${p.cts}`)
        if (e) e.show = show
      }
    },
  }
}

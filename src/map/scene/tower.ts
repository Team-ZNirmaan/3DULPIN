import {
  Cartesian2,
  Cartesian3,
  Color,
  ConstantProperty,
  CustomDataSource,
  LabelStyle,
  ShadowMode,
  VerticalOrigin,
  type Viewer,
} from 'cesium'
import { spaces, type LocalXY, type Space } from '../../data'
import { localToLonLat } from '../../data/geo'
import { blockColour, COLOURS } from '../palette'

// Tower 1 in two states:
//  - not registered: one plain grey block standing in for the existing building
//  - registered: one coloured block per legal space (flat, bay, common area), with crisp edges
// Blocks cast shadows on the ground but do not shadow themselves, which avoids striped "shadow acne".
// Basements are kept in their own layer, shown only in the underground view (chunk 4).

/** A thin gap between stacked blocks reads as a floor slab line. */
const SLAB_GAP = 0.05
const ROOF = 27.6

const positionsOf = (footprint: LocalXY[]) => Cartesian3.fromDegreesArray(footprint.map(localToLonLat).flat())

export function addTower(viewer: Viewer, groundHeight: number, notRegisteredText: string) {
  const registered = new CustomDataSource('tower-registered')
  const basements = new CustomDataSource('tower-basements')
  const unregistered = new CustomDataSource('tower-unregistered')
  basements.show = false

  // Registered: every leaf space as its own block.
  const leaves = spaces.filter((s) => s.type === 'U' || s.type === 'L' || s.type === 'P' || s.type === 'C')
  for (const s of leaves) {
    const openAir = s.kind === 'terrace'
    const target = s.zTop <= 0 ? basements : registered
    target.entities.add({
      id: s.code,
      polygon: {
        hierarchy: positionsOf(s.footprint),
        height: groundHeight + s.zBottom + SLAB_GAP,
        extrudedHeight: groundHeight + s.zTop - SLAB_GAP,
        material: openAir ? blockColour(s.type).withAlpha(0.22) : blockColour(s.type),
        outline: true,
        outlineColor: COLOURS.edge(),
        shadows: openAir ? ShadowMode.DISABLED : ShadowMode.CAST_ONLY,
      },
    })
  }

  // Not registered: the building as a plain mass, with the stair and lift heads on the roof.
  const building = spaces.find((s) => s.type === 'B') as Space
  const stair = spaces.find((s) => s.kind === 'staircase') as Space
  const lift = spaces.find((s) => s.kind === 'lift') as Space
  const grey = COLOURS.unregistered()
  unregistered.entities.add({
    id: 'tower-mass',
    polygon: {
      hierarchy: positionsOf(building.footprint),
      height: groundHeight,
      extrudedHeight: groundHeight + ROOF,
      material: grey,
      outline: true,
      outlineColor: COLOURS.edge(),
      shadows: ShadowMode.CAST_ONLY,
    },
  })
  for (const head of [stair, lift]) {
    unregistered.entities.add({
      polygon: {
        hierarchy: positionsOf(head.footprint),
        height: groundHeight + ROOF,
        extrudedHeight: groundHeight + head.zTop,
        material: grey,
        outline: true,
        outlineColor: COLOURS.edge(),
        shadows: ShadowMode.CAST_ONLY,
      },
    })
  }
  const [lon, lat] = localToLonLat([0, 0])
  const label = unregistered.entities.add({
    id: 'tower-not-registered',
    position: Cartesian3.fromDegrees(lon, lat, groundHeight + building.zTop + 7),
    label: {
      text: notRegisteredText,
      font: `600 14px Inter, 'Noto Sans Devanagari', sans-serif`,
      fillColor: COLOURS.ink(),
      style: LabelStyle.FILL,
      showBackground: true,
      backgroundColor: Color.WHITE.withAlpha(0.94),
      backgroundPadding: new Cartesian2(10, 6),
      verticalOrigin: VerticalOrigin.BOTTOM,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  })

  viewer.dataSources.add(registered)
  viewer.dataSources.add(basements)
  viewer.dataSources.add(unregistered)

  return {
    setRegistered(isRegistered: boolean) {
      registered.show = isRegistered
      unregistered.show = !isRegistered
    },
    setNotRegisteredText(text: string) {
      if (label.label) label.label.text = new ConstantProperty(text)
    },
  }
}

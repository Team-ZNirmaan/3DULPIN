import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Color,
  ColorGeometryInstanceAttribute,
  ConstantProperty,
  CustomDataSource,
  Ellipsoid,
  GeometryInstance,
  LabelStyle,
  Matrix4,
  PerInstanceColorAppearance,
  PolygonGeometry,
  PolygonHierarchy,
  PolygonOutlineGeometry,
  Primitive,
  PrimitiveCollection,
  ShadowMode,
  ShowGeometryInstanceAttribute,
  VerticalOrigin,
  type Viewer,
} from 'cesium'
import { spaces, type LocalXY, type Space } from '../../data'
import { localToEnu, localToLonLat } from '../../data/geo'
import { LEVELS } from '../../data/tower'
import type { Level } from '../../lib/ulpin'
import { blockColour, COLOURS } from '../palette'

// Tower 1 in two states:
//  - not registered: one plain grey mass standing in for the existing building (entities)
//  - registered: one coloured block per legal space, drawn as one set of primitives per floor, so that
//    exploding the floors is a matrix change per floor and restyling a block is an attribute update.
//
// Each floor has three primitives sharing one model matrix:
//  - solid: opaque blocks; they cast shadows on the ground (never on themselves, to avoid "shadow acne")
//  - ghost: the same blocks see-through, used for faded blocks and for the open-air terrace
//  - edges: outlines, dark by default and saffron for the selected space
// Stair and lift shafts span every floor, so they are cut into one segment per floor and move with it.

const SLAB_GAP = 0.05
/** Outlines sit this far outside their block. Cesium writes its own depth values, so lines drawn exactly
 *  on a face would flicker in and out of view. */
const EDGE_PAD = 0.05
const ROOF = 27.6
/** Extra metres between floors when exploded. */
const EXPLODE_GAP = 2.6
const EXPLODE_MS = 700

type Segment = { id: string; space: Space; level: Level; zBottom: number; zTop: number; openAir: boolean }
type FloorPrims = { level: Level; order: number; solid: Primitive; ghost: Primitive; edges: Primitive; segments: Segment[] }

const positionsOf = (footprint: LocalXY[]) => Cartesian3.fromDegreesArray(footprint.map(localToLonLat).flat())

/** A footprint grown outwards by `pad` metres, with mitred corners (works for concave shapes too). */
function grow(footprint: LocalXY[], pad: number): LocalXY[] {
  const pts = footprint.filter((p, i) => i === 0 || p[0] !== footprint[i - 1][0] || p[1] !== footprint[i - 1][1])
  if (pts.length > 2 && pts[0][0] === pts.at(-1)![0] && pts[0][1] === pts.at(-1)![1]) pts.pop()
  const n = pts.length
  const area = pts.reduce((a, [x1, y1], i) => a + x1 * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * y1, 0)
  const sign = area > 0 ? 1 : -1
  const normal = (a: LocalXY, b: LocalXY): LocalXY => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    return [(sign * dy) / len, (-sign * dx) / len]
  }
  return pts.map((p, i) => {
    const n1 = normal(pts[(i - 1 + n) % n], p)
    const n2 = normal(p, pts[(i + 1) % n])
    const k = pad / (1 + n1[0] * n2[0] + n1[1] * n2[1])
    return [p[0] + (n1[0] + n2[0]) * k, p[1] + (n1[1] + n2[1]) * k]
  })
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

function segmentsOf(space: Space): Segment[] {
  const openAir = space.kind === 'terrace'
  if (space.level !== 'XX') return [{ id: space.code, space, level: space.level, zBottom: space.zBottom, zTop: space.zTop, openAir }]
  return LEVELS.flatMap((l) => {
    const zBottom = Math.max(space.zBottom, l.bottom)
    const zTop = Math.min(space.zTop, l.top)
    return zTop - zBottom > 0.01 ? [{ id: `${space.code}@${l.level}`, space, level: l.level, zBottom, zTop, openAir }] : []
  })
}

export type TowerScene = ReturnType<typeof addTower>

export function addTower(viewer: Viewer, groundHeight: number, notRegisteredText: string) {
  const { scene } = viewer
  const collection = scene.primitives.add(new PrimitiveCollection()) as PrimitiveCollection
  const leaves = spaces.filter((s) => s.type === 'U' || s.type === 'L' || s.type === 'P' || s.type === 'C')
  const segments = leaves.flatMap(segmentsOf)
  const baseColour = new Map(leaves.map((s) => [s.code, blockColour(s.type)]))
  const [lon, lat] = localToLonLat([0, 0])
  const up = Ellipsoid.WGS84.geodeticSurfaceNormal(Cartesian3.fromDegrees(lon, lat, groundHeight), new Cartesian3())

  const instance = (seg: Segment, outline: boolean) => {
    const pad = outline ? EDGE_PAD : 0
    const common = {
      polygonHierarchy: new PolygonHierarchy(positionsOf(outline ? grow(seg.space.footprint, pad) : seg.space.footprint)),
      height: groundHeight + seg.zBottom + SLAB_GAP - pad / 2,
      extrudedHeight: groundHeight + seg.zTop - SLAB_GAP + pad / 2,
    }
    return new GeometryInstance({
      id: seg.id,
      geometry: outline ? new PolygonOutlineGeometry(common) : new PolygonGeometry({ ...common, vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT }),
      attributes: {
        color: ColorGeometryInstanceAttribute.fromColor(outline ? COLOURS.edge() : baseColour.get(seg.space.code)!),
        show: new ShowGeometryInstanceAttribute(true),
      },
    })
  }

  const floors: FloorPrims[] = LEVELS.map((l) => {
    const segs = segments.filter((s) => s.level === l.level)
    const prims: FloorPrims = {
      level: l.level,
      order: l.order,
      segments: segs,
      solid: new Primitive({
        geometryInstances: segs.filter((s) => !s.openAir).map((s) => instance(s, false)),
        appearance: new PerInstanceColorAppearance({ translucent: false, closed: true }),
        shadows: ShadowMode.CAST_ONLY,
        asynchronous: false,
      }),
      ghost: new Primitive({
        geometryInstances: segs.map((s) => instance(s, false)),
        appearance: new PerInstanceColorAppearance({ translucent: true, closed: true }),
        shadows: ShadowMode.DISABLED,
        asynchronous: false,
      }),
      edges: new Primitive({
        geometryInstances: segs.map((s) => instance(s, true)),
        appearance: new PerInstanceColorAppearance({ flat: true, translucent: true, renderState: { lineWidth: 1 } }),
        shadows: ShadowMode.DISABLED,
        asynchronous: false,
      }),
    }
    collection.add(prims.solid)
    collection.add(prims.ghost)
    collection.add(prims.edges)
    return prims
  })
  const ours = new Set<unknown>(floors.flatMap((f) => [f.solid, f.ghost, f.edges]))

  // ---------- not registered: grey mass and label ----------
  const unregistered = new CustomDataSource('tower-unregistered')
  const building = spaces.find((s) => s.type === 'B') as Space
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
  for (const head of spaces.filter((s) => s.kind === 'staircase' || s.kind === 'lift')) {
    unregistered.entities.add({
      id: `tower-mass-${head.kind}`,
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
  viewer.dataSources.add(unregistered)

  // ---------- state ----------
  const state = {
    registered: true,
    underground: false,
    selected: null as string | null,
    hovered: null as string | null,
    slice: null as Level | null,
    explode: 0, // 0 = together, 1 = fully exploded
  }
  let dirty = true

  function applyVisibility() {
    for (const f of floors) {
      const visible = state.registered && (f.order >= 0 || state.underground)
      f.solid.show = visible
      f.ghost.show = visible
      f.edges.show = visible
    }
    unregistered.show = !state.registered
  }

  function applyExplode() {
    for (const f of floors) {
      const offset = f.order * EXPLODE_GAP * state.explode
      const m = Matrix4.fromTranslation(Cartesian3.multiplyByScalar(up, offset, new Cartesian3()))
      f.solid.modelMatrix = m
      f.ghost.modelMatrix = m
      f.edges.modelMatrix = m
    }
  }

  function restyle(): boolean {
    if (!floors.every((f) => f.solid.ready && f.ghost.ready && f.edges.ready)) return false
    const accent = COLOURS.accent()
    const edge = COLOURS.edge()
    const ink = COLOURS.ink()
    for (const f of floors) {
      for (const seg of f.segments) {
        const code = seg.space.code
        const base = baseColour.get(code)!
        const sliceFaded = state.slice !== null && seg.level !== state.slice
        const faded = sliceFaded || (state.selected !== null && state.selected !== code)
        const isSelected = state.selected === code
        const isHovered = state.hovered === code && !isSelected
        let solidShow = false
        let ghostShow = true
        let ghostColour = base.withAlpha(0.22)
        let edgeColour: Color
        if (faded) {
          ghostColour = base.withAlpha(isHovered ? 0.35 : sliceFaded ? 0.035 : 0.06)
          edgeColour = ink.withAlpha(isHovered ? 0.4 : sliceFaded ? 0.04 : 0.09)
        } else if (seg.openAir) {
          ghostColour = base.withAlpha(isSelected ? 0.5 : isHovered ? 0.36 : 0.22)
          edgeColour = isSelected ? accent : edge
        } else {
          solidShow = true
          ghostShow = false
          edgeColour = isSelected ? accent : isHovered ? ink.withAlpha(0.9) : edge
        }
        if (!seg.openAir) {
          const a = f.solid.getGeometryInstanceAttributes(seg.id)
          a.show = ShowGeometryInstanceAttribute.toValue(solidShow, a.show)
          if (solidShow) a.color = ColorGeometryInstanceAttribute.toValue(Color.lerp(base, Color.WHITE, isSelected ? 0.3 : isHovered ? 0.2 : 0, new Color()), a.color)
        }
        const g = f.ghost.getGeometryInstanceAttributes(seg.id)
        g.show = ShowGeometryInstanceAttribute.toValue(ghostShow, g.show)
        g.color = ColorGeometryInstanceAttribute.toValue(ghostColour, g.color)
        const e = f.edges.getGeometryInstanceAttributes(seg.id)
        e.color = ColorGeometryInstanceAttribute.toValue(edgeColour, e.color)
      }
    }
    return true
  }

  // Attributes can only be written once the primitives are ready, so restyling runs before the next frame.
  const removePreRender = scene.preRender.addEventListener(() => {
    if (dirty && restyle()) dirty = false
  })
  const markDirty = () => {
    dirty = true
    scene.requestRender()
  }

  let animation = 0
  function animateExplode(target: number, onDone?: () => void) {
    cancelAnimationFrame(animation)
    const from = state.explode
    if (reducedMotion() || from === target) {
      state.explode = target
      applyExplode()
      onDone?.()
      return
    }
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.max(0, Math.min(1, (now - start) / EXPLODE_MS))
      state.explode = from + (target - from) * ease(t)
      applyExplode()
      scene.requestRender()
      if (t < 1) animation = requestAnimationFrame(step)
      else onDone?.()
    }
    animation = requestAnimationFrame(step)
  }

  applyVisibility()

  return {
    setRegistered(registered: boolean) {
      state.registered = registered
      applyVisibility()
    },
    setUnderground(underground: boolean) {
      state.underground = underground
      applyVisibility()
    },
    setSelected(code: string | null) {
      state.selected = code
      markDirty()
    },
    setHovered(code: string | null) {
      if (state.hovered === code) return
      state.hovered = code
      markDirty()
    },
    setSlice(level: Level | null) {
      state.slice = level
      markDirty()
    },
    setExploded(exploded: boolean, onDone?: () => void) {
      animateExplode(exploded ? 1 : 0, onDone)
    },
    setNotRegisteredText(text: string) {
      if (label.label) label.label.text = new ConstantProperty(text)
    },
    /** What a pick result points at: a space code, the unregistered tower mass, or nothing of ours. */
    identify(picked: unknown): { space: string } | { towerMass: true } | null {
      const p = picked as { primitive?: unknown; id?: unknown } | undefined
      if (p?.primitive && ours.has(p.primitive) && typeof p.id === 'string') return { space: p.id.split('@')[0] }
      const entityId = (p?.id as { id?: string } | undefined)?.id
      if (typeof entityId === 'string' && entityId.startsWith('tower-mass')) return { towerMass: true }
      return null
    },
    /**
     * The compass heading (radians) to look at a space from its own outer side, so it is never
     * hidden behind other blocks. Spaces at the centre (corridors, stair, lift) use the default view.
     */
    viewHeadingOf(code: string): number | null {
      const space = leaves.find((s) => s.code === code)
      if (!space) return null
      const cx = space.footprint.reduce((a, p) => a + p[0], 0) / space.footprint.length
      const cy = space.footprint.reduce((a, p) => a + p[1], 0) / space.footprint.length
      if (Math.hypot(cx, cy) < 4) return null
      const [e, n] = localToEnu([cx, cy])
      return Math.atan2(-e, -n)
    },
    /** Where one floor is now (including the explode offset). */
    boundingSphereOfLevel(level: Level): BoundingSphere | null {
      const floor = floors.find((f) => f.level === level)
      if (!floor || !floor.segments.length) return null
      const lift = floor.order * EXPLODE_GAP * state.explode
      const l = LEVELS.find((x) => x.level === level)!
      const plate = spaces.find((s) => s.type === 'B')!.footprint
      const points = plate.flatMap((p) => {
        const [plon, plat] = localToLonLat(p)
        return [l.bottom, l.top].map((z) => Cartesian3.fromDegrees(plon, plat, groundHeight + z + lift))
      })
      return BoundingSphere.fromPoints(points)
    },
    /** Where a space is now (including the explode offset), for flying the camera to it. */
    boundingSphereOf(code: string): BoundingSphere | null {
      const segs = segments.filter((s) => s.space.code === code)
      if (!segs.length) return null
      const points = segs.flatMap((seg) => {
        const floor = floors.find((f) => f.level === seg.level)!
        const lift = floor.order * EXPLODE_GAP * state.explode
        return seg.space.footprint.flatMap((p) => {
          const [plon, plat] = localToLonLat(p)
          return [groundHeight + seg.zBottom + lift, groundHeight + seg.zTop + lift].map((h) => Cartesian3.fromDegrees(plon, plat, h))
        })
      })
      return BoundingSphere.fromPoints(points)
    },
    destroy() {
      cancelAnimationFrame(animation)
      removePreRender()
    },
  }
}

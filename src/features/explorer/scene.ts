import {
  BoundingSphere,
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  ColorMaterialProperty,
  ConstantProperty,
  DirectionalLight,
  DistanceDisplayCondition,
  Entity,
  HeadingPitchRange,
  HorizontalOrigin,
  LabelStyle,
  Math as CMath,
  Matrix4,
  NearFarScalar,
  Rectangle,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  SingleTileImageryProvider,
  Transforms,
  VerticalOrigin,
  Viewer,
  defined,
} from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'
import { CLASS_COLOR, SEVERITY_COLOR, STATUS_COLOR, TIER_COLOR, classOf } from '@/domain/display'
import { ringCentroid, toLocal, toLonLat } from '@/domain/geo'
import type { Parcel, Severity, SpatialUnit, ValidationIssue } from '@/domain/types'
import type { ColorMode, LayerState, LevelMode } from '@/store/explorer'
import { BASEMAP_EXTENT_M, drawBasemap } from './basemap'

export interface StyleState {
  colorMode: ColorMode
  levelMode: LevelMode
  level: string
  layers: LayerState
  underground: boolean
  selectedCode?: string
  issueByCode: Map<string, Severity>
}

export interface PickInfo {
  code?: string
  point?: { lon: number; lat: number; z: number }
}

export interface HoverInfo {
  code: string
  label: string
  x: number
  y: number
}

interface Handlers {
  onPick: (info: PickInfo) => void
  onHover: (info: HoverInfo | null) => void
}

type Kind = 'pilot' | 'context' | 'underground' | 'elevated'

interface UnitEntry {
  unit: SpatialUnit
  entity: Entity
  kind: Kind
  extras: Entity[]
}

const flat = (ring: [number, number][]) => ring.slice(0, -1).flatMap(([lon, lat]) => [lon, lat])

const LEVEL_ORDER = ['B2', 'B1', '00', '01', '02', '03', '04', '05', 'RF']

function circleShape(radius: number, n = 20) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2
    return new Cartesian2(Math.cos(a) * radius, Math.sin(a) * radius)
  })
}

export class ExplorerScene {
  readonly viewer: Viewer
  private units = new Map<string, UnitEntry>()
  private parcelEntities: Entity[] = []
  private labelEntities: Entity[] = []
  private issueEntities: Entity[] = []
  private handler: ScreenSpaceEventHandler
  private queryMode = false
  private pilotCenter = Cartesian3.fromDegrees(0, 0)
  private lastHover = 0

  constructor(container: HTMLElement, private handlers: Handlers) {
    this.viewer = new Viewer(container, {
      baseLayer: false,
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
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
    })
    const { scene } = this.viewer
    scene.globe.baseColor = Color.fromCssColorString('#dfe3e8')
    scene.globe.showGroundAtmosphere = false
    scene.globe.depthTestAgainstTerrain = true
    scene.fog.enabled = false
    scene.pickTranslucentDepth = true
    scene.screenSpaceCameraController.enableCollisionDetection = false
    scene.screenSpaceCameraController.minimumZoomDistance = 5
    scene.screenSpaceCameraController.maximumZoomDistance = 4000
    scene.globe.translucency.frontFaceAlphaByDistance = new NearFarScalar(60, 0.25, 1500, 0.6)
    scene.globe.translucency.backFaceAlpha = 0
    scene.backgroundColor = Color.fromCssColorString('#cfd5dd')
    scene.globe.undergroundColor = Color.fromCssColorString('#cfd5dd')

    const sw = toLonLat(-BASEMAP_EXTENT_M, -BASEMAP_EXTENT_M)
    const ne = toLonLat(BASEMAP_EXTENT_M, BASEMAP_EXTENT_M)
    void SingleTileImageryProvider.fromUrl(drawBasemap(), { rectangle: Rectangle.fromDegrees(sw[0], sw[1], ne[0], ne[1]) }).then((p) => {
      this.viewer.imageryLayers.addImageryProvider(p)
      scene.requestRender()
    })

    this.handler = new ScreenSpaceEventHandler(scene.canvas)
    this.handler.setInputAction((e: { position: Cartesian2 }) => this.handleClick(e.position), ScreenSpaceEventType.LEFT_CLICK)
    this.handler.setInputAction((e: { endPosition: Cartesian2 }) => this.handleMove(e.endPosition), ScreenSpaceEventType.MOUSE_MOVE)
  }

  setLight() {
    const enu = Transforms.eastNorthUpToFixedFrame(this.pilotCenter)
    const dir = Matrix4.multiplyByPointAsVector(enu, new Cartesian3(-0.45, 0.55, -0.7), new Cartesian3())
    this.viewer.scene.light = new DirectionalLight({ direction: Cartesian3.normalize(dir, dir), intensity: 2.2 })
  }

  build(units: SpatialUnit[], parcels: Parcel[], issues: ValidationIssue[]) {
    const { entities } = this.viewer
    entities.removeAll()
    this.units.clear()
    this.parcelEntities = []
    this.labelEntities = []
    this.issueEntities = []

    for (const p of parcels) {
      const e = entities.add({
        id: `parcel:${p.id}`,
        polygon: {
          hierarchy: Cartesian3.fromDegreesArray(flat(p.ring)),
          height: 0.03,
          material: p.isPilot ? Color.fromCssColorString('#fdf3e6').withAlpha(0.95) : Color.WHITE.withAlpha(0.55),
          outline: true,
          outlineColor: p.isPilot ? Color.fromCssColorString('#E07B00') : Color.fromCssColorString('#98A2B3'),
        },
      })
      this.parcelEntities.push(e)
      const [lon, lat] = ringCentroid(p.ring)
      const [lx, ly] = toLocal([lon, lat])
      const [llon, llat] = toLonLat(lx, ly - 22)
      this.labelEntities.push(
        entities.add({
          id: `label:${p.id}`,
          position: Cartesian3.fromDegrees(llon, llat, 0.5),
          label: {
            text: p.label,
            font: '600 12px "Noto Sans", sans-serif',
            fillColor: Color.fromCssColorString(p.isPilot ? '#C26A00' : '#475467'),
            outlineColor: Color.WHITE,
            outlineWidth: 3,
            style: LabelStyle.FILL_AND_OUTLINE,
            horizontalOrigin: HorizontalOrigin.CENTER,
            verticalOrigin: VerticalOrigin.CENTER,
            distanceDisplayCondition: new DistanceDisplayCondition(0, 650),
            disableDepthTestDistance: 0,
          },
        }),
      )
    }

    for (const u of units) {
      if (u.type === 'S') continue
      if (u.type === 'B' && u.buildingId === 'BLD-7') {
        this.pilotCenter = Cartesian3.fromDegrees(...ringCentroid(u.ring), 8)
        continue
      }
      const kind: Kind = u.type === 'G' ? 'underground' : u.type === 'A' ? 'elevated' : u.buildingId === 'BLD-7' ? 'pilot' : 'context'
      const extras: Entity[] = []
      let entity: Entity
      if (u.infra) {
        const [a, b] = u.infra.path
        const mid = (u.zMin + u.zMax) / 2
        if (u.type === 'G') {
          entity = entities.add({
            id: u.code,
            polylineVolume: {
              positions: Cartesian3.fromDegreesArrayHeights([a[0], a[1], mid, b[0], b[1], mid]),
              shape: circleShape((u.zMax - u.zMin) / 2),
              material: Color.WHITE,
            },
          })
        } else {
          entity = entities.add({
            id: u.code,
            corridor: {
              positions: Cartesian3.fromDegreesArray([a[0], a[1], b[0], b[1]]),
              width: u.infra.widthM,
              height: u.zMin,
              extrudedHeight: u.zMax,
              material: Color.WHITE,
              outline: true,
              outlineColor: Color.WHITE.withAlpha(0.6),
            },
          })
          const [ax, ay] = toLocal(a)
          const [bx] = toLocal(b)
          for (let x = ax + 12; x < bx; x += 28) {
            const [plon, plat] = toLonLat(x, ay)
            extras.push(
              entities.add({
                id: `pier:${u.code}:${x}`,
                position: Cartesian3.fromDegrees(plon, plat, u.zMin / 2),
                cylinder: { length: u.zMin, topRadius: 0.9, bottomRadius: 1.1, material: Color.fromCssColorString('#b8c1cf') },
              }),
            )
          }
        }
        extras.push(
          entities.add({
            id: `zone:${u.code}`,
            corridor: {
              positions: Cartesian3.fromDegreesArray([a[0], a[1], b[0], b[1]]),
              width: u.infra.widthM + 2 * u.infra.protectionM,
              height: u.infra.protectionZMin,
              extrudedHeight: u.infra.protectionZMax,
              material: Color.fromCssColorString('#F04438').withAlpha(0.08),
              outline: true,
              outlineColor: Color.fromCssColorString('#F04438').withAlpha(0.45),
            },
          }),
        )
      } else {
        const inset = kind === 'pilot' ? 0.04 : 0
        entity = entities.add({
          id: u.code,
          polygon: {
            hierarchy: Cartesian3.fromDegreesArray(flat(u.ring)),
            height: u.zMin + inset,
            extrudedHeight: u.zMax - inset,
            material: Color.WHITE,
            outline: true,
            outlineColor: Color.WHITE.withAlpha(0.7),
          },
        })
      }
      this.units.set(u.code, { unit: u, entity, kind, extras })
    }

    for (const i of issues) {
      this.issueEntities.push(
        entities.add({
          id: `issue:${i.id}`,
          position: Cartesian3.fromDegrees(i.focus.lon, i.focus.lat, i.focus.height),
          point: {
            pixelSize: 13,
            color: Color.fromCssColorString(SEVERITY_COLOR[i.severity]),
            outlineColor: Color.WHITE,
            outlineWidth: 2.5,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
          label: {
            text: i.id.replace('ISS-', '#'),
            font: '700 11px "Noto Sans", sans-serif',
            fillColor: Color.WHITE,
            showBackground: true,
            backgroundColor: Color.fromCssColorString(SEVERITY_COLOR[i.severity]),
            backgroundPadding: new Cartesian2(5, 3),
            pixelOffset: new Cartesian2(0, -18),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        }),
      )
    }
    this.setLight()
    this.viewer.scene.requestRender()
  }

  private baseColor(u: SpatialUnit, s: StyleState): Color {
    if (s.colorMode === 'class') return Color.fromCssColorString(CLASS_COLOR[classOf(u)])
    if (s.colorMode === 'tier') return Color.fromCssColorString(TIER_COLOR[u.tier])
    if (s.colorMode === 'status') return Color.fromCssColorString(STATUS_COLOR[u.status])
    const sev = s.issueByCode.get(u.code)
    return sev ? Color.fromCssColorString(SEVERITY_COLOR[sev]) : Color.fromCssColorString('#C8CED8')
  }

  private levelVisible(u: SpatialUnit, s: StyleState): boolean {
    if (s.levelMode === 'all' || !u.level) return true
    const a = LEVEL_ORDER.indexOf(u.level)
    const b = LEVEL_ORDER.indexOf(s.level)
    return s.levelMode === 'only' ? a === b : a <= b
  }

  applyStyle(s: StyleState) {
    for (const { unit: u, entity, kind, extras } of this.units.values()) {
      const layerOn =
        kind === 'pilot' ? s.layers.pilot : kind === 'context' ? s.layers.context : kind === 'underground' ? s.layers.underground : s.layers.elevated
      const selected = s.selectedCode === u.code
      const inLevel = kind !== 'pilot' || this.levelVisible(u, s)
      const underground = kind === 'underground' || u.zMax <= 0
      entity.show = layerOn && (!underground || s.underground || kind === 'pilot')

      let color = kind === 'context' && s.colorMode === 'class' ? Color.fromCssColorString('#D3D8E0') : this.baseColor(u, s)
      let alpha = kind === 'context' ? 1 : u.type === 'C' ? 0.5 : kind === 'underground' ? 0.95 : 0.88
      if (s.underground && kind === 'context') alpha = 0.3
      if (s.underground && kind === 'pilot' && u.zMin >= 0) alpha = Math.min(alpha, 0.16)
      if (!inLevel) alpha = 0.05
      if (selected) {
        color = Color.fromCssColorString('#E07B00')
        alpha = 0.97
      }
      const mat = new ColorMaterialProperty(color.withAlpha(alpha))
      const outline = new ConstantProperty(
        selected ? Color.WHITE : kind === 'context' ? Color.fromCssColorString('#98A2B3').withAlpha(0.8) : Color.WHITE.withAlpha(inLevel ? 0.75 : 0.08),
      )
      if (entity.polygon) {
        entity.polygon.material = mat
        entity.polygon.outlineColor = outline
      } else if (entity.corridor) {
        entity.corridor.material = mat
      } else if (entity.polylineVolume) {
        entity.polylineVolume.material = mat
      }
      for (const x of extras) {
        const isZone = typeof x.id === 'string' && x.id.startsWith('zone:')
        x.show = layerOn && (isZone ? s.underground || kind === 'elevated' : true) && (kind !== 'underground' || s.underground)
      }
    }
    for (const e of this.parcelEntities) e.show = s.layers.parcels
    for (const e of this.labelEntities) e.show = s.layers.labels && s.layers.parcels
    for (const e of this.issueEntities) e.show = s.layers.issues

    const globe = this.viewer.scene.globe
    globe.translucency.enabled = s.underground
    this.viewer.scene.requestRender()
  }

  setQueryMode(on: boolean) {
    this.queryMode = on
    this.viewer.container.querySelector('canvas')!.style.cursor = on ? 'crosshair' : 'default'
  }

  resetView(duration = 1.2) {
    this.viewer.camera.flyToBoundingSphere(new BoundingSphere(this.pilotCenter, 28), {
      offset: new HeadingPitchRange(CMath.toRadians(-38), CMath.toRadians(-20), 105),
      duration,
    })
  }

  undergroundView() {
    const c = Cartographic.fromCartesian(this.pilotCenter)
    const target = Cartesian3.fromRadians(c.longitude, c.latitude, -6)
    this.viewer.camera.flyToBoundingSphere(new BoundingSphere(target, 30), {
      offset: new HeadingPitchRange(CMath.toRadians(-50), CMath.toRadians(-30), 120),
      duration: 1.2,
    })
  }

  flyTo(focus: { lon: number; lat: number; height: number }) {
    this.viewer.camera.flyToBoundingSphere(new BoundingSphere(Cartesian3.fromDegrees(focus.lon, focus.lat, focus.height), 14), {
      offset: new HeadingPitchRange(CMath.toRadians(-30), CMath.toRadians(focus.height < 0 ? -40 : -22), focus.height < 0 ? 75 : 85),
      duration: 1.3,
    })
  }

  private codeFromPicked(picked: unknown): string | undefined {
    if (!defined(picked)) return undefined
    const id = (picked as { id?: Entity }).id
    if (!(id instanceof Entity)) return undefined
    const raw = String(id.id)
    if (raw.startsWith('zone:')) return raw.slice(5)
    if (raw.startsWith('pier:')) return raw.split(':')[1]
    if (raw.startsWith('issue:')) return raw
    if (raw.startsWith('parcel:') || raw.startsWith('label:')) return raw
    return raw
  }

  private handleClick(pos: Cartesian2) {
    const { scene } = this.viewer
    const picked = scene.pick(pos)
    const code = this.codeFromPicked(picked)
    if (!this.queryMode) {
      this.handlers.onPick({ code })
      return
    }
    let lon: number
    let lat: number
    let z: number
    const entry = code ? this.units.get(code) : undefined
    const hit = entry && scene.pickPositionSupported ? scene.pickPosition(pos) : undefined
    if (entry && hit) {
      const c = Cartographic.fromCartesian(hit)
      const [hx, hy] = toLocal([CMath.toDegrees(c.longitude), CMath.toDegrees(c.latitude)])
      const [cx, cy] = toLocal(ringCentroid(entry.unit.ring))
      const d = Math.hypot(cx - hx, cy - hy) || 1
      const step = Math.min(0.5, d)
      ;[lon, lat] = toLonLat(hx + ((cx - hx) / d) * step, hy + ((cy - hy) / d) * step)
      z = Math.min(entry.unit.zMax - 0.05, Math.max(entry.unit.zMin + 0.05, c.height))
    } else {
      const ground = this.viewer.camera.pickEllipsoid(pos, scene.globe.ellipsoid)
      if (!ground) return
      const c = Cartographic.fromCartesian(ground)
      lon = CMath.toDegrees(c.longitude)
      lat = CMath.toDegrees(c.latitude)
      z = 1.5
    }
    this.handlers.onPick({ point: { lon, lat, z: Math.round(z * 100) / 100 } })
  }

  private handleMove(pos: Cartesian2) {
    const now = performance.now()
    if (now - this.lastHover < 60) return
    this.lastHover = now
    const code = this.codeFromPicked(this.viewer.scene.pick(pos))
    const entry = code ? this.units.get(code) : undefined
    if (!entry) {
      this.handlers.onHover(null)
      return
    }
    this.handlers.onHover({ code: entry.unit.code, label: entry.unit.label, x: pos.x, y: pos.y })
  }

  showQueryMarker(point?: { lon: number; lat: number; z: number }) {
    const { entities } = this.viewer
    entities.removeById('query-marker')
    if (point) {
      entities.add({
        id: 'query-marker',
        position: Cartesian3.fromDegrees(point.lon, point.lat, point.z),
        point: { pixelSize: 12, color: Color.fromCssColorString('#E07B00'), outlineColor: Color.WHITE, outlineWidth: 3, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      })
    }
    this.viewer.scene.requestRender()
  }

  destroy() {
    this.handler.destroy()
    if (!this.viewer.isDestroyed()) this.viewer.destroy()
  }
}

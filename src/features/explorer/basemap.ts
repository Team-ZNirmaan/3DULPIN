import { mulberry32 } from '@/domain/prng'

export const BASEMAP_EXTENT_M = 520
const SIZE = 2048

type Rect = [number, number, number, number]

const ROADS: Rect[] = [
  [-BASEMAP_EXTENT_M, -49, BASEMAP_EXTENT_M, -31],
  [-112, 25, 152, 31],
  [-112, 81, 152, 87],
  [-112, -111, 152, -105],
  [-112, -BASEMAP_EXTENT_M, -100, BASEMAP_EXTENT_M],
  [140, -BASEMAP_EXTENT_M, 152, BASEMAP_EXTENT_M],
  [-BASEMAP_EXTENT_M, 200, BASEMAP_EXTENT_M, 212],
  [-BASEMAP_EXTENT_M, -250, BASEMAP_EXTENT_M, -240],
  [-330, -BASEMAP_EXTENT_M, -320, BASEMAP_EXTENT_M],
  [330, -BASEMAP_EXTENT_M, 342, BASEMAP_EXTENT_M],
]

/** Offline, synthetic site plan drawn on a canvas (no network tiles needed). */
export function drawBasemap(): string {
  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')!
  const E = BASEMAP_EXTENT_M
  const px = (x: number) => ((x + E) / (2 * E)) * SIZE
  const py = (y: number) => ((E - y) / (2 * E)) * SIZE
  const rect = ([x0, y0, x1, y1]: Rect, fill: string) => {
    ctx.fillStyle = fill
    ctx.fillRect(px(x0), py(y1), px(x1) - px(x0), py(y0) - py(y1))
  }

  ctx.fillStyle = '#e3e6ea'
  ctx.fillRect(0, 0, SIZE, SIZE)

  const rng = mulberry32(7)
  // Generic city blocks outside the surveyed ward.
  for (let bx = -E; bx < E; bx += 64) {
    for (let by = -E; by < E; by += 58) {
      const inWard = bx > -120 && bx < 160 && by > -120 && by < 95
      if (inWard) continue
      if (rng() < 0.12) {
        rect([bx + 3, by + 3, bx + 60, by + 54], '#d2e2cf')
        continue
      }
      rect([bx + 2, by + 2, bx + 62, by + 56], '#ebedf0')
      const n = 2 + Math.floor(rng() * 3)
      for (let i = 0; i < n; i++) {
        const w = 12 + rng() * 16
        const h = 10 + rng() * 16
        const x = bx + 5 + rng() * (54 - w)
        const y = by + 5 + rng() * (48 - h)
        rect([x, y, x + w, y + h], '#d5d9df')
      }
    }
  }

  // Ward plots background
  rect([-100, -105, 140, 81], '#eef0f3')
  rect([-60 + 120, 31, -20 + 120, 81], '#d6e7d3')

  for (const r of ROADS) rect(r, '#c9d0da')

  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  ctx.setLineDash([18, 16])
  ctx.beginPath()
  ctx.moveTo(px(-E), py(-40))
  ctx.lineTo(px(E), py(-40))
  ctx.stroke()
  ctx.setLineDash([])

  // Footpaths along the main road
  rect([-E, -31, E, -29.5], '#dde2e8')
  rect([-E, -50.5, E, -49], '#dde2e8')

  // Trees along the main road median-side
  ctx.fillStyle = '#a9c9a4'
  for (let x = -E + 10; x < E; x += 14) {
    ctx.beginPath()
    ctx.arc(px(x), py(-28.5), 5, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < 40; i++) {
    ctx.beginPath()
    ctx.arc(px(62 + rng() * 36), py(34 + rng() * 44), 4 + rng() * 5, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.fillStyle = '#7b8594'
  ctx.font = '600 22px "Noto Sans", sans-serif'
  ctx.fillText('MAIN ROAD', px(170), py(-36))
  ctx.fillText('MAIN ROAD', px(-420), py(-36))
  ctx.save()
  ctx.translate(px(-104), py(-160))
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('WEST LANE', 0, 0)
  ctx.restore()

  return canvas.toDataURL('image/png')
}

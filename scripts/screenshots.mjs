// Captures every screen at projector sizes, in English and Hindi, and reports console errors.
// Usage: npm run build && npm run shots   (writes PNGs to ./screenshots)
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PORT = 4173
const BASE = `http://localhost:${PORT}/`
const OUT = 'screenshots'
const SIZES = [
  { w: 1366, h: 768 },
  { w: 1920, h: 1080 },
]
const SHOTS = [
  // 3D Bhu-Naksha: parcel map, 3D view in both demo states, close-up, and Hindi
  { name: 'map-2d', route: '#/map', map: '2d', registered: true, langs: ['en'], sizes: SIZES },
  { name: 'map-3d', route: '#/map?view=3d', map: '3d', registered: true, langs: ['en'], sizes: SIZES },
  { name: 'map-3d-unregistered', route: '#/map?view=3d', map: '3d', registered: false, langs: ['en'], sizes: [SIZES[1]] },
  { name: 'map-close', route: '#/map?view=close', map: 'close', registered: true, langs: ['en'], sizes: [SIZES[1]] },
  { name: 'map-under', route: '#/map?view=under', map: 'under', registered: true, langs: ['en'], sizes: SIZES },
  { name: 'map-under-unregistered', route: '#/map?view=under', map: 'under', registered: false, langs: ['en'], sizes: [SIZES[1]] },
  { name: 'map-3d', route: '#/map?view=3d', map: '3d', registered: true, langs: ['hi'], sizes: [SIZES[0]] },
  // Other screens
  { name: 'search', route: '#/search', langs: ['en', 'hi'], sizes: [SIZES[0]] },
  { name: 'register', route: '#/register', langs: ['en'], sizes: [SIZES[0]] },
  { name: 'debug', route: '#/debug', langs: ['en'], sizes: [SIZES[1]], fullPage: true },
]

mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const stop = () => server.kill()

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('Preview server did not start')
}

const problems = []
try {
  await waitForServer()
  // WebGL (software) for the 3D map; a plain browser for everything else, since the software
  // renderer cannot capture pages taller than 8192 px.
  const glBrowser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  const plainBrowser = await chromium.launch()
  for (const shot of SHOTS) {
    for (const lang of shot.langs) {
      for (const size of shot.sizes) {
        const page = await (shot.map ? glBrowser : plainBrowser).newPage({ viewport: { width: size.w, height: size.h } })
        const label = `${shot.name}-${lang}-${size.w}`
        page.on('pageerror', (e) => problems.push(`${label} pageerror: ${e.message}`))
        page.on('console', (m) => m.type() === 'error' && problems.push(`${label} console: ${m.text()}`))
        await page.addInitScript(
          ([l, registered]) => {
            localStorage.setItem('znirmaan.lang', l)
            localStorage.setItem('znirmaan.demo.v1', JSON.stringify({ towerRegistered: registered }))
          },
          [lang, shot.registered ?? false],
        )
        // The map streams tiles continuously, so never wait for the network to go quiet there.
        await page.goto(BASE + shot.route, { waitUntil: shot.map ? 'load' : 'networkidle', timeout: 60000 })
        await page.evaluate(() => document.fonts.ready)
        if (shot.map) {
          await page
            .waitForFunction((v) => document.body.dataset.mapStatus === 'error' || document.body.dataset.mapView === v, shot.map, { timeout: 240000 })
            .catch(() => problems.push(`${label}: map did not finish loading within 240 s`))
          await page.waitForTimeout(1500)
          const { status, ground } = await page.evaluate(() => ({ status: document.body.dataset.mapStatus, ground: document.body.dataset.groundEllipsoidHeight }))
          console.log(`${label}: map ${status}, ground ${ground} m above the ellipsoid`)
          if (status !== 'ready') problems.push(`${label}: map status ${status}`)
        }
        if (shot.fullPage) {
          // The app scrolls inside <main>; for a full-page capture let the document scroll instead.
          await page.addStyleTag({ content: 'html, body, #root, #root > div { height: auto !important } main { overflow: visible !important }' })
          await page.waitForTimeout(300)
        }
        await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: !!shot.fullPage })
        console.log(`saved ${OUT}/${label}.png`)
        await page.close()
      }
    }
  }
  await glBrowser.close()
  await plainBrowser.close()
} finally {
  stop()
}

console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n${problems.join('\n')}` : '\nNo console errors, no problems.')
process.exit(problems.length ? 1 : 0)

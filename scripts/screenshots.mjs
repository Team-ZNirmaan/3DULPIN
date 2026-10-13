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
  { name: 'map', route: '#/map', map: true, langs: ['en', 'hi'], sizes: SIZES },
  { name: 'search', route: '#/search', langs: ['en', 'hi'], sizes: [SIZES[0]] },
  { name: 'register', route: '#/register', langs: ['en', 'hi'], sizes: [SIZES[0]] },
  { name: 'card', route: '#/card/XX00XX0000XXXX-U1050027', langs: ['en'], sizes: [SIZES[0]] },
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
  const browser = await chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
  })
  for (const shot of SHOTS) {
    for (const lang of shot.langs) {
      for (const size of shot.sizes) {
        const page = await browser.newPage({ viewport: { width: size.w, height: size.h } })
        const label = `${shot.name}-${lang}-${size.w}`
        page.on('pageerror', (e) => problems.push(`${label} pageerror: ${e.message}`))
        page.on('console', (m) => m.type() === 'error' && problems.push(`${label} console: ${m.text()}`))
        await page.addInitScript((l) => localStorage.setItem('znirmaan.lang', l), lang)
        await page.goto(BASE + shot.route, { waitUntil: 'networkidle' })
        await page.evaluate(() => document.fonts.ready)
        if (shot.map) {
          await page
            .waitForFunction(() => ['ready', 'error'].includes(document.body.dataset.mapStatus ?? ''), null, { timeout: 120000 })
            .catch(() => problems.push(`${label}: map did not finish loading within 120 s`))
          await page.waitForTimeout(1500)
          const status = await page.evaluate(() => document.body.dataset.mapStatus)
          console.log(`${label}: map status = ${status}`)
          if (status !== 'ready') problems.push(`${label}: map status ${status}`)
        }
        await page.screenshot({ path: `${OUT}/${label}.png` })
        console.log(`saved ${OUT}/${label}.png`)
        await page.close()
      }
    }
  }
  await browser.close()
} finally {
  stop()
}

console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n${problems.join('\n')}` : '\nNo console errors, no problems.')
process.exit(problems.length ? 1 : 0)

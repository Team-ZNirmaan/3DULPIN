// Smoke test: every route × 3 viewports, fails on console errors or any non-local network request.
// Usage: node scripts/smoke.mjs <baseUrl> <outDir> [--lang=hi] [--large]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const [baseUrl, outDir, ...flags] = process.argv.slice(2)
const lang = flags.find((f) => f.startsWith('--lang='))?.split('=')[1] ?? 'en'
const large = flags.includes('--large')
mkdirSync(outDir, { recursive: true })

const ROUTES = [
  '/',
  '/app/dashboard',
  '/app/explorer',
  '/app/pipeline',
  '/app/analysis',
  '/app/validation',
  '/app/verification',
  '/app/registry',
  '/app/deeds',
  '/app/audit',
  '/app/citizen',
  '/app/dig-check',
  '/app/collateral',
  '/app/exports',
  '/verify?p=BA1|x|y|z|00',
]
const VIEWPORTS = [
  [1366, 768],
  [1920, 1080],
  [390, 844],
]

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const local = new URL(baseUrl).host
let failures = 0
for (const [w, h] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } })
  await ctx.addInitScript(
    ([l, lg]) => {
      try {
        localStorage.setItem('bhu-aayam-session', JSON.stringify({ state: { role: 'presenter', lang: l, largeFont: lg, sidebarCollapsed: false }, version: 0 }))
      } catch {}
    },
    [lang, large],
  )
  const external = new Set()
  await ctx.route('**/*', (route) => {
    const u = new URL(route.request().url())
    if (u.protocol === 'data:' || u.protocol === 'blob:' || u.host === local) return route.continue()
    external.add(u.host)
    return route.abort()
  })
  for (const r of ROUTES) {
    const page = await ctx.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(`${baseUrl}/#${r}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(r.includes('explorer') ? 5000 : 900)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
    const name = `${lang}${large ? '-lg' : ''}_${w}x${h}_${r.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 30) || 'root'}.png`
    await page.screenshot({ path: `${outDir}/${name}` })
    const bad = errors.length > 0 || overflow
    if (bad) failures++
    console.log(`${bad ? 'FAIL' : 'ok  '} ${w}x${h} ${r}${overflow ? ' [horizontal overflow]' : ''}`)
    for (const e of errors) console.log(`       ${e.slice(0, 200)}`)
    await page.close()
  }
  if (external.size) {
    failures++
    console.log(`FAIL external requests at ${w}x${h}: ${[...external].join(', ')}`)
  }
  await ctx.close()
}
await browser.close()
console.log(failures ? `\n${failures} problem(s)` : '\nall routes clean, no external requests')
process.exit(failures ? 1 : 0)

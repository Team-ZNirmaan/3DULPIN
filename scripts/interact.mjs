// Drives the 3D Bhu-Naksha like a user and screenshots each step (chunk 3 review and regression check).
// Usage: npm run build && node scripts/interact.mjs   (writes PNGs to ./screenshots/interact-*.png)
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PORT = 4176
const BASE = `http://localhost:${PORT}/`
const OUT = 'screenshots'
// Flat 502 and allotted bay B2-12 in the demo data (see #/debug).
const FLAT_502 = 'SA86YW2236TSBX-U105002S'

mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })
const problems = []
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function open(browser, route, { registered = true, lang = 'en', size = { width: 1920, height: 1080 } } = {}) {
  const page = await browser.newPage({ viewport: size })
  page.on('pageerror', (e) => problems.push(`${route} pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && problems.push(`${route} console: ${m.text()}`))
  await page.addInitScript(
    ([l, r]) => {
      localStorage.setItem('znirmaan.lang', l)
      localStorage.setItem('znirmaan.demo.v1', JSON.stringify({ towerRegistered: r }))
    },
    [lang, registered],
  )
  await page.goto(BASE + route, { waitUntil: 'load', timeout: 60000 })
  await page.waitForFunction(() => ['ready', 'error'].includes(document.body.dataset.mapStatus ?? ''), null, { timeout: 240000 })
  return page
}
const shot = async (page, name) => {
  await wait(800)
  await page.screenshot({ path: `${OUT}/interact-${name}.png` })
  console.log(`saved ${OUT}/interact-${name}.png`)
}
const check = (ok, what) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`)
  if (!ok) problems.push(what)
}

try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) break
    } catch {
      /* not up yet */
    }
    await wait(250)
  }
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })

  // 1. A shared link to flat 502 opens in 3D, flies to it and selects it.
  let page = await open(browser, `#/map?code=${FLAT_502}`)
  await page.waitForFunction((c) => document.body.dataset.mapFocus === c, FLAT_502, { timeout: 240000 })
  check((await page.locator('#space-title').innerText()) === 'Flat 502', 'deep link selects Flat 502')
  check((await page.locator('#plot-title').innerText()) === 'CTS 1177', 'deep link opens the plot panel for CTS 1177')
  await shot(page, '1-flat-502')

  // 2. Explode the floors.
  await page.getByRole('button', { name: 'Explode floors' }).click()
  await page.waitForFunction(() => document.body.dataset.exploded === 'true', null, { timeout: 30000 })
  check((await page.getByRole('button', { name: 'Explode floors' }).getAttribute('aria-pressed')) === 'true', 'explode toggles on')
  await shot(page, '2-exploded')

  // 3. Slice to floor 5 (still exploded, flat 502 selected).
  await page.getByRole('button', { name: 'Floor 5' }).click()
  check((await page.getByRole('button', { name: 'Floor 5' }).getAttribute('aria-pressed')) === 'true', 'floor slicer selects floor 5')
  await shot(page, '3-floor-5')

  // 4. Back to all floors, floors together, then Escape clears the selection (the view stays in 3D).
  await page.getByRole('button', { name: 'All floors' }).click()
  await page.getByRole('button', { name: 'Explode floors' }).click()
  await page.waitForFunction(() => document.body.dataset.exploded === 'false', null, { timeout: 30000 })
  await page.keyboard.press('Escape')
  await wait(500)
  check((await page.locator('#space-title').count()) === 0, 'Escape clears the selection')
  check((await page.getByRole('button', { name: 'Explode floors' }).count()) === 1, 'clearing the selection keeps the 3D view')

  // 5. Nothing selected: exploding frames the whole tower, a floor is shown from above like a plan.
  const frame = (tag) => page.waitForFunction((t) => document.body.dataset.mapFrame === t, tag, { timeout: 60000 })
  await page.getByRole('button', { name: 'Explode floors' }).click()
  await frame('all-true')
  await page.waitForFunction(() => document.body.dataset.exploded === 'true', null, { timeout: 30000 })
  await shot(page, '4-tower-exploded')
  await page.getByRole('button', { name: 'Floor 5' }).click()
  await frame('05-true')
  await shot(page, '5-floor-5-plan')
  await page.getByRole('button', { name: 'All floors' }).click()
  await frame('all-true')
  await page.getByRole('button', { name: 'Explode floors' }).click()
  await frame('all-false')
  await page.waitForFunction(() => document.body.dataset.exploded === 'false', null, { timeout: 30000 })

  // 6. Hover a block in the middle of the tower: a tooltip names the space.
  const canvas = page.locator('canvas').first()
  const box = await canvas.boundingBox()
  let tipSeen = false
  for (const [fx, fy] of [[0.5, 0.5], [0.5, 0.45], [0.48, 0.55], [0.52, 0.4]]) {
    await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy)
    await wait(600)
    if ((await page.getByRole('tooltip').count()) > 0) {
      tipSeen = true
      break
    }
  }
  check(tipSeen, 'hovering a block shows its name')
  await shot(page, '6-hover')

  // 7. Click the hovered block: it becomes the selection.
  if (tipSeen) {
    const name = (await page.getByRole('tooltip').locator('b').innerText()).trim()
    await page.mouse.down()
    await page.mouse.up()
    await wait(700)
    check((await page.locator('#space-title').innerText()) === name, `clicking the block selects ${name}`)
    await shot(page, '7-clicked')
  }
  await page.close()

  // 8. A neighbouring plot over the metro, and the tower plot before registration.
  page = await open(browser, '#/map?plot=1181')
  check((await page.locator('#plot-title').innerText()) === 'CTS 1181', 'plot link opens CTS 1181')
  await shot(page, '8-plot-1181')
  await page.close()
  page = await open(browser, '#/map?plot=1177&view=3d', { registered: false })
  check((await page.getByRole('link', { name: 'Register this plot' }).count()) === 1, 'unregistered tower plot offers "Register this plot"')
  await shot(page, '9-plot-unregistered')
  await page.close()

  // 9. Hindi: the same flat link.
  page = await open(browser, `#/map?code=${FLAT_502}`, { lang: 'hi', size: { width: 1366, height: 768 } })
  await page.waitForFunction((c) => document.body.dataset.mapFocus === c, FLAT_502, { timeout: 240000 })
  await shot(page, '10-flat-502-hi')
  await page.close()

  await browser.close()
} finally {
  server.kill()
}

console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n${problems.join('\n')}` : '\nAll interaction checks passed, no console errors.')
process.exit(problems.length ? 1 : 0)

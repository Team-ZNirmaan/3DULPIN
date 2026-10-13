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
const shot = async (page, name, fullPage = false) => {
  await wait(800)
  await page.screenshot({ path: `${OUT}/interact-${name}.png`, fullPage })
  console.log(`saved ${OUT}/interact-${name}.png`)
}
/** A screen without the map: no waiting for the 3D city. */
async function openPage(browser, route, { registered = false, lang = 'en', size = { width: 1920, height: 1080 } } = {}) {
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
  return page
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

  // R. Register a building: plot, survey data, generate, codes; then the map, and Reset demo.
  let page = await openPage(browser, '#/register')
  check((await page.getByRole('radio', { name: /CTS 1181/ }).isDisabled()) === true, 'plots without building data cannot be picked')
  await page.getByRole('radio', { name: /CTS 1177/ }).check()
  await shot(page, 'r1-plot')
  await page.getByRole('button', { name: 'Continue' }).click()
  check((await page.getByRole('button', { name: 'Continue' }).isDisabled()) === true, 'Continue waits for all six data sources')
  await page.getByRole('button', { name: 'Use sample file: Drone imagery' }).click()
  await shot(page, 'r2-data-one')
  await page.getByRole('button', { name: 'Use all sample files' }).click()
  await shot(page, 'r2-data-all')
  await page.getByRole('button', { name: 'Continue' }).click()
  await shot(page, 'r3-ready')
  await page.getByRole('button', { name: 'Generate 3D-ULPINs' }).click()
  await wait(900)
  await page.screenshot({ path: `${OUT}/interact-r3-progress.png` })
  await page.locator('#result-title').waitFor({ timeout: 20000 })
  check((await page.locator('#result-title').innerText()) === '88 3D-ULPINs issued', 'Generate issues 88 3D-ULPINs')
  check((await page.locator('a[href^="#/map?code="]').count()) === 91, 'every issued code (and the 3 lines below the plot) is listed')
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('znirmaan.demo.v1')).towerRegistered === true), 'registering is kept in local storage')
  await shot(page, 'r4-codes', true)
  await page.getByRole('link', { name: 'View in 3D' }).click()
  await page.waitForFunction(() => document.body.dataset.mapView === '3d', null, { timeout: 240000 })
  check((await page.getByRole('heading', { name: '3D-ULPINs of the plot' }).count()) === 1, 'the map shows the new codes on CTS 1177')
  await shot(page, 'r5-map-after')
  await page.getByRole('link', { name: 'Register a building' }).click()
  check((await page.locator('#result-title').innerText()) === 'CTS 1177 already has 88 3D-ULPINs', 'Register shows the codes once the tower is registered')
  await page.getByRole('button', { name: 'Reset demo' }).click()
  check((await page.getByRole('radio', { name: /CTS 1177/ }).count()) === 1, 'Reset demo goes back to step 1')
  check(await page.evaluate(() => JSON.parse(localStorage.getItem('znirmaan.demo.v1')).towerRegistered === false), 'Reset demo is kept in local storage')
  await page.getByRole('link', { name: '3D Bhu-Naksha' }).click()
  await page.waitForFunction(() => document.body.dataset.mapStatus === 'ready', null, { timeout: 240000 })
  await page.getByRole('button', { name: /Tower 1 on CTS 1177/ }).click()
  await page.getByRole('link', { name: 'Register this plot' }).click()
  check((await page.getByRole('radio', { name: /CTS 1177/ }).isChecked()) === true, '"Register this plot" arrives with CTS 1177 picked')
  await page.close()

  // 1. A shared link to flat 502 opens in 3D, flies to it and selects it.
  page = await open(browser, `#/map?code=${FLAT_502}`)
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

  // 10. Underground: the tower, its basements and the metro tunnels below the faded ground.
  page = await open(browser, '#/map?view=under')
  await page.waitForFunction(() => document.body.dataset.mapView === 'under', null, { timeout: 120000 })
  check((await page.getByRole('button', { name: 'Basement 2' }).count()) === 1, 'underground view adds the basements to the floor picker')
  await shot(page, '11-underground')

  // 11. From a plot above the metro, open the tunnel: underground view, line panel, camera on the tunnel.
  await page.goto(BASE + '#/map?plot=1181', { waitUntil: 'load' })
  await page.waitForFunction(() => document.body.dataset.mapStatus === 'ready', null, { timeout: 240000 })
  check((await page.getByText('Hatched on the map').count()) === 1, 'plot above the metro explains the hatching')
  await page.getByRole('button', { name: /Metro tunnel, up line/ }).click()
  await page.waitForFunction(() => (document.body.dataset.mapFocus ?? '').includes('-G'), null, { timeout: 120000 })
  check((await page.locator('#space-title').innerText()) === 'Metro tunnel, up line', 'restriction opens the metro tunnel')
  check((await page.getByRole('button', { name: 'Underground', pressed: true }).count()) === 1, 'opening the tunnel switches to the underground view')
  await shot(page, '12-metro-up-line')
  await page.close()

  // 12. A flat's allotted parking bay is in the basement: the link goes underground to it.
  page = await open(browser, `#/map?code=${FLAT_502}`)
  await page.waitForFunction((c) => document.body.dataset.mapFocus === c, FLAT_502, { timeout: 240000 })
  await page.locator('section[aria-labelledby="space-title"]').getByRole('button', { name: /Allotted parking/ }).click()
  await page.waitForFunction((c) => !!document.body.dataset.mapFocus && document.body.dataset.mapFocus !== c, FLAT_502, { timeout: 120000 })
  check((await page.locator('#space-title').innerText()).startsWith('Allotted parking'), 'allotted parking link selects the bay')
  await shot(page, '13-parking-bay')
  await page.getByRole('button', { name: 'Basement 2' }).click()
  await page.waitForFunction(() => document.body.dataset.mapFrame === 'B2-false', null, { timeout: 60000 }).catch(() => {})
  await shot(page, '14-basement-2')
  await page.close()

  // 13. Hindi: the same flat link.
  page = await open(browser, `#/map?code=${FLAT_502}`, { lang: 'hi', size: { width: 1366, height: 768 } })
  await page.waitForFunction((c) => document.body.dataset.mapFocus === c, FLAT_502, { timeout: 240000 })
  await shot(page, '15-flat-502-hi')
  await page.close()

  await browser.close()
} finally {
  server.kill()
}

console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n${problems.join('\n')}` : '\nAll interaction checks passed, no console errors.')
process.exit(problems.length ? 1 : 0)

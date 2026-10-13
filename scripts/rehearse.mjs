// Runs the demo script end to end, once in English and once in Hindi, timing each step and saving a
// screenshot per step and a video of the whole run (chunk 7 rehearsal).
// Usage: npm run build && npm run rehearse   (writes to ./screenshots/rehearsal-*)
//
// Timings here come from a software-rendered test browser, which draws the 3D map far slower than a
// laptop's graphics card. They show where the waits are, not how long the real demo takes.
import { spawn } from 'node:child_process'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PORT = 4178
const BASE = `http://localhost:${PORT}/`
const OUT = 'screenshots'
const VIDEO_TMP = `${OUT}/.video`
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const LABELS = {
  en: {
    reset: 'Reset demo',
    continue: 'Continue',
    useAll: 'Use all sample files',
    generate: 'Generate 3D-ULPINs',
    viewIn3d: 'View in 3D',
    explode: 'Explode floors',
    floor5: 'Floor 5',
    allFloors: 'All floors',
    underground: 'Underground',
    view3d: '3D view',
    flat502: 'Flat 502',
    openCard: 'Open property card',
    search: 'Search land records',
    typo: 'A 3D-ULPIN with a typing mistake',
    otherLang: 'हिं',
  },
  hi: {
    reset: 'डेमो रीसेट करें',
    continue: 'आगे बढ़ें',
    useAll: 'सभी नमूना फ़ाइलें लगाएँ',
    generate: '3D-ULPIN जनरेट करें',
    viewIn3d: '3D में देखें',
    explode: 'तलों को अलग करें',
    floor5: 'तल 5',
    allFloors: 'सभी तल',
    underground: 'भूमिगत',
    view3d: '3D दृश्य',
    flat502: 'फ्लैट 502',
    openCard: 'संपत्ति कार्ड खोलें',
    search: 'भू-अभिलेख खोजें',
    typo: 'टाइपिंग की गलती वाला 3D-ULPIN',
    otherLang: 'EN',
  },
}

const problems = []
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore' })

async function rehearse(browser, lang) {
  const L = LABELS[lang]
  const size = { width: 1366, height: 768 }
  const context = await browser.newContext({ viewport: size, recordVideo: { dir: VIDEO_TMP, size } })
  const page = await context.newPage()
  page.on('pageerror', (e) => problems.push(`${lang} pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && problems.push(`${lang} console: ${m.text()}`))
  // Start where a presenter would: the tower already registered from the last run, in this language.
  await page.addInitScript((l) => {
    if (!sessionStorage.getItem('rehearsal')) {
      sessionStorage.setItem('rehearsal', '1')
      localStorage.setItem('znirmaan.lang', l)
      localStorage.setItem('znirmaan.demo.v1', JSON.stringify({ towerRegistered: true }))
    }
  }, lang)

  const steps = []
  const step = async (n, name, run) => {
    const start = Date.now()
    try {
      await run()
    } catch (e) {
      problems.push(`${lang} step ${n} (${name}): ${e.message.split('\n')[0]}`)
    }
    const seconds = (Date.now() - start) / 1000
    await wait(600)
    await page.screenshot({ path: `${OUT}/rehearsal-${lang}-${n}.png` })
    steps.push({ n, name, seconds })
    console.log(`${lang}  ${n}. ${name.padEnd(30)} ${seconds.toFixed(1)} s`)
  }
  const mapView = (v) => page.waitForFunction((x) => document.body.dataset.mapView === x, v, { timeout: 240000 })

  await page.goto(BASE + '#/register', { waitUntil: 'load' })
  await step(1, 'Reset demo', async () => {
    await page.getByRole('button', { name: L.reset }).click()
    await page.getByRole('radio', { name: /CTS 1177/ }).waitFor()
  })
  await step(2, 'Register a building', async () => {
    await page.getByRole('radio', { name: /CTS 1177/ }).check()
    await page.getByRole('button', { name: L.continue }).click()
    await page.getByRole('button', { name: L.useAll }).click()
    await page.getByRole('button', { name: L.continue }).click()
    await page.getByRole('button', { name: L.generate }).click()
    await page.locator('#result-title').waitFor({ timeout: 20000 })
  })
  await step(3, '3D view', async () => {
    await page.getByRole('link', { name: L.viewIn3d }).click()
    await mapView('3d')
  })
  await step(4, 'Explode floors and floor slicer', async () => {
    await page.getByRole('button', { name: L.explode }).click()
    await page.waitForFunction(() => document.body.dataset.exploded === 'true', null, { timeout: 30000 })
    await page.getByRole('button', { name: L.floor5 }).click()
    await page.waitForFunction(() => document.body.dataset.mapFrame === '05-true', null, { timeout: 60000 })
    await wait(800)
    await page.screenshot({ path: `${OUT}/rehearsal-${lang}-4b.png` })
    await page.getByRole('button', { name: L.allFloors }).click()
    await page.getByRole('button', { name: L.explode }).click()
    await page.waitForFunction(() => document.body.dataset.exploded === 'false', null, { timeout: 30000 })
  })
  await step(5, 'Underground view', async () => {
    await page.getByRole('button', { name: L.underground }).click()
    await mapView('under')
  })
  await step(6, 'Property card', async () => {
    await page.getByRole('button', { name: L.view3d }).click()
    await mapView('3d')
    await page.getByRole('button', { name: L.flat502, exact: true }).click()
    await page.waitForFunction(() => (document.body.dataset.mapFocus ?? '').includes('-U105002'), null, { timeout: 120000 })
    await page.getByRole('link', { name: L.openCard }).click()
    await page.locator('article').waitFor()
  })
  await step(7, 'Search with a typo', async () => {
    await page.getByRole('link', { name: L.search }).click()
    await page.getByRole('button', { name: L.typo }).click()
    await page.locator('[class*="wrong"]').first().waitFor()
  })
  await step(8, lang === 'en' ? 'Switch to Hindi' : 'Switch to English', async () => {
    await page.getByRole('button', { name: L.otherLang }).click()
    await wait(300)
  })

  await context.close()
  const video = readdirSync(VIDEO_TMP).find((f) => f.endsWith('.webm'))
  if (video) renameSync(`${VIDEO_TMP}/${video}`, `${OUT}/rehearsal-${lang}.webm`)
  return steps
}

try {
  mkdirSync(OUT, { recursive: true })
  rmSync(VIDEO_TMP, { recursive: true, force: true })
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE)).ok) break
    } catch {
      /* not up yet */
    }
    await wait(250)
  }
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const totals = {}
  for (const lang of ['en', 'hi']) {
    const steps = await rehearse(browser, lang)
    totals[lang] = steps.reduce((a, s) => a + s.seconds, 0)
  }
  await browser.close()
  rmSync(VIDEO_TMP, { recursive: true, force: true })
  console.log(`\nTotal: English ${totals.en.toFixed(0)} s, Hindi ${totals.hi.toFixed(0)} s (software rendering, see the note at the top)`)
} finally {
  server.kill()
}

console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n${problems.join('\n')}` : 'Every step ran, no console errors.')
process.exit(problems.length ? 1 : 0)

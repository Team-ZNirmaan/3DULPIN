// Scripted interaction checks. Usage: node scripts/interact.mjs <baseUrl> <outDir> <scenario> [--hi]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const [baseUrl, outDir, scenario = 'explorer', ...flags] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
if (flags.includes('--hi')) {
  await ctx.addInitScript(() => localStorage.setItem('bhu-aayam-p2-session', JSON.stringify({ state: { lang: 'hi' }, version: 0 })))
}
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${scenario}-${name}.png` })
  console.log(`shot ${scenario}-${name}`)
}
const wait = (ms) => page.waitForTimeout(ms)
const go = (route) => page.goto(`${baseUrl}/#${route}`, { waitUntil: 'networkidle' })

const scenarios = {
  async explorer() {
    await go('/app/explorer')
    await wait(5000)
    await page.mouse.click(720, 460)
    await wait(1500)
    await shot('selected')
    await page.getByRole('option', { name: '03' }).click()
    await wait(1500)
    await shot('floor-03')
    await page.getByRole('button', { name: /Underground/ }).click()
    await wait(3500)
    await shot('underground')
    await page.getByRole('button', { name: /View/ }).click()
    await wait(400)
    await shot('view-popover')
    await page.getByRole('button', { name: /Close/ }).first().click()
    await page.getByRole('button', { name: /Reset view/ }).click()
    await wait(2500)
    await page.getByRole('button', { name: /Point query/ }).click()
    await page.mouse.click(720, 420)
    await wait(2000)
    await shot('point-query')
  },
  async story() {
    await go('/')
    await page.getByRole('link', { name: /Enter the prototype/ }).click()
    await wait(800)
    await page.getByRole('button', { name: /Run pipeline/ }).click()
    await wait(15500)
    await shot('1-survey-done')
    await page.getByRole('tab', { name: /M2/ }).click()
    await wait(500)
    await shot('1-m2')
    await page.getByRole('link', { name: /Validate/ }).first().click()
    await wait(800)
    await page.getByRole('button', { name: /Record restriction/ }).click()
    await wait(600)
    await page.getByRole('button', { name: /Approve & register/ }).click()
    await wait(800)
    await shot('3-registered')
    await page.getByRole('link', { name: /3D-ULPIN/ }).first().click()
    await wait(700)
    await page.getByRole('button', { name: /Try a mistyped code/ }).click()
    await wait(300)
    await shot('4-typo')
    await page.getByRole('link', { name: /Property Card/ }).first().click()
    await wait(700)
    await page.getByRole('button', { name: 'Flat 402' }).click()
    await wait(1200)
    await shot('5-card')
  },
}

await scenarios[scenario]()
for (const e of errors) console.log(`  ${e}`)
await browser.close()
process.exit(errors.length ? 1 : 0)

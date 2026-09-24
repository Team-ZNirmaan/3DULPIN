// Scripted interaction checks. Usage: node scripts/interact.mjs <baseUrl> <outDir> <scenario>
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const [baseUrl, outDir, scenario = 'explorer'] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
const shot = async (name) => {
  await page.screenshot({ path: `${outDir}/${scenario}-${name}.png` })
  console.log(`shot ${scenario}-${name}`)
}
const wait = (ms) => page.waitForTimeout(ms)

const scenarios = {
  async explorer() {
    await page.goto(`${baseUrl}/#/app/explorer`, { waitUntil: 'networkidle' })
    await wait(5000)
    await page.mouse.click(790, 470)
    await wait(1500)
    await shot('click-tower')
    await page.getByRole('option', { name: /03/ }).click()
    await wait(1500)
    await shot('floor-03')
    await page.getByRole('button', { name: /Show underground/ }).click()
    await wait(3500)
    await shot('underground')
    await page.getByRole('button', { name: /Reset view/ }).click()
    await wait(2500)
    await page.getByRole('button', { name: /^All$/ }).click()
    await page.getByRole('button', { name: /Point query/ }).click()
    await page.mouse.click(790, 440)
    await wait(2000)
    await shot('point-query')
  },
  async pipeline() {
    await page.goto(`${baseUrl}/#/app/pipeline`, { waitUntil: 'networkidle' })
    await wait(800)
    await page.getByRole('button', { name: /Run pipeline/ }).click()
    await wait(8000)
    await shot('running')
    await page.getByText('Approved building plan').click()
    await wait(400)
    await page.mouse.wheel(0, 500)
    await wait(300)
    await shot('catalogue')
  },
  async analysis() {
    await page.goto(`${baseUrl}/#/app/analysis`, { waitUntil: 'networkidle' })
    await wait(800)
    await shot('m1')
    for (const tab of ['M2', 'M3', 'Volumes']) {
      await page.getByRole('tab', { name: new RegExp(tab) }).click()
      await wait(700)
      await shot(tab.toLowerCase())
    }
  },
  async validation() {
    await page.goto(`${baseUrl}/#/app/validation?issue=ISS-002`, { waitUntil: 'networkidle' })
    await wait(800)
    await shot('detail')
    await page.getByRole('button', { name: /Approve fix/ }).click()
    await wait(800)
    await shot('approved')
    await page.getByRole('button', { name: /Show in 3D/ }).first().click()
    await wait(6000)
    await shot('in-3d')
  },
  async registry() {
    await page.goto(`${baseUrl}/#/app/registry`, { waitUntil: 'networkidle' })
    await wait(800)
    await page.getByRole('button', { name: /Try a valid code/ }).click()
    await wait(300)
    await shot('valid')
    await page.getByRole('button', { name: /Try a mistyped code/ }).click()
    await wait(300)
    await shot('typo')
    await page.getByRole('button', { name: /Mint preview/ }).click()
    await wait(500)
    await shot('mint')
  },
  async deeds() {
    await page.goto(`${baseUrl}/#/app/deeds`, { waitUntil: 'networkidle' })
    await wait(600)
    await page.getByRole('button', { name: /Run OCR/ }).click()
    await wait(1900)
    await shot('extracted')
    await page.getByRole('button', { name: /Find matching unit/ }).click()
    await wait(1000)
    await shot('candidates')
    await page.getByRole('button', { name: /Confirm link/ }).click()
    await wait(1000)
    await shot('double-sale')
  },
  async citizen() {
    await page.goto(`${baseUrl}/#/app/citizen`, { waitUntil: 'networkidle' })
    await wait(600)
    await page.getByRole('button', { name: 'Flat 204' }).click()
    await wait(1000)
    await shot('card')
    await page.getByRole('button', { name: /Verify QR/ }).click()
    await wait(500)
    const payload = await page.locator('textarea').inputValue()
    await page.getByRole('button', { name: /^Verify$/ }).click()
    await wait(400)
    await shot('verify-ok')
    await page.getByRole('button', { name: /Tamper/ }).click()
    await page.getByRole('button', { name: /^Verify$/ }).click()
    await wait(400)
    await shot('verify-tampered')
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 390, height: 844 })
    await wait(500)
    await shot('card-mobile')
    await page.goto(`${baseUrl}/#/verify?p=${encodeURIComponent(payload)}`, { waitUntil: 'networkidle' })
    await wait(800)
    await shot('public-verify')
  },
  async guide() {
    await page.goto(`${baseUrl}/#/app/dashboard`, { waitUntil: 'networkidle' })
    await wait(1200)
    await shot('dashboard')
    await page.getByRole('button', { name: /Demo Guide/ }).click()
    await wait(4000)
    await shot('step1')
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('ArrowRight')
      await wait(900)
    }
    await wait(4500)
    await shot('step7')
  },
  async gates() {
    await page.goto(`${baseUrl}/#/app/validation?issue=ISS-001`, { waitUntil: 'networkidle' })
    await wait(700)
    await page.getByRole('button', { name: /Record restriction/ }).click()
    await wait(500)
    await page.goto(`${baseUrl}/#/app/verification`, { waitUntil: 'networkidle' })
    await wait(700)
    await shot('field')
    const b2 = page.locator('div.rounded-lg', { hasText: 'Parking bay B2-01' }).filter({ has: page.getByRole('button', { name: /^Pass$/ }) }).first()
    await b2.getByRole('button', { name: /^Pass$/ }).click()
    await wait(500)
    await page.getByRole('tab', { name: /Gate 2/ }).click()
    await wait(500)
    await shot('approval-ready')
    await page.getByRole('button', { name: /Approve & register/ }).first().click()
    await wait(800)
    await shot('approved')
  },
  async services() {
    await page.goto(`${baseUrl}/#/app/dig-check`, { waitUntil: 'networkidle' })
    await wait(500)
    await page.getByRole('button', { name: /Check underground/ }).click()
    await wait(900)
    await shot('dig-water')
    await page.getByRole('button', { name: /Basement excavation/ }).click()
    await page.getByRole('button', { name: /Check underground/ }).click()
    await wait(900)
    await shot('dig-basement')
    await page.goto(`${baseUrl}/#/app/collateral`, { waitUntil: 'networkidle' })
    await wait(400)
    await page.getByRole('button', { name: 'Flat 204' }).click()
    await wait(900)
    await shot('collateral')
    await page.goto(`${baseUrl}/#/app/audit`, { waitUntil: 'networkidle' })
    await wait(400)
    await page.getByRole('button', { name: /Tamper/ }).click()
    await page.getByRole('button', { name: /Verify chain/ }).click()
    await wait(700)
    await shot('audit-broken')
    await page.goto(`${baseUrl}/#/app/exports`, { waitUntil: 'networkidle' })
    await wait(400)
    await page.getByRole('button', { name: /Try/ }).first().click()
    await wait(900)
    await shot('exports')
  },
  async fullguide() {
    await page.goto(`${baseUrl}/#/`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: /Presenter/ }).click()
    await wait(800)
    await page.getByRole('button', { name: /Demo Guide/ }).click()
    await wait(3500)
    for (let i = 1; i < 11; i++) {
      await page.keyboard.press('ArrowRight')
      await wait(i === 6 ? 4500 : 1600)
      await shot(`step${i + 1}`)
    }
  },
}

await scenarios[scenario]()
for (const e of errors) console.log(`  ${e}`)
await browser.close()
process.exit(errors.length ? 1 : 0)

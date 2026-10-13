// Renders the architecture diagram (docs/architecture/architecture.html) to docs/images/architecture.png.
// Usage: npm run diagram
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'

const src = pathToFileURL(resolve('docs/architecture/architecture.html')).href
mkdirSync('docs/images', { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1680, height: 1200 }, deviceScaleFactor: 2 })
await page.goto(src)
await page.evaluate(() => document.fonts.ready)
// Arrows are drawn from the final layout, so draw them again once the fonts are in.
await page.reload()
await page.evaluate(() => document.fonts.ready)
await page.waitForFunction(() => document.body.dataset.ready === '1')
await page.locator('#diagram').screenshot({ path: 'docs/images/architecture.png' })
await browser.close()
console.log('saved docs/images/architecture.png')

// Usage: node scripts/shot.mjs <baseUrl> <outDir> <route[@WxH]> [...]
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const [baseUrl, outDir, ...routes] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
let failures = 0
for (const spec of routes) {
  const [route, size = '1440x900'] = spec.split('@')
  const [width, height] = size.split('x').map(Number)
  const page = await browser.newPage({ viewport: { width, height } })
  const errors = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  await page.goto(`${baseUrl}/#${route}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(Number(process.env.SHOT_WAIT ?? 1500))
  const name = `${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root'}_${width}x${height}.png`
  await page.screenshot({ path: `${outDir}/${name}` })
  console.log(`${errors.length ? 'WARN' : 'OK  '} ${route} ${size} -> ${name}`)
  for (const e of errors) console.log(`     ${e}`)
  if (errors.length) failures++
  await page.close()
}
await browser.close()
process.exit(failures ? 1 : 0)

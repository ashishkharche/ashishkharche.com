// Draws the chart builder's default chart to images with the page's own renderer, from the snapshot saved by
// scripts/lab-charts-snapshot.ts, for the page before scripts run and for link previews.
//
//   pnpm build && node scripts/lab-charts-poster.ts [site origin]     (default: serves dist/client itself)
//
// Writes public/lab/charts/poster.png (1800 x 1390, the default size) and public/assets/og/lab-charts.png (1200 x 630, the chart on its own
// background). Every proxy request is answered from the snapshot, so the images show exactly the saved data.
import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import type { Snapshot } from '../src/lib/charts/tdn.ts'

const out = new URL('../public/lab/charts/', import.meta.url).pathname
const snapshot = JSON.parse(await readFile(`${out}snapshot.json`, 'utf8')) as Snapshot
const port = 4199
const server = process.argv[2]
  ? null
  : spawn('node', ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) } })
const origin = process.argv[2] ?? `http://localhost:${port}`
await new Promise((resolve) => setTimeout(resolve, server ? 1500 : 0))

const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } })
  await page.route(/\/api\/tdn\/?\?/, (route) => {
    const url = new URL(route.request().url())
    const kept = snapshot.answers[`${url.pathname}${url.search}`]
    return kept
      ? route.fulfill({ json: kept.body, headers: { 'x-tdn-fetched-at': kept.fetchedAt } })
      : route.fulfill({ status: 503, json: { error: 'Not in the snapshot', code: 'not_configured' } })
  })
  await page.goto(`${origin}/lab/charts/?template=us-number-one`)
  await page.getByTestId('data-time').waitFor({ timeout: 60_000 })
  await page.waitForTimeout(1500)
  const dataUrl = await page
    .locator('canvas[role="img"]')
    .first()
    .evaluate((c) => (c as HTMLCanvasElement).toDataURL('image/png'))
  const png = Buffer.from(dataUrl.split(',')[1] ?? '', 'base64')
  await writeFile(`${out}poster.png`, await sharp(png).png({ compressionLevel: 9 }).toBuffer())
  const og = await sharp(png)
    .resize(1200, 630, { fit: 'contain', background: '#151515' })
    .png({ compressionLevel: 9 })
    .toBuffer()
  await writeFile(new URL('../public/assets/og/lab-charts.png', import.meta.url).pathname, og)
  const meta = await sharp(png).metadata()
  console.log(`Wrote poster.png (${meta.width} x ${meta.height}) and og.png (1200 x 630)`)
} finally {
  await browser.close()
  server?.kill()
}

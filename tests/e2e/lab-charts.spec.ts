import { readFile } from 'node:fs/promises'
import { type Download, type Page, expect, test } from '@playwright/test'

const templates = [
  'us-rank-countries',
  'android-permissions',
  'ai-apps-ios-android-sdks',
  'android-native-libs',
  'us-rating-countries',
]

async function pick(page: Page, id: string) {
  await page.locator(`input[type=radio][value="${id}"]`).check()
  await expect(page.locator(`canvas[data-rendered^="${id}:"]`)).toBeVisible()
}

async function download(page: Page, name: string): Promise<{ file: Download; bytes: Buffer }> {
  const [file] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name }).click()])
  return { file, bytes: await readFile((await file.path()) as string) }
}

function pngSize(bytes: Buffer) {
  expect(bytes.subarray(1, 4).toString('ascii')).toBe('PNG')
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

/** Share of pixels that differ by more than 40 in any channel between an image file and the preview canvas, both scaled down. */
async function differenceFromPreview(page: Page, bytes: Buffer, type: string): Promise<number> {
  return page.evaluate(
    async ({ base64, type }) => {
      const preview = document.querySelector<HTMLCanvasElement>('canvas[data-rendered]') as HTMLCanvasElement
      // The page's CSP allows data: images (not blob: or fetch of data:).
      const image = new Image()
      image.src = `data:${type};base64,${base64}`
      await image.decode()
      // Compared at up to 900 px wide to keep memory low.
      const k = Math.min(1, 900 / preview.width)
      const w = Math.round(preview.width * k)
      const h = Math.round(preview.height * k)
      const draw = (source: CanvasImageSource) => {
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
        ctx.drawImage(source, 0, 0, w, h)
        return ctx.getImageData(0, 0, w, h).data
      }
      const a = draw(image)
      const b = draw(preview)
      let differ = 0
      for (let i = 0; i < a.length; i += 4) {
        const d = (j: number) => Math.abs((a[i + j] ?? 0) - (b[i + j] ?? 0))
        if (d(0) > 40 || d(1) > 40 || d(2) > 40) differ++
      }
      return differ / (w * h)
    },
    { base64: bytes.toString('base64'), type },
  )
}

test.describe('chart builder', () => {
  test('renders every template without console errors', async ({ page }) => {
    const problems: string[] = []
    page.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text())
    })
    page.on('pageerror', (e) => problems.push(e.message))
    await page.goto('/lab/charts/')
    for (const id of templates) {
      await pick(page, id)
      await expect(page.getByRole('alert')).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled()
    }
    expect(problems).toEqual([])
  })

  test('opens a template from the address', async ({ page }) => {
    await page.goto('/lab/charts/?template=android-native-libs')
    await expect(page.locator('canvas[data-rendered^="android-native-libs:"]')).toBeVisible()
  })

  test('downloads a PNG at 2x that opens and matches the preview', async ({ page }) => {
    await page.goto('/lab/charts/')
    await pick(page, 'us-rank-countries')
    const twice = await download(page, 'Download PNG')
    expect(twice.file.suggestedFilename()).toMatch(/-3600x2780\.png$/)
    expect(pngSize(twice.bytes)).toEqual({ width: 3600, height: 2780 })
    expect(twice.bytes.length).toBeLessThan(5 * 1024 * 1024)
    expect(await differenceFromPreview(page, twice.bytes, 'image/png')).toBeLessThan(0.02)

    await page.getByLabel('16:9').check()
    await page.getByLabel('1x,').check()
    await expect(page.locator('canvas[data-rendered]')).toHaveAttribute('data-rendered', 'us-rank-countries:1920x1080')
    const wide = await download(page, 'Download PNG')
    expect(pngSize(wide.bytes)).toEqual({ width: 1920, height: 1080 })
    expect(await differenceFromPreview(page, wide.bytes, 'image/png')).toBeLessThan(0.02)
  })

  test('downloads an SVG that opens and matches the preview', async ({ page }) => {
    await page.goto('/lab/charts/')
    await pick(page, 'android-permissions')
    const svg = await download(page, 'Download SVG')
    expect(svg.file.suggestedFilename()).toMatch(/\.svg$/)
    const text = svg.bytes.toString('utf8')
    expect(text).toContain('<svg')
    expect(text).toContain('@font-face')
    expect(await differenceFromPreview(page, svg.bytes, 'image/svg+xml')).toBeLessThan(0.03)
  })

  test('blocks downloads while a data rule is broken', async ({ page }) => {
    await page.goto('/lab/charts/')
    await pick(page, 'us-rank-countries')
    await page.getByLabel('Line 1').fill('Data from somewhere')
    await expect(page.getByRole('alert')).toContainText('must start with "Source:"')
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Download SVG' })).toBeDisabled()
    await page.getByRole('button', { name: 'Reset template' }).click()
    await expect(page.getByRole('alert')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Download PNG' })).toBeEnabled()
  })

  test('is linked from the Projects page', async ({ page }) => {
    await page.goto('/projects/')
    await page.getByRole('link', { name: 'Chart builder' }).click()
    await expect(page).toHaveURL(/\/lab\/charts\/$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chart builder')
  })
})

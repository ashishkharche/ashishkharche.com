import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { mockLive } from './live-data'

test.describe('chart icons and labels on every template', () => {
  test.setTimeout(240_000)
  test('every template draws its verified icons, and Unknown never shows on the page or in an export', async ({
    page,
  }) => {
    const requested = await mockLive(page)
    const broken: string[] = []
    page.on('requestfailed', (r) => {
      if (r.resourceType() === 'image') broken.push(r.url())
    })
    await page.goto('/lab/charts/')
    const gallery = page.getByTestId('gallery')
    await expect(gallery.locator('input[value="us-rating-countries"]')).toHaveCount(1)
    const ids = await gallery
      .locator('input[type=radio]')
      .evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))
    expect(ids.length).toBeGreaterThanOrEqual(23)
    for (const id of ids) {
      await gallery.locator(`input[type=radio][value="${id}"]`).check()
      const canvas = page.locator(`canvas[data-rendered^="${id}:"]`)
      await expect(canvas, id).toBeVisible()
      const wanted = await canvas.getAttribute('data-icons-wanted')
      const drawn = await canvas.getAttribute('data-icons-drawn')
      expect(wanted, `${id}: icon count set`).not.toBeNull()
      expect(drawn, `${id}: verified icons drawn`).toBe(wanted)
      expect(await page.locator('body').innerText(), id).not.toMatch(/\bunknown\b/i)
      const [file] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Download SVG' }).click(),
      ])
      const svg = await readFile((await file.path()) as string, 'utf8')
      expect(svg.replace(/<image[^>]*>/g, ''), `${id} SVG`).not.toMatch(/\bunknown\b/i)
    }
    expect(broken).toEqual([])
    expect(requested.filter((r) => r.startsWith('EXTERNAL'))).toEqual([])
  })

  test('icons come from our own origin, and the page may not load images from anywhere else', async ({ page }) => {
    const requested = await mockLive(page)
    const icons: string[] = []
    page.on('request', (r) => {
      if (r.resourceType() === 'image') icons.push(new URL(r.url()).pathname)
    })
    await page.goto('/lab/charts/?template=most-sdks')
    await expect(page.locator('canvas[data-rendered^="most-sdks:"]')).toBeVisible()
    const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content')
    expect(csp).toContain("img-src 'self' data:;")
    expect(csp).not.toMatch(/mzstatic|googleusercontent/)
    expect(icons.some((p) => p.startsWith('/api/icon/') || p.startsWith('/lab/charts/icons/'))).toBe(true)
    expect(requested.filter((r) => r.startsWith('EXTERNAL'))).toEqual([])
  })

  test('PNG and SVG exports include the same-origin icons', async ({ page }) => {
    await mockLive(page)
    await page.goto('/lab/charts/?template=most-sdks')
    const canvas = page.locator('canvas[data-rendered^="most-sdks:"]')
    await expect(canvas).toBeVisible()
    const wanted = Number(await canvas.getAttribute('data-icons-wanted'))
    expect(wanted).toBeGreaterThan(0)
    expect(await canvas.getAttribute('data-icons-drawn')).toBe(String(wanted))
    const [svgFile] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download SVG' }).click(),
    ])
    const svg = await readFile((await svgFile.path()) as string, 'utf8')
    const images = svg.match(/<image[^>]+(?:href|xlink:href)="data:image\/png;base64,/g) ?? []
    expect(images.length).toBeGreaterThanOrEqual(wanted)
    expect(svg).not.toMatch(/mzstatic|googleusercontent|\/api\/icon\//)
    // A tainted canvas would throw here instead of downloading.
    const [pngFile] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download PNG' }).click(),
    ])
    const png = await readFile((await pngFile.path()) as string)
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
  })
})

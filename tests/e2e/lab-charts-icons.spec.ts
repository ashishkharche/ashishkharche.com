import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { mockLive } from './live-data'

test.describe('chart icons and labels on every template', () => {
  test.setTimeout(240_000)
  test('every template draws its verified icons, and Unknown never shows on the page or in an export', async ({
    page,
  }) => {
    await mockLive(page)
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
  })
})

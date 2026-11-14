import { expect, test } from '@playwright/test'
import { gotoHydrated } from './hydration'

// The Design page: five sections of real work, every picture from the site at its own shape, the theme swapping the
// light and dark versions, and the excece block holding only its icon, name and one line.
for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [390, 768, 1440]) {
    test(`design page at ${width} in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ width, height: 900 })
      await gotoHydrated(page, '/design/')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Design')
      for (const name of ['Workout Director', 'Live Coach', 'Exercise figures', 'Kalo', 'excece']) {
        await expect(page.getByRole('heading', { level: 2, name, exact: true })).toBeVisible()
      }
      // Load every lazy picture, then check each visible one came from the site and keeps its own ratio.
      await page.locator('main img').evaluateAll((all) => {
        for (const img of all as HTMLImageElement[]) img.loading = 'eager'
      })
      await page.locator('main img').evaluateAll((all) =>
        Promise.all(
          (all as HTMLImageElement[])
            .filter((img) => img.checkVisibility() && !(img.complete && img.naturalWidth))
            .map(
              (img) =>
                new Promise((done) => {
                  img.addEventListener('load', done, { once: true })
                  img.addEventListener('error', done, { once: true })
                }),
            ),
        ),
      )
      const images = await page.locator('main img').evaluateAll((all) =>
        (all as HTMLImageElement[])
          .filter((img) => img.checkVisibility())
          .map((img) => ({
            src: new URL(img.currentSrc || img.src).pathname,
            host: new URL(img.currentSrc || img.src).host,
            natural: img.naturalWidth / img.naturalHeight,
            shown: img.getBoundingClientRect().width / img.getBoundingClientRect().height,
            theme: img.dataset.themeImage ?? null,
          })),
      )
      expect(images.length).toBeGreaterThan(25)
      for (const image of images) {
        expect(image.host, image.src).toBe(new URL(page.url()).host)
        expect(image.natural, image.src).toBeGreaterThan(0)
        expect(Math.abs(image.shown / image.natural - 1), image.src).toBeLessThan(0.02)
        if (image.theme) expect(image.theme, image.src).toBe(colorScheme)
      }
      const figures = page.getByRole('list', { name: 'Exercise figures' }).locator('img')
      const shownFigures = await figures.evaluateAll((all) => all.filter((img) => img.checkVisibility()).length)
      expect(shownFigures).toBe(12)
      // The Live Coach phones are real phone size on wide screens.
      for (const phone of await page.getByRole('group', { name: 'Live Coach design' }).locator('img').all()) {
        const box = await phone.boundingBox()
        if (!box) throw new Error('Phone has no layout box')
        if (width > 1100) expect(box.width).toBeGreaterThanOrEqual(240)
        expect(box.width).toBeLessThanOrEqual(280)
      }
      const excece = page.locator('[data-design="excece"]')
      await expect(excece.locator('a')).toHaveCount(0)
      await expect(excece.locator('img')).toHaveCount(1)
      await expect(page.locator('main')).not.toContainText(/design concept|sample|proposal|teachx|testflight/i)
      await expect(page.locator('main a[href*="excece.vercel.app"]')).toHaveCount(0)
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    })
  }
}

test('the home page and the credits link to and from the Design page', async ({ page }) => {
  await gotoHydrated(page, '/')
  await expect(page.locator('main a[href="/design/"]')).toHaveCount(1)
  await gotoHydrated(page, '/credits/')
  await expect(page.locator('main')).toContainText('Aliaksei Masiukevich')
  await expect(page.locator('main')).toContainText('Food photos in the Kalo screens via')
  await expect(page.locator('main')).toContainText('Live Coach')
})

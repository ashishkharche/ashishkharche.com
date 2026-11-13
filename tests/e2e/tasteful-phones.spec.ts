import { expect, test } from '@playwright/test'
import { gotoHydrated } from './hydration'

for (const width of [390, 768, 820, 1024, 1440]) {
  test(`D1 phone artwork stays restrained at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await gotoHydrated(page, '/')
    const hero = page.getByRole('group', { name: 'Workout Director app screens' })
    await expect(hero.locator('img')).toHaveCount(2)
    for (const image of await hero.locator('img').all()) {
      // Real phone size on wide screens, never past 280px, and never squashed.
      const size = await image.evaluate((img: HTMLImageElement) => ({ w: img.offsetWidth, h: img.offsetHeight }))
      expect(size.w).toBeLessThanOrEqual(280)
      if (width > 1100) expect(size.w).toBeGreaterThanOrEqual(240)
      expect(size.h / size.w).toBeGreaterThan(1.9)
      await expect(image).toHaveAttribute('srcset', /(?:240w.*480w|400w).*800w/)
    }
    await expect(hero.locator('img').nth(1)).toHaveAttribute('src', /deadlift-pexels-/)
    // Selected work holds three phones in a fan, each at its own shape and clearly larger than the old banner phones.
    const product = page.getByRole('group', { name: 'Workout Director screens', exact: true })
    await expect(product.locator('img')).toHaveCount(3)
    for (const image of await product.locator('img').all()) {
      await expect(image).toHaveAttribute(
        'src',
        /\/assets\/phones\/(pushup-balanced|squat-balanced|trainer-demo)-480\.webp/,
      )
      const size = await image.evaluate((img: HTMLImageElement) => ({ w: img.offsetWidth, h: img.offsetHeight }))
      expect(size.h / size.w).toBeCloseTo(2558 / 1181, 1)
      expect(size.w).toBeGreaterThanOrEqual(130)
      expect(size.w).toBeLessThanOrEqual(240)
    }
    await expect(page.locator('[data-note-banner]')).toHaveCount(3)
    for (const banner of await page.locator('[data-note-banner]').all()) {
      await expect(banner.locator('img')).toHaveCount(1)
      const image = banner.locator('img')
      await expect(image).toHaveAttribute('src', /\/assets\/banners\/note-(0[12]|reflex).*-1600x900\.webp/)
      const box = await image.boundingBox()
      if (!box) throw new Error('Banner image has no layout box')
      expect(box.width / box.height).toBeCloseTo(16 / 9, 1)
      const container = await banner.boundingBox()
      if (!container) throw new Error('Banner has no layout box')
      expect(box.width).toBeCloseTo(container.width, 0)
    }
    await expect(page.locator('main')).not.toContainText(/design concepts|sample data|demo conversation/i)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await gotoHydrated(page, '/projects/')
    const projectPhone = page.getByRole('group', { name: 'Workout Director screens', exact: true })
    // The Projects page shows the same fan of real-size phones as the home page instead of a poster.
    await expect(projectPhone.locator('img')).toHaveCount(3)
    for (const image of await projectPhone.locator('img').all()) {
      const size = await image.evaluate((img: HTMLImageElement) => ({ w: img.offsetWidth, h: img.offsetHeight }))
      expect(size.h / size.w).toBeCloseTo(2558 / 1181, 1)
      expect(size.w).toBeLessThanOrEqual(240)
    }
    await gotoHydrated(page, '/notes/')
    for (const image of await page.locator('[data-note-banner] img').all()) {
      const box = await image.boundingBox()
      if (!box) throw new Error('Banner image has no layout box')
      expect(box.width / box.height).toBeCloseTo(16 / 9, 1)
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await gotoHydrated(page, '/about/')
    await expect(page.locator('main img[src*="/assets/phones/"]')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('I also develop')
  })
}

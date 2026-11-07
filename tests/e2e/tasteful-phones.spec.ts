import { expect, test } from '@playwright/test'
import { gotoHydrated } from './hydration'

for (const width of [1440, 390]) {
  test(`D1 phone artwork stays restrained at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await gotoHydrated(page, '/')
    const hero = page.getByRole('group', { name: 'Workout Director app screens' })
    await expect(hero.locator('img')).toHaveCount(2)
    for (const image of await hero.locator('img').all()) {
      expect((await image.boundingBox())?.width).toBeLessThanOrEqual(189)
      await expect(image).toHaveAttribute('srcset', /(?:240w.*480w|400w).*800w/)
    }
    await expect(hero.locator('img').nth(1)).toHaveAttribute('src', /deadlift-pexels-/)
    const product = page.getByRole('group', { name: 'Workout Director screens', exact: true })
    await expect(product.locator('img')).toHaveCount(1)
    expect((await product.locator('img').boundingBox())?.width).toBeLessThanOrEqual(165)
    await expect(page.locator('[data-note-banner]')).toHaveCount(2)
    for (const banner of await page.locator('[data-note-banner]').all()) {
      await expect(banner.locator('img')).toHaveCount(1)
      expect((await banner.boundingBox())?.height).toBeLessThanOrEqual(177)
    }
    await expect(page.locator('main')).not.toContainText(/design concepts|sample data|demo conversation/i)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    await gotoHydrated(page, '/projects/')
    const projectPhone = page.getByRole('group', { name: 'Workout Director screens', exact: true })
    await expect(projectPhone.locator('img')).toHaveCount(1)
    expect((await projectPhone.locator('img').boundingBox())?.width).toBeLessThanOrEqual(165)
    await gotoHydrated(page, '/about/')
    await expect(page.locator('main img[src*="/assets/phones/"]')).toHaveCount(0)
    await expect(page.locator('main')).toContainText('I also develop')
  })
}

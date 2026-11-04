import { expect, test } from '@playwright/test'
import { gotoHydrated } from './hydration'

// The footer drawing has to fit the screen: on phones it was shown wider than the
// screen and cropped, which cut off the AK mark and the push-up.
for (const width of [375, 390, 1440]) {
  test(`the footer drawing fits a ${width}px screen`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await gotoHydrated(page, '/')
    const art = page.locator('footer img:visible')
    await expect(art).toHaveCount(1)
    await art.scrollIntoViewIfNeeded()
    await expect(art).toHaveJSProperty('complete', true)
    const box = (await art.boundingBox()) ?? { x: -1, width: Infinity }
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    const src = await art.evaluate((img: HTMLImageElement) => img.currentSrc)
    expect(src).toContain(width <= 560 ? 'footer-identity-phone.svg' : 'footer-identity.svg')
    // The hidden drawing is never downloaded.
    const loaded = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .map((e) => e.name)
        .filter((name) => name.includes('/footer-identity')),
    )
    expect(loaded).toHaveLength(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width)
  })
}

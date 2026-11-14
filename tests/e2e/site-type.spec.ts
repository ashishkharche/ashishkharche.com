import { expect, test } from '@playwright/test'

// A shared scale across routes and viewports, including code and diagram text.
for (const colorScheme of ['light', 'dark'] as const) {
  for (const width of [1440, 390]) {
    test(`site type scale at ${width} in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height: 900 })
      const allSizes = new Set<string>()
      const allWeights = new Set<string>()
      for (const path of [
        '/',
        '/work/',
        '/projects/',
        '/projects/workout-director/',
        '/notes/',
        '/notes/workout-director-2/',
        '/design/',
      ]) {
        await page.goto(path)
        await page.evaluate(() => document.fonts.ready)
        const used = await page.evaluate(() => {
          const sizes = new Set<string>()
          const weights = new Set<string>()
          for (const el of document.querySelectorAll('body *')) {
            if (![...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) continue
            const box = el.getBoundingClientRect()
            const style = getComputedStyle(el)
            if (!box.width || !box.height || style.visibility === 'hidden') continue
            sizes.add(style.fontSize)
            weights.add(style.fontWeight)
          }
          return {
            sizes: [...sizes],
            weights: [...weights],
            overflow: document.documentElement.scrollWidth > innerWidth,
          }
        })
        expect(used.overflow, path).toBe(false)
        for (const size of used.sizes) {
          expect(['16px', '18px', '48px', '96px'], `${path}: ${size}`).toContain(size)
          allSizes.add(size)
        }
        for (const weight of used.weights) {
          expect(['400', '550'], `${path}: ${weight}`).toContain(weight)
          allWeights.add(weight)
        }
      }
      expect(allSizes.size).toBeLessThanOrEqual(4)
      expect(allWeights.size).toBeLessThanOrEqual(2)
    })
  }
}

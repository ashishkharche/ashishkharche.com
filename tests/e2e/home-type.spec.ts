import { expect, test } from '@playwright/test'

// The home page keeps to one small type scale: four sizes, three families and two
// weights (the name in the AK wordmark's face and weight, the light display weight and two text weights) (see src/styles/tokens.stylex.ts). This reads every visible piece of
// text and checks the computed styles, in light and dark.
for (const colorScheme of ['light', 'dark'] as const) {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`at ${viewport.width} wide in ${colorScheme} the home page uses four sizes, three families and two weights`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize(viewport)
      await page.goto('/')
      await page.evaluate(() => document.fonts.ready)
      const used = await page.evaluate(() => {
        const sizes = new Set<string>()
        const families = new Set<string>()
        const weights = new Set<string>()
        for (const el of document.querySelectorAll('body *')) {
          const text = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())
          const box = el.getBoundingClientRect()
          if (!text || box.width === 0 || box.height === 0) continue
          const style = getComputedStyle(el)
          if (style.visibility === 'hidden') continue
          sizes.add(style.fontSize)
          families.add((style.fontFamily.split(',')[0] ?? '').replaceAll('"', '').trim())
          weights.add(style.fontWeight)
        }
        return { sizes: [...sizes], families: [...families].sort(), weights: [...weights].sort() }
      })
      expect(used.sizes.length, used.sizes.join(' ')).toBeLessThanOrEqual(4)
      expect(used.families).toEqual(['Inter Display', 'Newsreader', 'Source Sans 3'])
      expect(used.weights).toEqual(['400', '550'])
    })
  }
}

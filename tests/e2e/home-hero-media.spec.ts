import { expect, test } from '@playwright/test'

// The two phones at the top of the home page sit straight on the page: the
// media container has no background, gradient, rounded card or shadow.
for (const colorScheme of ['light', 'dark'] as const) {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`at ${viewport.width} wide in ${colorScheme} the hero media container is transparent`, async ({ page }) => {
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize(viewport)
      await page.goto('/')
      const stage = page.getByRole('group', { name: 'Workout Director app screens' })
      await expect(stage).toBeVisible()
      const style = await stage.evaluate((el) => {
        const s = getComputedStyle(el)
        return {
          backgroundColor: s.backgroundColor,
          backgroundImage: s.backgroundImage,
          boxShadow: s.boxShadow,
          borderRadius: s.borderRadius,
          borderWidth: s.borderTopWidth,
        }
      })
      expect(style).toEqual({
        backgroundColor: 'rgba(0, 0, 0, 0)',
        backgroundImage: 'none',
        boxShadow: 'none',
        borderRadius: '0px',
        borderWidth: '0px',
      })
    })
  }
}

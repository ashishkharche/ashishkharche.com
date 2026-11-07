import { expect, test } from '@playwright/test'

for (const path of ['/', '/about/', '/projects/', '/notes/', '/notes/workout-director-1/', '/work/']) {
  test(`${path}: no link on the page is underlined`, async ({ page }) => {
    await page.goto(path)
    const underlined = await page.locator('header a, main a, footer a').evaluateAll((links) =>
      links
        .filter((a) => {
          const style = getComputedStyle(a)
          return style.textDecorationLine.includes('underline') || style.backgroundImage.includes('underline')
        })
        .map((a) => a.textContent?.trim()),
    )
    expect(underlined).toEqual([])
  })
}

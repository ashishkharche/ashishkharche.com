import { expect, test } from '@playwright/test'

// On the home page a section title that leads to a full list is the link itself. There is no separate
// "All notes" or "All projects" link, and the title keeps the look of the plain titles: no underline.
for (const width of [390, 768, 1440]) {
  test(`section titles are the links to their lists at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    const main = page.locator('main')
    await expect(main.getByRole('link', { name: /^All (notes|projects)$/ })).toHaveCount(0)
    for (const [name, href] of [
      ['Notes', '/notes/'],
      ['Selected work', '/projects/'],
    ] as const) {
      const heading = main.getByRole('heading', { level: 2, name, exact: true })
      const link = heading.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('href', href)
      const look = await link.evaluate((a) => {
        const s = getComputedStyle(a)
        const h = getComputedStyle(a.parentElement as HTMLElement)
        return { line: s.textDecorationLine, color: s.color, hColor: h.color, size: s.fontSize, hSize: h.fontSize }
      })
      expect(look.line).toBe('none')
      expect(look.color).toBe(look.hColor)
      expect(look.size).toBe(look.hSize)
      const box = await link.boundingBox()
      expect(box?.height ?? 0, 'comfortable tap target').toBeGreaterThanOrEqual(44)
    }
    await main.getByRole('heading', { level: 2, name: 'Notes', exact: true }).getByRole('link').click()
    await expect(page).toHaveURL(/\/notes\/$/)
  })
}

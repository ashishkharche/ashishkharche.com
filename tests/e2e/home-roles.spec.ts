import { expect, test } from '@playwright/test'

// Each company logo sits in the same box, centred on its company name, with the names on one left edge.
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 390, height: 844 },
]) {
  test(`at ${viewport.width} wide the role logos line up with the company names`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    const rows = await page.getByRole('list', { name: 'Roles' }).evaluate((list) =>
      Array.from(list.querySelectorAll(':scope > li')).map((li) => {
        const rect = (el: Element | null | undefined) => {
          if (!el) throw new Error('missing element')
          const { x, y, width, height } = el.getBoundingClientRect()
          return { x, y, width, height }
        }
        const shown = Array.from(li.querySelectorAll('img')).find((img) => getComputedStyle(img).display !== 'none')
        return {
          box: rect(li.firstElementChild),
          logo: rect(shown),
          name: rect(li.querySelector('span > span > span')),
        }
      }),
    )
    expect(rows).toHaveLength(2)
    const [first, second] = rows
    if (!first || !second) throw new Error('expected two roles')
    expect(first.box.width).toBe(second.box.width)
    expect(first.box.height).toBe(second.box.height)
    expect(Math.abs(first.box.x - second.box.x) < 1 || viewport.width > 760).toBe(true)
    if (Math.abs(first.name.y - second.name.y) > 1) expect(Math.abs(first.name.x - second.name.x)).toBeLessThan(1)
    for (const row of rows) {
      const logoMid = row.logo.y + row.logo.height / 2
      const nameMid = row.name.y + row.name.height / 2
      expect(Math.abs(logoMid - nameMid)).toBeLessThanOrEqual(1.5)
      // The mark fits its box, so nothing spills into the text.
      expect(row.logo.x).toBeGreaterThanOrEqual(row.box.x - 0.5)
      expect(row.logo.x + row.logo.width).toBeLessThanOrEqual(row.box.x + row.box.width + 0.5)
    }
  })
}

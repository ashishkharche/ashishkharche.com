import { expect, test } from '@playwright/test'

// All three role rows share one layout: same classes, logo-box width and text indent. SpaceX is first only.
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
        const box = li.firstElementChild
        const textCol = li.children[1]
        const name = li.querySelector('span > span > span')
        return {
          liClass: li.className,
          boxClass: box?.className ?? '',
          box: rect(box),
          logo: rect(shown),
          name: rect(name),
          textX: textCol ? textCol.getBoundingClientRect().x : 0,
        }
      }),
    )
    expect(rows).toHaveLength(3)
    const [first, second, third] = rows
    if (!first || !second || !third) throw new Error('expected three roles')
    expect(first.liClass).toBe(second.liClass)
    expect(second.liClass).toBe(third.liClass)
    expect(first.boxClass).toBe(second.boxClass)
    expect(second.boxClass).toBe(third.boxClass)
    expect(first.box.width).toBe(second.box.width)
    expect(second.box.width).toBe(third.box.width)
    expect(first.box.height).toBe(second.box.height)
    expect(second.box.height).toBe(third.box.height)
    expect(Math.abs(first.textX - second.textX)).toBeLessThan(1)
    expect(Math.abs(second.textX - third.textX)).toBeLessThan(1)
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

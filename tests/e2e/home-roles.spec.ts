import { expect, test } from '@playwright/test'

// All three roles share one layout: same classes, logo-box size and text indent. SpaceX is first only.
// They stand side by side on one ground line on wide screens (names on one line) and one under another on phones.
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
    // The roles after the first add only the pen line between them.
    expect(second.liClass).toBe(third.liClass)
    for (const name of first.liClass.split(' ')) expect(second.liClass.split(' ')).toContain(name)
    expect(first.boxClass).toBe(second.boxClass)
    expect(second.boxClass).toBe(third.boxClass)
    expect(first.box.width).toBe(second.box.width)
    expect(second.box.width).toBe(third.box.width)
    expect(first.box.height).toBe(second.box.height)
    expect(second.box.height).toBe(third.box.height)
    // The same indent from each logo box to its words.
    expect(Math.abs(first.textX - first.box.x - (second.textX - second.box.x))).toBeLessThan(1)
    expect(Math.abs(second.textX - second.box.x - (third.textX - third.box.x))).toBeLessThan(1)
    if (viewport.width > 760) {
      // A single editorial column keeps one shared left edge.
      expect(Math.abs(first.textX - second.textX)).toBeLessThan(1)
      expect(Math.abs(second.textX - third.textX)).toBeLessThan(1)
    } else {
      // One under another: one left edge.
      expect(Math.abs(first.textX - second.textX)).toBeLessThan(1)
      expect(Math.abs(second.textX - third.textX)).toBeLessThan(1)
      expect(Math.abs(first.box.x - second.box.x)).toBeLessThan(1)
    }
    for (const row of rows) {
      const logoMid = row.logo.y + row.logo.height / 2
      const nameMid = row.name.y + Math.min(row.name.height, 32) / 2
      expect(Math.abs(logoMid - nameMid)).toBeLessThanOrEqual(1.5)
      // The mark fits its box, so nothing spills into the text.
      expect(row.logo.x).toBeGreaterThanOrEqual(row.box.x - 0.5)
      expect(row.logo.x + row.logo.width).toBeLessThanOrEqual(row.box.x + row.box.width + 0.5)
    }
  })
}

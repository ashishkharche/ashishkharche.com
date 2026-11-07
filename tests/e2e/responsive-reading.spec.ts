import { expect, test } from '@playwright/test'
import { routes } from './routes'
import { gotoHydrated } from './hydration'

for (const width of [390, 768, 820, 1024, 1440]) {
  test(`every page has readable text and no page overflow at ${width}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width, height: 1000 })
    for (const path of routes) {
      await gotoHydrated(page, path)
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth), path).toBeLessThanOrEqual(width)
      const narrow = await page.locator('main p').evaluateAll((paragraphs) =>
        paragraphs.flatMap((p) => {
          const style = getComputedStyle(p)
          const text = p.textContent?.trim() ?? ''
          const box = p.getBoundingClientRect()
          // Long body paragraphs need at least about 30 characters per line.
          // Labels, captions and the chart canvas itself are not body columns.
          if (parseFloat(style.fontSize) < 18 || text.length < 70 || box.height === 0) return []
          const context = document.createElement('canvas').getContext('2d')
          if (!context) throw new Error('Text measurement unavailable')
          context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
          const minimum = context.measureText('0').width * 30
          return box.width + 1 < minimum ? [{ text: text.slice(0, 80), width: box.width, minimum }] : []
        }),
      )
      expect(narrow, path).toEqual([])
      for (const link of await page.getByRole('link', { name: 'App Store', exact: true }).all()) {
        const metrics = await link.evaluate((el) => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
          const lines: number[] = []
          let node: Node | null
          while ((node = walker.nextNode())) {
            if (!node.textContent?.trim()) continue
            const range = document.createRange()
            range.selectNodeContents(node)
            lines.push(...[...range.getClientRects()].filter((box) => box.width > 0).map((box) => Math.round(box.y)))
          }
          return lines
        })
        expect(new Set(metrics).size, `${path}: App Store stays on one line`).toBeLessThanOrEqual(1)
      }
    }
  })
}

import { expect, test, type Page } from '@playwright/test'
import { gotoHydrated } from './hydration'

// The pen line down the left of the page runs into the A of the footer drawing. It must end exactly on the A's top-left
// corner, arrive level along the A's top edge with no overshoot or S-swoop, and never run through the letters.

// The outline of the AK mark in the drawing's units (from the path in footer-identity.svg).
const AK: [number, number][] = [
  [401.1, 164],
  [305.6, 164],
  [110, 524],
  [205.5, 524],
  [313.8, 324.8],
  [313.8, 524],
  [397.8, 524],
  [397.8, 372.6],
  [413.1, 356.2],
  [495.1, 524],
  [588.4, 524],
  [474.6, 290.6],
  [593.4, 164],
  [478.2, 164],
  [397.8, 249.8],
]

function inside([x, y]: [number, number], poly: [number, number][]): boolean {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] ?? [0, 0]
    const [xj, yj] = poly[j] ?? [0, 0]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}

function distanceToEdges([x, y]: [number, number], poly: [number, number][]): number {
  let best = Infinity
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j] ?? [0, 0]
    const [bx, by] = poly[i] ?? [0, 0]
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)),
    )
    best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))))
  }
  return best
}

async function read(page: Page) {
  return page.evaluate(() => {
    const merge = document.querySelector<SVGSVGElement>('[data-pen-merge]')
    const spine = document.querySelector<HTMLElement>('[data-pen-spine]')
    const art = Array.from(document.querySelectorAll<HTMLImageElement>('[data-footer-art]')).find(
      (img) => img.getBoundingClientRect().width > 0,
    )
    if (!merge || !spine || !art) throw new Error('pen line or footer drawing missing')
    const scene = merge.getBoundingClientRect()
    const sp = spine.getBoundingClientRect()
    const ar = art.getBoundingClientRect()
    const path = merge.querySelector('path')
    return {
      state: merge.dataset.penMerge,
      centre: JSON.parse(merge.dataset.centre ?? '[]') as [number, number][],
      spine: { x: sp.left - scene.left + 8, top: sp.top - scene.top, bottom: sp.bottom - scene.top },
      art: { left: ar.left - scene.left, top: ar.top - scene.top, width: ar.width },
      viewbox: (art.dataset.viewbox ?? '').split(' ').map(Number),
      fill: path ? getComputedStyle(path).fill : '',
    }
  })
}

for (const scheme of ['light', 'dark'] as const) {
  for (const width of [390, 768, 1440, 1920]) {
    test(`at ${width}px (${scheme}) the pen line ends on the A's top-left corner without crossing the AK`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.setViewportSize({ width, height: 900 })
      await gotoHydrated(page, '/about/')
      await page.locator('footer img:visible').scrollIntoViewIfNeeded()
      await expect(page.locator('[data-pen-merge]')).toHaveAttribute('data-pen-merge', 'merge')
      const m = await read(page)
      const [vx = 0, vy = 0, vw = 1] = m.viewbox
      const scale = m.art.width / vw
      const poly = AK.map(([x, y]): [number, number] => [m.art.left + (x - vx) * scale, m.art.top + (y - vy) * scale])
      const apex = poly[1] ?? [0, 0]

      // The bend picks up exactly where the straight line stops and ends on the top of the A's left leg.
      const first = m.centre[0] ?? [0, 0]
      const last = m.centre.at(-1) ?? [0, 0]
      expect(Math.abs(first[1] - m.spine.bottom), 'bend starts where the line stops').toBeLessThanOrEqual(1.5)
      expect(Math.abs(first[0] - m.spine.x), 'bend starts on the line').toBeLessThanOrEqual(2)
      expect(Math.abs(last[0] - apex[0]), 'bend ends on the A’s top-left corner (x)').toBeLessThanOrEqual(1)
      expect(Math.abs(last[1] - apex[1]), 'bend ends on the A’s top-left corner (y)').toBeLessThanOrEqual(1)
      // No overshoot: the bend only moves down and towards the corner, never past it or back again (no S-swoop).
      for (let i = 1; i < m.centre.length; i++) {
        const [x0, y0] = m.centre[i - 1] ?? [0, 0]
        const [x1, y1] = m.centre[i] ?? [0, 0]
        expect(x1, 'never past the corner').toBeLessThanOrEqual(apex[0] + 0.5)
        expect(y1, 'never below the corner').toBeLessThanOrEqual(apex[1] + 0.5)
        expect(Math.sign(apex[0] - first[0]) * (x1 - x0), 'always towards the corner').toBeGreaterThanOrEqual(-0.2)
        expect(y1 - y0, 'always downwards').toBeGreaterThanOrEqual(-0.2)
      }
      // It arrives level, running on into the A's top edge instead of crossing it.
      const before = m.centre.at(-3) ?? [0, 0]
      expect(Math.abs(last[1] - before[1]), 'arrives along the top edge').toBeLessThanOrEqual(1)

      // Nothing of the line, straight or bent, lies inside the letters.
      const samples: [number, number][] = [...m.centre]
      for (let y = m.spine.top; y <= m.spine.bottom; y += 8) samples.push([m.spine.x, y])
      for (const point of samples) {
        const crossing = inside(point, poly) && distanceToEdges(point, poly) > 1.5
        expect(crossing, `point ${point.join(',')} is inside the AK`).toBe(false)
      }
      // The straight line stops above the drawing.
      expect(m.spine.bottom).toBeLessThan(apex[1])
      expect(m.fill).not.toBe('none')
      expect(m.fill).not.toMatch(/rgba\(.*, 0\)$/)
    })
  }
}

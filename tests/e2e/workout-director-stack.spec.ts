import { expect, test } from '@playwright/test'
import { workoutDirectorStack, workoutDirectorStackGroups } from '../../src/content/projects'

const path = '/projects/workout-director/'

test('the case study shows the full stack in groups, each item one chip', async ({ page }) => {
  await page.goto(path)
  const stack = page.getByRole('region', { name: 'Stack' })
  await expect(stack).toBeVisible()
  for (const group of workoutDirectorStackGroups) {
    const list = stack.getByRole('list', { name: group.label })
    await expect(list.getByRole('listitem')).toHaveCount(group.items.length)
  }
  await expect(stack.getByRole('listitem')).toHaveCount(workoutDirectorStack.length)
  for (const name of workoutDirectorStack)
    await expect(stack.getByRole('listitem').getByText(name, { exact: true })).toBeVisible()
  await expect(stack.locator('[data-stack-chip]')).toHaveCount(workoutDirectorStack.length)
  // The Vision framework has no published mark, so it is its name alone: no letter tile, no made-up icon.
  const vision = stack.locator('[data-stack-chip]').filter({ hasText: 'Vision framework' })
  await expect(vision).toHaveAttribute('data-stack-chip', 'text')
  await expect(vision.locator('img')).toHaveCount(0)
})

test('what each item does is behind a disclosure that opens with the keyboard', async ({ page }) => {
  await page.goto(path)
  const stack = page.getByRole('region', { name: 'Stack' })
  const notes = stack.locator('[data-stack-notes]')
  const first = workoutDirectorStackGroups[0]?.items[0]
  if (!first) throw new Error('no stack items')
  await expect(notes.getByText(first.note, { exact: true })).toBeHidden()
  const summary = notes.locator('summary')
  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(notes).toHaveAttribute('open', '')
  for (const group of workoutDirectorStackGroups)
    for (const item of group.items) await expect(notes.getByText(item.note, { exact: true })).toBeVisible()
})

test('the stack stays compact: under 340px tall at 1440 and under 560px at 390', async ({ page }) => {
  for (const [width, max] of [
    [1440, 340],
    [390, 560],
  ] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(path)
    const box = await page.locator('[data-stack]').boundingBox()
    if (!box) throw new Error('stack is not on the page')
    expect(box.height, `height at ${width}`).toBeLessThan(max)
  }
})

test('every stack icon loads from the site itself', async ({ page }) => {
  await page.goto(path)
  const stack = page.locator('[data-stack]')
  await stack.scrollIntoViewIfNeeded()
  const images = stack.locator('img')
  await expect(images.first()).toBeVisible()
  const results = await images.evaluateAll((imgs) =>
    Promise.all(
      imgs.map(async (img) => {
        const el = img as HTMLImageElement
        el.loading = 'eager'
        await el.decode().catch(() => undefined)
        return { src: el.src, ok: el.naturalWidth > 0, sameOrigin: new URL(el.src).origin === location.origin }
      }),
    ),
  )
  expect(results.length).toBeGreaterThan(0)
  for (const result of results) expect(result, result.src).toMatchObject({ ok: true, sameOrigin: true })
})

test('the details row keeps My part, Published by and Links, and the stack moves below it', async ({ page }) => {
  await page.goto(path)
  const terms = page.locator('dl').first().locator('dt')
  await expect(terms).toHaveText(['My part', 'Published by', 'Links'])
})

test('on a 390px phone the stack fits the screen without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(path)
  const stack = page.locator('[data-stack]')
  await stack.scrollIntoViewIfNeeded()
  const box = await stack.boundingBox()
  if (!box) throw new Error('stack is not on the page')
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(390)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('every stack item is one unit on one line, and each row label is level with its first item', async ({ page }) => {
  for (const [url, width] of [
    ['/', 1440],
    ['/', 390],
    ['/projects/', 1440],
    [path, 1440],
    [path, 390],
  ] as const) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(url)
    const chips = page.locator('[data-stack-chip]:visible')
    expect(await chips.count(), `${url} at ${width}`).toBeGreaterThan(0)
    const boxes = await chips.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect()
        const name = el.lastElementChild?.getBoundingClientRect()
        return {
          text: el.textContent,
          top: r.top,
          height: r.height,
          nameTop: name?.top ?? 0,
          size: getComputedStyle(el.lastElementChild ?? el).fontSize,
        }
      }),
    )
    for (const box of boxes) {
      expect(box.height, `${box.text} wraps at ${width}`).toBeLessThanOrEqual(25)
      expect(box.size, `${box.text} size`).toBe('16px')
    }
    // Items on the same row share one line: the names start at the same height.
    const rows = new Map<number, number[]>()
    for (const box of boxes) rows.set(Math.round(box.top), [...(rows.get(Math.round(box.top)) ?? []), box.nameTop])
    for (const tops of rows.values()) expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1)
    // In two-column rows the label lines up with the first item.
    if (width > 560) {
      const pairs = await page.locator('ul:has([data-stack-chip]):visible').evaluateAll((lists) =>
        lists.map((list) => {
          const label = list.previousElementSibling?.getBoundingClientRect().top ?? 0
          const first = list.querySelector('[data-stack-chip]')?.getBoundingClientRect().top ?? 0
          return Math.abs(label - first)
        }),
      )
      for (const gap of pairs) expect(gap).toBeLessThanOrEqual(1)
    }
  }
})

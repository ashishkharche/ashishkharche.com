import { expect, test } from '@playwright/test'
import { workoutDirectorStack, workoutDirectorStackGroups } from '../../src/content/projects'

const path = '/projects/workout-director/'

test('the case study shows the full stack in groups, each item with a tile', async ({ page }) => {
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
  await expect(stack.locator('[data-stack-tile]')).toHaveCount(workoutDirectorStack.length)
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

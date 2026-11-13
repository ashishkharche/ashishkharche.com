import { expect, test } from '@playwright/test'

const note = '/notes/workout-director-2/'

test('fenced code is one highlighted block that scrolls sideways', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(note)
  const blocks = page.locator('pre.code')
  await expect(blocks).toHaveCount(8)
  const first = blocks.first()
  await expect(first).toHaveAttribute('data-language', 'python')
  await expect(first.locator('.tok-keyword').first()).toBeVisible()
  expect(await first.locator('[style]').count()).toBe(0)
  // The code inside a block is not styled like inline code.
  const code = first.locator('code')
  expect(await code.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe('0px')
  // Long lines scroll inside the block instead of being cut off.
  const overflow = await first.evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
    x: getComputedStyle(el).overflowX,
  }))
  expect(overflow.x).toBe('auto')
  expect(overflow.scroll).toBeGreaterThan(overflow.client)
  await expect(page.getByText('Python', { exact: true }).first()).toBeVisible()
})

test('the copy button copies the block', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium only')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto(note)
  const button = page.getByRole('button', { name: /Python code$/ }).first()
  await button.click()
  await expect(button).toContainText('Copied')
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toContain('from mediapipe.tasks.python import vision, BaseOptions')
  expect(copied).toContain('screen[i].visibility')
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })
  test('code blocks are highlighted and have no dead copy button', async ({ page }) => {
    await page.goto(note)
    await expect(page.locator('pre.code .tok-keyword').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Copy/ })).toHaveCount(0)
  })
})

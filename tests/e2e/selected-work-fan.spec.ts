import { expect, test, type Page } from '@playwright/test'

// The Selected work phones sit in a tidy fan and spread when the card is hovered. With reduced motion they stay put.
const fan = (page: Page) => page.getByRole('group', { name: 'Workout Director screens', exact: true })

async function lefts(page: Page) {
  return fan(page)
    .locator('img')
    .evaluateAll((imgs) => imgs.map((img) => Math.round(img.getBoundingClientRect().left)))
}

test('the phones fan out on hover and come back', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover needs a pointer')
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'load' })
  await fan(page).scrollIntoViewIfNeeded()
  await page.waitForTimeout(100)
  const rest = await lefts(page)
  await fan(page).hover()
  await expect.poll(async () => (await lefts(page))[0]).toBeLessThan((rest[0] ?? 0) - 20)
  await expect.poll(async () => (await lefts(page))[2]).toBeGreaterThan((rest[2] ?? 0) + 20)
  await page.mouse.move(5, 5)
  await expect.poll(async () => (await lefts(page))[0]).toBe(rest[0])
})

test('with reduced motion the fan stays still', async ({ page, isMobile }) => {
  test.skip(isMobile, 'hover needs a pointer')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/', { waitUntil: 'load' })
  await fan(page).scrollIntoViewIfNeeded()
  await page.waitForTimeout(100)
  const rest = await lefts(page)
  await fan(page).hover()
  await page.waitForTimeout(300)
  expect(await lefts(page)).toEqual(rest)
})

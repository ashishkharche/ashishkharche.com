import { expect, test, type Locator, type Page } from '@playwright/test'

// One panel of Workout Director screens beside the intro, with screens the Selected work card does not show.
const panel = (page: Page) => page.getByRole('group', { name: 'Workout Director app screens' })

async function box(locator: Locator) {
  const found = await locator.boundingBox()
  if (!found) throw new Error('element is not on the page')
  return found
}

const stem = (src: string | null) =>
  (src ?? '')
    .split('/')
    .pop()
    ?.replace(/-\d+\.\w+$/, '')

test('the intro panel shows two described screens that the Selected work card does not repeat', async ({ page }) => {
  await page.goto('/')
  const images = panel(page).locator('img')
  await expect(images).toHaveCount(2)
  const heroScreens = []
  for (const img of await images.all()) {
    expect(await img.getAttribute('src')).toMatch(/\/assets\/(phones\/|img\/wd\/iphone\/deadlift-pexels-)/)
    expect((await img.getAttribute('alt'))?.length).toBeGreaterThan(10)
    heroScreens.push(stem(await img.getAttribute('src')))
  }
  const card = page.locator('article').filter({ hasText: 'Workout Director' }).first()
  const cardScreens = await card
    .getByRole('group', { name: 'Workout Director screens', exact: true })
    .locator('img')
    .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')))
  expect(cardScreens).toHaveLength(3)
  for (const src of cardScreens) expect(heroScreens).not.toContain(stem(src))
})

test('the desktop composition keeps raw screens clear of the type and inside the first fold', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const intro = page.locator('section[aria-labelledby="intro-title"]')
  const name = await box(intro.locator('h1'))
  const store = await box(intro.getByRole('link', { name: 'App Store' }))
  const stage = await box(panel(page))
  // The editorial title spans both content columns, with images below and copy opposite.
  expect(stage.y).toBeGreaterThanOrEqual(name.y + name.height + 32)
  expect(stage.x).toBeGreaterThan(store.x + store.width + 100)
  expect(stage.x + stage.width).toBeLessThanOrEqual(1440 - 48)
  expect(stage.y + stage.height).toBeLessThanOrEqual(900)
  const front = await box(panel(page).locator('img').nth(1))
  expect(front.y + front.height).toBeLessThanOrEqual(stage.y + stage.height + 2)
})

test('on a phone the panel follows the Workout Director links', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const store = await box(
    page.locator('section[aria-labelledby="intro-title"]').getByRole('link', { name: 'App Store' }),
  )
  const stage = await box(panel(page))
  expect(stage.y).toBeGreaterThan(store.y + store.height)
  expect(stage.width).toBeGreaterThan(300)
})

test('there is clear space between the panel and the next heading', async ({ page }) => {
  await page.goto('/')
  const stage = await box(panel(page))
  const heading = await box(page.getByRole('heading', { name: 'Selected work' }))
  expect(heading.y - (stage.y + stage.height)).toBeGreaterThanOrEqual(64)
})

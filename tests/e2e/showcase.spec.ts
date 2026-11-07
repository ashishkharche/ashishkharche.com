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
    expect(await img.getAttribute('src')).toContain('/assets/img/wd/iphone/')
    expect((await img.getAttribute('alt'))?.length).toBeGreaterThan(10)
    heroScreens.push(stem(await img.getAttribute('src')))
  }
  const card = page.locator('article').filter({ hasText: 'Workout Director' }).first()
  const cardScreens = await card
    .locator('img[src*="/assets/img/wd/"]')
    .evaluateAll((imgs) => imgs.map((img) => img.getAttribute('src')))
  expect(cardScreens).toHaveLength(3)
  for (const src of cardScreens) expect(heroScreens).not.toContain(stem(src))
})

test('on a wide screen the panel stands on the ground line at the right of the intro', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const intro = page.locator('section[aria-labelledby="intro-title"]')
  const scene = await box(intro.locator(':scope > div').first())
  const name = await box(intro.locator('h1'))
  const store = await box(intro.getByRole('link', { name: 'App Store' }))
  const stage = await box(panel(page))
  // To the right of the name and of the Workout Director links.
  expect(stage.x).toBeGreaterThan(name.x + name.width)
  expect(stage.x).toBeGreaterThan(store.x + store.width)
  // Standing on the ground line: the bottom of the scene, with the whole first scene in the first screen.
  expect(Math.abs(stage.y + stage.height - (scene.y + scene.height))).toBeLessThanOrEqual(2)
  expect(scene.y + scene.height).toBeLessThanOrEqual(900)
  // The front phone sits inside the panel.
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

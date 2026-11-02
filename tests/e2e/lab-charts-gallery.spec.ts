import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { mockLive } from './live-data'

const axe = async (page: Page) =>
  (
    await new AxeBuilder({ page })
      .exclude('[data-base-ui-focus-guard]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze()
  ).violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)

test.describe('chart builder gallery', () => {
  test.beforeEach(async ({ page }) => {
    await mockLive(page)
    await page.emulateMedia({ reducedMotion: 'reduce' })
  })

  test('shows at least 15 templates, with the unverified ones only under Pending verification', async ({ page }) => {
    await page.goto('/lab/charts/')
    const gallery = page.getByTestId('gallery')
    const cards = gallery.getByRole('radiogroup', { name: 'Templates' }).locator('input[type=radio]')
    // The data-file templates join once their list has loaded.
    await expect(gallery.locator('input[value="us-rating-countries"]')).toHaveCount(1)
    expect(await cards.count()).toBeGreaterThanOrEqual(15)
    await expect(gallery.locator('input[value="android-permissions"]')).toHaveCount(0)
    await expect(gallery.locator('input[value="ai-apps-ios-android-sdks"]')).toHaveCount(0)
    await gallery.getByRole('button', { name: 'Pending verification' }).click()
    await expect(cards).toHaveCount(2)
    await expect(gallery.getByText('not in the default gallery')).toBeVisible()
    await gallery.getByRole('button', { name: 'All' }).click()
    expect(await cards.count()).toBeGreaterThanOrEqual(15)
  })

  test('draws a real preview for every template, with no "Unknown"', async ({ page }) => {
    await page.goto('/lab/charts/')
    await expect(page.locator('canvas[data-rendered]')).toBeVisible()
    const thumbs = page.getByTestId('gallery').locator('canvas[data-thumb]')
    const n = await thumbs.count()
    for (let i = 0; i < n; i++) {
      const thumb = thumbs.nth(i)
      await thumb.scrollIntoViewIfNeeded()
      await expect(thumb).toHaveAttribute('data-thumb', 'ready')
    }
    await expect(page.getByTestId('gallery')).not.toContainText(/unknown/i)
  })

  test('arrow keys move the choice and the address follows', async ({ page }) => {
    await page.goto('/lab/charts/?template=us-number-one')
    const first = page.locator('input[type=radio][value="us-number-one"]')
    await expect(first).toBeChecked()
    await first.focus()
    await page.keyboard.press('ArrowRight')
    const next = page.locator('input[type=radio][value="google-number-one"]')
    await expect(next).toBeChecked()
    await expect(next).toBeFocused()
    await expect(page).toHaveURL(/template=google-number-one/)
    await expect(page.locator('canvas[data-rendered^="google-number-one:"]')).toBeVisible()
  })

  test('picking a card brings the chart into view', async ({ page }) => {
    await page.goto('/lab/charts/')
    await expect(page.locator('canvas[data-rendered]')).toBeVisible()
    const card = page.getByTestId('gallery').locator('label', { has: page.locator('input[value="ios-vs-android"]') })
    await card.scrollIntoViewIfNeeded()
    await card.click()
    await expect(page.locator('canvas[data-rendered^="ios-vs-android:"]')).toBeInViewport()
  })

  test('opens a pending template from the address under its own filter', async ({ page }) => {
    await page.goto('/lab/charts/?template=android-native-libs')
    await expect(page.locator('canvas[data-rendered^="android-native-libs:"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Pending verification' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('input[value="android-native-libs"]')).toBeChecked()
  })

  test('About the data states the tracked apps, runs and coverage from the answers', async ({ page }) => {
    const requested = await mockLive(page)
    await page.goto('/lab/charts/?template=us-number-one')
    await expect(page.locator('canvas[data-rendered^="us-number-one:"]')).toBeVisible()
    const about = page.getByTestId('about-data')
    await about.scrollIntoViewIfNeeded()
    await expect(about.getByTestId('tracked-count')).toHaveText('35 apps: 20 iOS, 15 Android.')
    await expect(about.getByTestId('collection')).toContainText('2 runs a day')
    await expect(about.getByTestId('depth')).toContainText('top 100')
    await expect(about.getByTestId('fetched')).toContainText('US Top Free recorded 1 Nov 2026, 12:18 UTC.')
    await expect(about.locator('tr[data-template="us-number-one"]')).toContainText('30 of 30 days have a US rank')
    await about.getByText('Show the 35 tracked apps').click()
    await expect(about.locator('li img')).toHaveCount(35)
    await expect(about).not.toContainText(/unknown/i)
    expect(requested.filter((u) => u.includes('endpoint=apps'))).toHaveLength(1)
    expect(new Set(requested).size).toBe(requested.length)
  })

  for (const theme of ['light', 'dark'] as const) {
    test(`gallery and About the data have no accessibility violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
      await page.goto('/lab/charts/')
      await expect(page.locator('canvas[data-rendered]')).toBeVisible()
      const about = page.getByTestId('about-data')
      await about.scrollIntoViewIfNeeded()
      await about.getByText(/Show the \d+ tracked apps/).click()
      expect(await axe(page)).toEqual([])
    })
  }

  test('on a phone the cards scroll sideways and the page does not', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/lab/charts/')
    await expect(page.locator('canvas[data-rendered]')).toBeVisible()
    const strip = page.getByTestId('gallery').getByRole('radiogroup', { name: 'Templates' })
    const { scroll, client } = await strip.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
    expect(scroll).toBeGreaterThan(client)
    const page_ = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(page_).toBeLessThanOrEqual(0)
  })
})

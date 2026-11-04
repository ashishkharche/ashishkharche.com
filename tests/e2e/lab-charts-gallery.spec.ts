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

  test('groups the templates into Headlines, Leaderboards, Head-to-head and Over time, pending ones last', async ({
    page,
  }) => {
    await page.goto('/lab/charts/')
    const gallery = page.getByTestId('gallery')
    // The data-file templates join once their list has loaded.
    await expect(gallery.locator('input[value="us-rating-countries"]')).toHaveCount(1)
    const titles = await gallery.locator('h3').allInnerTexts()
    expect(titles.map((t) => t.replace(/\s*\d+$/, ''))).toEqual([
      'Headlines',
      'Leaderboards',
      'Head-to-head',
      'Over time',
      'Data files, not live',
      'Pending verification',
    ])
    const cards = gallery.getByRole('radiogroup', { name: 'Templates' }).locator('input[type=radio]')
    expect(await cards.count()).toBeGreaterThanOrEqual(23)
    const pendingGroup = gallery.getByTestId('group-pending')
    await expect(pendingGroup.locator('input[type=radio]')).toHaveCount(2)
    await expect(pendingGroup.getByText('not in the default gallery')).toBeVisible()
    await expect(
      gallery.getByTestId('group-headlines').locator('input[value="chatgpt-number-one-countries"]'),
    ).toHaveCount(1)
    await expect(gallery.getByTestId('group-head-to-head').locator('input[value="widest-gap"]')).toHaveCount(1)
    await expect(gallery.getByTestId('group-over-time').locator('input[value="ai-rank-30-days"]')).toHaveCount(1)
    // Each card shows its question.
    await expect(gallery.getByText('In how many countries is ChatGPT #1?')).toBeVisible()
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

  test('opens a pending template from the address, checked in its group', async ({ page }) => {
    await page.goto('/lab/charts/?template=android-native-libs')
    await expect(page.locator('canvas[data-rendered^="android-native-libs:"]')).toBeVisible()
    await expect(page.getByTestId('group-pending').locator('input[value="android-native-libs"]')).toBeChecked()
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

  test('About the data waits and asks again when the proxy fails or is busy, and never shows an error', async ({
    page,
  }) => {
    // The tracked-apps request fails twice (502), is turned away once (429), then answers.
    let n = 0
    await page.route(/\/api\/tdn\/?\?endpoint=apps&/, (route) => {
      n++
      if (n <= 2) return route.fulfill({ status: 502, json: { error: 'down', code: 'upstream_unavailable' } })
      if (n === 3)
        return route.fulfill({
          status: 429,
          headers: { 'Retry-After': '1' },
          json: { error: 'busy', code: 'rate_limited' },
        })
      return route.fallback()
    })
    await page.goto('/lab/charts/?template=us-number-one')
    const about = page.getByTestId('about-data')
    await about.scrollIntoViewIfNeeded()
    await expect(about.getByRole('status')).toHaveText('Waiting for live data. Asking again…')
    await expect(about.getByTestId('tracked-count')).toHaveText('35 apps: 20 iOS, 15 Android.', { timeout: 20_000 })
    expect(n).toBe(4)
    await expect(page.getByText(/could not be loaded|error/i)).toHaveCount(0)
    await expect(page.getByRole('alert')).toHaveCount(0)
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
    const strip = page.getByTestId('group-headlines').locator('> div').last()
    const { scroll, client } = await strip.evaluate((el) => ({ scroll: el.scrollWidth, client: el.clientWidth }))
    expect(scroll).toBeGreaterThan(client)
    const page_ = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(page_).toBeLessThanOrEqual(0)
  })
})

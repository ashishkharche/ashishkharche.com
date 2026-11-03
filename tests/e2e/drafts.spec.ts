import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { draftPosts, draftsPath } from '../../src/content/drafts'

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']

test('the drafts board is noindex, has no canonical and no og:url', async ({ page }) => {
  const response = await page.goto(draftsPath)
  expect(response?.status()).toBe(200)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow, noarchive')
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  await expect(page.locator('meta[property="og:url"]')).toHaveCount(0)
  await expect(page.locator('[data-draft]')).toHaveCount(draftPosts.length)
})

test('the drafts board is not linked from the home page', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('a[href*="/drafts/"]')).toHaveCount(0)
})

for (const theme of ['light', 'dark'] as const) {
  test(`the drafts board has no accessibility violations (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' })
    await page.goto(draftsPath)
    await page.waitForLoadState('networkidle')
    await page.locator('summary').first().click()
    await expect(page.locator('details').first()).toHaveAttribute('open', '')
    await page.evaluate(() => document.querySelectorAll('details').forEach((d) => (d.open = true)))
    await page.getByRole('button', { name: /^Voice coach/ }).click()
    const results = await new AxeBuilder({ page }).withTags(tags).analyze()
    expect(results.violations.map((v) => `${v.impact} ${v.id}: ${v.nodes.map((n) => n.target.join(' '))}`)).toEqual([])
  })
}

test('filters, search and sort update the list and the URL', async ({ page }) => {
  await page.goto(draftsPath)
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /^Waiting for media/ }).click()
  await expect(page).toHaveURL(/\?status=waiting$/)
  await expect(page.locator('[data-draft]')).toHaveCount(2)
  await expect(page.getByRole('status')).toHaveText(`Showing 2 of ${draftPosts.length} posts.`)
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByLabel('Search', { exact: true }).fill('Time to update')
  await expect(page.locator('[data-draft]')).toHaveCount(1)
  await expect(page).toHaveURL(/q=Time\+to\+update/)
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByLabel('Sort', { exact: true }).selectOption('topic')
  await expect(page).toHaveURL(/sort=topic/)
  await expect(page.getByRole('heading', { level: 2, name: 'Voice coach' })).toBeVisible()
})

test('a linked filter opens filtered, and the index jumps to a post', async ({ page }) => {
  await page.goto(`${draftsPath}?topic=coach`)
  await expect(page.locator('[data-draft]')).toHaveCount(3)
  await expect(page.getByRole('button', { name: /^Voice coach/ })).toHaveAttribute('aria-pressed', 'true')
  const index = page.getByRole('navigation', { name: 'Posts on this page' })
  await index.getByRole('link', { name: 'When the voice coach drops' }).click()
  await expect(page).toHaveURL(/\?topic=coach#wd-b3-4$/)
  await expect(page.locator('#wd-b3-4')).toBeInViewport()
})

test('the filter chips work from the keyboard', async ({ page }) => {
  await page.goto(draftsPath)
  await page.waitForLoadState('networkidle')
  const chip = page.getByRole('button', { name: /^Trainer chat/ })
  await chip.focus()
  await page.keyboard.press('Space')
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('[data-draft]')).toHaveCount(1)
  await page.keyboard.press('Enter')
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
})

test('Copy for LinkedIn puts the post text on the clipboard with blank lines between paragraphs', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const post = draftPosts.find((p) => p.id === 'wd-b3-1')
  if (!post) throw new Error('wd-b3-1 is missing')
  await page.goto(draftsPath)
  await page.waitForLoadState('networkidle')
  const card = page.locator('#wd-b3-1')
  const button = card.getByRole('button', { name: /^Copy for LinkedIn/ })
  await expect(card.getByRole('button', { name: /^Copy for LinkedIn/ })).toHaveCount(1)
  // Keyboard: focus and Enter.
  await button.focus()
  await page.keyboard.press('Enter')
  const status = card.locator('[data-copy-status]')
  await expect(status).toHaveText('Copied')
  await expect(status).toHaveAttribute('aria-live', 'polite')
  const clip = await page.evaluate(async () => {
    const [item] = await navigator.clipboard.read()
    if (!item) return { types: [], plain: '', html: '' }
    return {
      types: item.types,
      plain: await (await item.getType('text/plain')).text(),
      html: await (await item.getType('text/html')).text(),
    }
  })
  expect(clip.types).toEqual(expect.arrayContaining(['text/plain', 'text/html']))
  expect(clip.plain).toBe(post.text)
  expect(clip.plain).toContain('°\u0020and 110°')
  expect(clip.plain.split('\n\n')).toHaveLength(3)
  expect(clip.plain).not.toMatch(/Pexels|BlazePose\./)
  // One <p> per paragraph and no empty spacer paragraphs, so LinkedIn shows one blank line per gap.
  expect(clip.html).toContain('</p><p>')
  expect(clip.html).not.toContain('<p><br></p>')
  expect(clip.html.match(/<p>/g)).toHaveLength(3)
  expect(clip.html).toContain('155°')
  expect(clip.html).toContain('code')
  // The message clears after about 2 s.
  await expect(status).toHaveText('', { timeout: 4000 })
})

test('every post with real text has a Copy for LinkedIn button, and the card shows the gaps', async ({ page }) => {
  await page.goto(draftsPath)
  await page.waitForLoadState('networkidle')
  const withText = draftPosts.filter((p) => !p.textNote)
  await expect(page.getByRole('button', { name: /^Copy for LinkedIn/ })).toHaveCount(withText.length)
  const text = page.locator('[data-li-text="wd-b3-1-desktop"]')
  await expect(text.locator('p')).toHaveCount(3)
  expect(
    await text
      .locator('p')
      .nth(1)
      .evaluate((el) => getComputedStyle(el).marginTop),
  ).toBe('21px')
  expect(
    await text
      .locator('p')
      .first()
      .evaluate((el) => getComputedStyle(el).whiteSpace),
  ).toBe('pre-wrap')
})

test('each image has a full quality PNG download, and the goblet credit is a caption only', async ({
  page,
  request,
}) => {
  await page.goto(draftsPath)
  const links = page.locator('a[data-download-png]')
  const images = draftPosts.flatMap((p) => p.images)
  await expect(links).toHaveCount(images.length)
  for (const img of images) {
    const link = page.locator(`a[data-download-png="${img.pngName}"]`)
    await expect(link).toHaveAttribute('download', img.pngName)
    await expect(link).toHaveAttribute('href', img.png)
    const res = await request.get(img.png)
    expect(res.status(), img.png).toBe(200)
    expect(res.headers()['content-type'], img.png).toContain('image/png')
  }
  await expect(page.locator('#wd-b2-4 [data-caption]')).toHaveText(/Taco Fleur, Wikimedia Commons, CC BY-SA 4\.0\./)
  await expect(page.locator('[data-paste="wd-b2-4"]')).not.toContainText('Taco Fleur')
})

import { expect, test } from '@playwright/test'

// A note card is its picture and its title with the arrow, nothing else: no date, no series line, no summary.
for (const path of ['/', '/notes/']) {
  test(`note cards on ${path} show only the picture and the title`, async ({ page }) => {
    await page.goto(path)
    const cards = page.locator('li').filter({ has: page.locator('[data-note-banner]') })
    expect(await cards.count()).toBeGreaterThan(0)
    for (const card of await cards.all()) {
      await expect(card.locator('p, time')).toHaveCount(0)
      const link = card.getByRole('heading', { level: 3 }).getByRole('link')
      await expect(link).toBeVisible()
      // Only the title: the card's text is the link's text.
      expect((await card.innerText()).trim()).toBe((await link.innerText()).trim())
    }
  })
}

test('each note keeps its summary in the page description for search', async ({ page }) => {
  await page.goto('/notes/')
  const hrefs = await page
    .locator('li [data-note-banner]')
    .locator('xpath=..')
    .getByRole('link')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''))
  expect(hrefs.length).toBeGreaterThan(0)
  for (const href of hrefs) {
    await page.goto(href)
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /\S.{30,}/)
  }
})

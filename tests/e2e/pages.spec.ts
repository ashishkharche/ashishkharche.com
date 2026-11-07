import { expect, test } from '@playwright/test'
import { mockLive } from './live-data'
import { headings, routes } from './routes'

for (const path of routes) {
  test(`${path} loads, has its heading and meta, and logs no errors`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
    })
    page.on('pageerror', (error) => problems.push(error.message))
    // The test server serves static files only; the chart builder's live data proxy is a function, so answer it here.
    await mockLive(page)

    const response = await page.goto(path)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1')).toHaveText(headings[path])
    await expect(page.locator('main#main')).toBeVisible()
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://ashishkharche.com${path}`)
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `https://ashishkharche.com${path}`)
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveCount(1)
    expect(await page.title()).toContain('Ashish Kharche')
    await page.waitForLoadState('networkidle')
    expect(problems).toEqual([])
  })
}

test('unknown paths get the 404 page', async ({ page }) => {
  const response = await page.goto('/no-such-page/')
  expect(response?.status()).toBe(404)
  await expect(page.locator('h1')).toHaveText('Page not found.')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
})

// 404.html is served for any unknown URL, so it has to hydrate there without React errors (it used to log #418).
for (const path of ['/no-such-page/', '/no/such/page']) {
  test(`unknown path ${path} hydrates the 404 page without errors`, async ({ page }) => {
    const problems: string[] = []
    page.on('console', (msg) => {
      // The browser logs the document's own 404 status as an error; anything else counts.
      if (msg.text().startsWith('Failed to load resource: the server responded with a status of 404')) return
      if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
    })
    page.on('pageerror', (error) => problems.push(error.message))
    const failed: string[] = []
    page.on('response', (response) => {
      if (!response.request().isNavigationRequest() && response.status() >= 400) failed.push(response.url())
    })

    const response = await page.goto(path)
    expect(response?.status()).toBe(404)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('h1')).toHaveText('Page not found.')
    await expect(page.locator('main#main')).toBeVisible()
    expect(await page.title()).toBe('Page not found · Ashish Kharche')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    expect(problems).toEqual([])
    expect(failed).toEqual([])

    // Hydrated: client-side navigation works from the 404 page.
    await page.getByRole('link', { name: 'Back to the homepage' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.locator('h1')).toHaveText('Hi, I’m Ashish.')
  })
}

test('links without a trailing slash redirect to the canonical URL', async ({ page }) => {
  await page.goto('/work')
  expect(new URL(page.url()).pathname).toBe('/work/')
})

test('client-side navigation works after hydration', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Notes' }).click()
  await expect(page).toHaveURL(/\/notes\/$/)
  await expect(page.locator('h1')).toHaveText('Notes')
  await expect(page.getByRole('link', { name: 'Notes' }).first()).toHaveAttribute('aria-current', 'page')
})

test('sitemap and robots are served', async ({ request }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text()
  for (const path of routes) expect(sitemap).toContain(`<loc>https://ashishkharche.com${path}</loc>`)
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Sitemap: https://ashishkharche.com/sitemap.xml')
})

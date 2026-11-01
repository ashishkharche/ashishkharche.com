import { expect, test } from '@playwright/test'
import { headings, routes } from './routes'

test.use({ javaScriptEnabled: false })

for (const path of routes) {
  test(`${path} is complete without JavaScript`, async ({ page }) => {
    await page.goto(path)
    await expect(page.locator('h1')).toHaveText(headings[path])
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link')).toHaveCount(4)
    await expect(page.locator('footer')).toContainText('Email')
  })
}

test('diagrams are in the HTML, not drawn by scripts', async ({ page }) => {
  await page.goto('/projects/workout-director/')
  const diagrams = page.locator('figure svg.pele')
  await expect(diagrams).toHaveCount(5)
  for (const svg of await diagrams.all()) {
    await expect(svg).toHaveAttribute('role', 'img')
    expect(await svg.locator('title').textContent()).toBeTruthy()
    expect(await svg.getAttribute('style')).toBeNull()
  }
})

test('the note page has its diagrams and screenshots', async ({ page }) => {
  await page.goto('/notes/workout-director-1/')
  await expect(page.locator('figure svg.pele')).toHaveCount(2)
  await expect(page.locator('figure img')).toHaveCount(3)
})

test('the case study screens are all there without JavaScript, with no dead buttons', async ({ page }) => {
  await page.goto('/projects/workout-director/')
  await expect(page.getByRole('group', { name: 'iPhone screens, scrolls sideways' }).locator('img')).toHaveCount(7)
  await expect(page.getByRole('group', { name: 'iPad screens, scrolls sideways' }).locator('img')).toHaveCount(7)
  await expect(page.getByRole('button', { name: /screens$/ })).toHaveCount(0)
})

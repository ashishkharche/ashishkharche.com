import { expect, test } from '@playwright/test'
import { gotoHydrated } from './hydration'
import { links } from '../../src/content/site'

// A recruiter on the home page should find the app's real links and its stack without scrolling far.
test('the home intro links to the App Store listing and the app website above the fold', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const intro = page.locator('section[aria-labelledby="intro-title"]')
  const store = intro.getByRole('link', { name: 'App Store' })
  const website = intro.getByRole('link', { name: 'workoutdirector.com' })
  await expect(store).toHaveAttribute('href', links.workoutDirectorStore)
  await expect(website).toHaveAttribute('href', links.workoutDirectorSite)
  await expect(intro.getByRole('link', { name: 'Case study' })).toHaveAttribute('href', '/projects/workout-director/')
  await expect(store).toBeInViewport()
  await expect(website).toBeInViewport()
  await expect(intro.getByRole('link', { name: 'Case study' })).toBeInViewport()
  // The stack lives on the Selected work card, not in the intro.
  await expect(intro.getByRole('group', { name: 'Built with' })).toHaveCount(0)
})

test('on a phone the App Store link is in the first screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const intro = page.locator('section[aria-labelledby="intro-title"]')
  await expect(intro.getByRole('link', { name: 'App Store' })).toBeInViewport()
})

test('the Selected work card shows the app type and the stack', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('article').filter({ hasText: 'Workout Director' }).first()
  await expect(card).toContainText('iPhone and iPad app')
  const stack = card.getByRole('group', { name: 'Built with' })
  for (const item of ['SwiftUI', 'MediaPipe BlazePose', 'AWS Lambda', 'DynamoDB'])
    await expect(stack).toContainText(item)
  await expect(card.getByRole('list', { name: 'App' })).toBeVisible()
  await expect(card.getByRole('list', { name: 'Backend' })).toBeVisible()
})

test('the outside links on the project card open their own pages, not the case study', async ({ page }) => {
  await gotoHydrated(page, '/')
  const card = page.locator('article').filter({ hasText: 'Workout Director' }).first()
  for (const href of [links.workoutDirectorStore, links.workoutDirectorSite]) {
    const link = card.locator(`a[href="${href}"]`)
    await link.scrollIntoViewIfNeeded()
    const box = await link.boundingBox()
    if (!box) throw new Error('link is not on the page')
    const hit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('a')?.getAttribute('href'), {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    })
    expect(hit).toBe(href)
  }
})

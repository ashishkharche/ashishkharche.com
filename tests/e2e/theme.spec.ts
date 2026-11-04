import { expect, test } from '@playwright/test'
import { gotoHydrated } from './hydration'

test('the theme toggle switches, is announced and is remembered', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await gotoHydrated(page, '/')
  const toggle = page.getByRole('button', { name: 'Dark theme' })
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  expect(darkBg).not.toBe(lightBg)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(darkBg)
})

test('follows the system setting when nothing is saved', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/about/')
  await expect(page.getByRole('button', { name: 'Dark theme' })).toHaveAttribute('aria-pressed', 'true')
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(12, 13, 14)')
})

test('motion is switched off for people who ask for less', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const names = await page.evaluate(() =>
    [...document.querySelectorAll('h1, article, img')].map((el) => getComputedStyle(el).animationName),
  )
  expect(names.every((name) => name === 'none')).toBe(true)
})

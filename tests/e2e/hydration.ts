import type { Page } from '@playwright/test'

/**
 * Opens a page and waits until React has hydrated it. The app's scripts are only requested after the first paint
 * (src/lib/critical.ts), so a test that clicks or measures right after `load` can run before hydration. TanStack
 * Start removes `self.$_TSR` once the page has hydrated.
 */
export async function gotoHydrated(page: Page, path: string): Promise<void> {
  await page.goto(path)
  await page.waitForFunction(() => !('$_TSR' in self))
}

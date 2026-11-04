import { readFile } from 'node:fs/promises'
import type { Page } from '@playwright/test'
import { fixtureKey, fixtures } from '../fixtures/tdn/index.ts'

const icon = await readFile(new URL('../fixtures/tdn/icon.png', import.meta.url))

/** Answers the live data proxy from the fixtures (shaped like the API reference) and icons from a local file. */
export async function mockLive(page: Page, override?: { status: number; body: unknown }) {
  const requested: string[] = []
  await page.route(/\/api\/tdn\/?\?/, (route) => {
    const url = route.request().url()
    requested.push(url)
    if (override) return route.fulfill({ status: override.status, json: override.body })
    const body = fixtures[fixtureKey(url)]
    return route.fulfill(body ? { json: body } : { status: 404, json: { error: 'Not found', code: 'not_found' } })
  })
  // Icons come from our own origin only: the route answers with a local file (baked icons are real files).
  await page.route(/\/api\/icon\/?\?/, (route) => route.fulfill({ body: icon, contentType: 'image/png' }))
  // The icon hosts must never be asked; fail loudly if they are.
  await page.route(/^https:\/\/(is[1-9]-ssl\.mzstatic\.com|play-lh\.googleusercontent\.com)\//, (route) => {
    requested.push(`EXTERNAL ${route.request().url()}`)
    return route.abort()
  })
  return requested
}

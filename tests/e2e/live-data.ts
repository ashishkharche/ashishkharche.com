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
  await page.route(/^https:\/\/(is[1-5]-ssl\.mzstatic\.com|play-lh\.googleusercontent\.com)\//, (route) =>
    route.fulfill({ body: icon, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' } }),
  )
  return requested
}

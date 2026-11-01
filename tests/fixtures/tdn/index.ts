// Fixture answers for the live data proxy, shaped like the API reference (docs/api, /api/v1/openapi.json).
// The numbers are test values, not real data. Keyed by fixtureKey(url).
import responses from './responses.json' with { type: 'json' }

export const fixtures = responses as Record<string, unknown>

/** "rankings?chart=top-free&country=us&limit=200&store=apple" for /api/tdn?endpoint=rankings&... */
export function fixtureKey(url: string): string {
  const params = new URL(url, 'http://localhost').searchParams
  const endpoint = params.get('endpoint') ?? ''
  const rest = [...params.entries()]
    .filter(([key]) => key !== 'endpoint')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&')
  return `${endpoint}?${rest}`
}

/** A fetch stand-in that answers from the fixtures, or 404 like the API for anything else. */
export function fixtureFetch(overrides: Record<string, { status: number; body: unknown }> = {}) {
  return async (url: string) => {
    const key = fixtureKey(url)
    const override = overrides[key] ?? overrides[key.split('?')[0] ?? '']
    if (override) return { ok: override.status < 400, status: override.status, json: async () => override.body }
    const body = fixtures[key]
    if (body === undefined) {
      return { ok: false, status: 404, json: async () => ({ error: `No fixture for ${key}`, code: 'not_found' }) }
    }
    return { ok: true, status: 200, json: async () => structuredClone(body) }
  }
}

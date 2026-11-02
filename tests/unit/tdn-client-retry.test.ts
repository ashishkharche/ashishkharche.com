// The page's live data client never turns a passing 429 into an error on screen: it asks again after the proxy's
// Retry-After (at most 10 s) a few times, and keeps at most three requests on their way, so a page of thumbnails
// asks in turn. 5xx answers go straight to the caller, which shows "Asking again…" and retries on its own.
import { describe, expect, it } from 'vitest'
import { createTdnClient, PAGE_CLIENT, TdnError } from '~/lib/charts/tdn'

type Answer = { status: number; body?: unknown; retryAfter?: string }

function server(answers: (url: string, n: number) => Answer) {
  const seen: string[] = []
  let active = 0
  let most = 0
  const fetcher = async (url: string) => {
    seen.push(url)
    active++
    most = Math.max(most, active)
    await new Promise((r) => setTimeout(r, 5))
    active--
    const a = answers(url, seen.filter((u) => u === url).length)
    return {
      ok: a.status >= 200 && a.status < 300,
      status: a.status,
      json: async () => a.body ?? { data: [] },
      headers: { get: (name: string) => (name.toLowerCase() === 'retry-after' ? (a.retryAfter ?? null) : null) },
    }
  }
  return { fetcher, seen, most: () => most }
}

describe('page client', () => {
  it('asks again after a 429, waiting the Retry-After it was given, and answers', async () => {
    const waits: number[] = []
    const s = server((_, n) => (n < 3 ? { status: 429, retryAfter: '2' } : { status: 200, body: { data: [1] } }))
    const client = createTdnClient(s.fetcher, { ...PAGE_CLIENT, sleep: async (ms) => void waits.push(ms) })
    await expect(client.get('movers')).resolves.toEqual({ data: [1] })
    expect(s.seen.length).toBe(3)
    expect(waits).toEqual([2000, 2000])
  })

  it('caps a long Retry-After at 10 s and gives up after three retries, leaving the rest to the caller', async () => {
    const waits: number[] = []
    const s = server(() => ({ status: 429, retryAfter: '3600', body: { error: 'busy', code: 'rate_limited' } }))
    const client = createTdnClient(s.fetcher, { ...PAGE_CLIENT, sleep: async (ms) => void waits.push(ms) })
    const error = await client.get('movers').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TdnError)
    expect((error as TdnError).status).toBe(429)
    expect(waits).toEqual([10_000, 10_000, 10_000])
    expect(s.seen.length).toBe(4)
    // A failed request is not kept: the caller's next try sends it again.
    await client.get('movers').catch(() => {})
    expect(s.seen.length).toBe(8)
  })

  it('uses its own waits when there is no Retry-After, and retries a request that never arrived', async () => {
    const waits: number[] = []
    let n = 0
    const fetcher = async () => {
      n++
      if (n === 1) throw new TypeError('Failed to fetch')
      if (n === 2) return { ok: false, status: 429, json: async () => ({}), headers: { get: () => null } }
      return { ok: true, status: 200, json: async () => ({ data: [2] }), headers: { get: () => null } }
    }
    const client = createTdnClient(fetcher, { ...PAGE_CLIENT, sleep: async (ms) => void waits.push(ms) })
    await expect(client.get('apps', { limit: 500 })).resolves.toEqual({ data: [2] })
    expect(waits).toEqual([1000, 3000])
  })

  it('passes a 5xx straight to the caller', async () => {
    const s = server(() => ({ status: 502, body: { error: 'down', code: 'upstream_unavailable' } }))
    const client = createTdnClient(s.fetcher, { ...PAGE_CLIENT, sleep: async () => {} })
    await expect(client.get('movers')).rejects.toMatchObject({ status: 502 })
    expect(s.seen.length).toBe(1)
  })

  it('keeps at most three requests on their way, and sends identical requests once', async () => {
    const s = server(() => ({ status: 200 }))
    const client = createTdnClient(s.fetcher, PAGE_CLIENT)
    const ids = Array.from({ length: 16 }, (_, i) => String(1000 + i))
    await Promise.all([...ids, ...ids].map((id) => client.get('app', { id })))
    expect(s.seen.length).toBe(16)
    expect(s.most()).toBe(3)
  })

  it('without options (tests, scripts) sends everything at once and never retries', async () => {
    const s = server(() => ({ status: 429 }))
    const client = createTdnClient(s.fetcher)
    await Promise.all(['1', '2', '3', '4', '5'].map((id) => client.get('app', { id }).catch(() => {})))
    expect(s.seen.length).toBe(5)
    expect(s.most()).toBe(5)
  })
})

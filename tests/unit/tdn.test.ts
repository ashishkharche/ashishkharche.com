import { beforeEach, describe, expect, it } from 'vitest'
import { CACHE, checkRequest, handle, resetLimits } from '../../api/tdn'

const q = (s: string) => checkRequest(new URLSearchParams(s))
const env = { TDN_API_KEY: 'tdn_test_only' }

interface Call {
  url: string
  auth: string | null
  method: string | undefined
}

function mock(response: () => Response | Promise<Response>) {
  const calls: Call[] = []
  const fetcher = (async (url: string, init?: RequestInit) => {
    calls.push({ url, auth: new Headers(init?.headers).get('Authorization'), method: init?.method })
    return response()
  }) as typeof fetch
  return { calls, fetcher }
}

const upstreamHeaders = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, max-age=60',
  'RateLimit-Limit': '60',
  'RateLimit-Remaining': '59',
  'RateLimit-Reset': '30',
  RateLimit: 'limit=60, remaining=59, reset=30',
  'RateLimit-Policy': '60;w=60',
  'Set-Cookie': 'session=abc; HttpOnly',
  'Access-Control-Allow-Origin': '*',
}

const rankingsBody = {
  data: [{ rank: 1, appId: '6448311069', store: 'apple', name: 'ChatGPT', developer: 'OpenAI', iconUrl: 'x' }],
  meta: { store: 'apple', country: 'us', chart: 'top-free', recordedAt: '2026-11-01 00:18:03', count: 1 },
}

const get = (search: string, init?: RequestInit) => new Request(`https://site.test/api/tdn?${search}`, init)

beforeEach(() => resetLimits())

describe('allowlist', () => {
  it('maps each endpoint to its upstream path', () => {
    expect(q('endpoint=rankings&store=apple&country=us&chart=top-free&limit=5')).toMatchObject({
      ok: true,
      path: '/rankings',
      search: '?chart=top-free&country=us&limit=5&store=apple',
      cache: CACHE.hourly,
    })
    expect(q('endpoint=app&id=6670324846&store=apple&country=gb')).toMatchObject({ path: '/apps/6670324846' })
    expect(q('endpoint=app-rankings&id=ai.x.grok&store=google&chart_type=top-paid')).toMatchObject({
      path: '/apps/ai.x.grok/rankings',
    })
    expect(q('endpoint=rank-history&id=6670324846&countries=us,gb&days=30')).toMatchObject({
      path: '/apps/6670324846/rank-history',
      search: '?countries=us%2Cgb&days=30',
    })
    expect(q('endpoint=export&id=6670324846&days=7')).toMatchObject({
      path: '/apps/6670324846/export',
      search: '?days=7&format=json&type=snapshots',
    })
    expect(q('endpoint=compare&apps=chatgpt,claude&days=30')).toMatchObject({ path: '/compare', units: 3 })
    expect(q('endpoint=charts&store=apple&type=top-grossing&country=us')).toMatchObject({ path: '/charts' })
    expect(q('endpoint=movers&country=us&limit=10')).toMatchObject({ path: '/movers', cache: CACHE.hourly })
    expect(q('endpoint=tech-stack&limit=20')).toMatchObject({ path: '/tech-stack', cache: CACHE.slow })
    expect(q('endpoint=tech-stack-app&id=ai.x.grok&store=google')).toMatchObject({
      path: '/tech-stack/ai.x.grok',
      cache: CACHE.slow,
    })
    expect(q('endpoint=sdk-adoption&sdk=Firebase&limit=20')).toMatchObject({ path: '/sdk-adoption', units: 2 })
  })

  it('refuses unknown endpoints and paths that are not on the list', () => {
    for (const name of ['admin', 'toString', '__proto__', 'auth', 'console', 'mcp', 'notes', 'apps', 'search', '']) {
      expect(q(`endpoint=${name}`)).toMatchObject({ ok: false, status: 400, error: 'Unknown endpoint' })
    }
    expect(q('')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=rankings&endpoint=movers')).toMatchObject({ ok: false, status: 400 })
    expect(q('path=/api/auth/session')).toMatchObject({ ok: false, status: 400 })
  })

  it('refuses unknown or repeated parameters', () => {
    expect(q('endpoint=rankings&key=abc')).toMatchObject({ ok: false, error: 'Parameter key is not allowed' })
    expect(q('endpoint=rankings&url=https://evil.test')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=rankings&store=apple&store=google')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=tech-stack&store=apple')).toMatchObject({ ok: false, status: 400 })
  })
})

describe('validation', () => {
  it('checks enums', () => {
    expect(q('endpoint=rankings&store=amazon')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=rankings&chart=top-new')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=export&id=1&type=versions')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=export&id=1&format=csv')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=charts&store=apple&collection=TOP_FREE')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=charts&store=google&type=top-free')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=charts&store=google&collection=TOP_FREE')).toMatchObject({ ok: false, status: 400 })
    expect(q('endpoint=charts&store=apple&type=top-new')).toMatchObject({ ok: false, status: 400 })
  })

  it('checks integer ranges', () => {
    for (const bad of ['0', '201', '-1', '1.5', '05', '1e2', ' 5', 'abc', '']) {
      expect(q(`endpoint=rankings&limit=${encodeURIComponent(bad)}`)).toMatchObject({ ok: false, status: 400 })
    }
    expect(q('endpoint=rankings&limit=1')).toMatchObject({ ok: true })
    expect(q('endpoint=rankings&limit=200')).toMatchObject({ ok: true })
    expect(q('endpoint=rank-history&id=1&days=730')).toMatchObject({ ok: true })
    expect(q('endpoint=rank-history&id=1&days=731')).toMatchObject({ ok: false })
    expect(q('endpoint=compare&apps=a&days=366')).toMatchObject({ ok: false })
    expect(q('endpoint=movers&limit=51')).toMatchObject({ ok: false })
    expect(q('endpoint=charts&limit=101')).toMatchObject({ ok: false })
    expect(q('endpoint=tech-stack&limit=500')).toMatchObject({ ok: true })
    expect(q('endpoint=sdk-adoption&sdk=Firebase&limit=51')).toMatchObject({ ok: false })
  })

  it('checks ids so they cannot leave the app path', () => {
    for (const bad of ['../../admin', '..', '.', '.hidden', 'a/b', 'a%2Fb', 'a b', 'a?x=1', 'x'.repeat(201)]) {
      expect(q(`endpoint=app-rankings&id=${encodeURIComponent(bad)}`)).toMatchObject({ ok: false, status: 400 })
    }
    expect(q('endpoint=app')).toMatchObject({ ok: false, error: 'Parameter id is required' })
  })

  it('checks countries against our list', () => {
    expect(q('endpoint=rankings&country=usa')).toMatchObject({ ok: false })
    expect(q('endpoint=rankings&country=US')).toMatchObject({ ok: false })
    expect(q('endpoint=rankings&country=zz')).toMatchObject({ ok: false })
    expect(q('endpoint=rank-history&id=1&countries=us,gb,de,fr,jp,in,br,ca,au,es')).toMatchObject({ ok: true })
    expect(q('endpoint=rank-history&id=1&countries=us,gb,de,fr,jp,in,br,ca,au,es,it')).toMatchObject({ ok: false })
    expect(q('endpoint=rank-history&id=1&countries=us,us')).toMatchObject({ ok: false })
    expect(q('endpoint=rank-history&id=1&countries=us,zz')).toMatchObject({ ok: false })
  })

  it('checks lists, dates and the rules across parameters', () => {
    const twenty = Array.from({ length: 20 }, (_, i) => `app${i}`).join(',')
    expect(q(`endpoint=compare&apps=${twenty}`)).toMatchObject({ ok: true })
    expect(q(`endpoint=compare&apps=${twenty},app20`)).toMatchObject({ ok: false })
    expect(q('endpoint=compare')).toMatchObject({ ok: false, error: 'Parameter apps is required' })
    expect(q('endpoint=rank-history&id=1&from=2026-01-01&to=2026-02-01')).toMatchObject({ ok: true })
    expect(q('endpoint=rank-history&id=1&from=2026-01-01')).toMatchObject({ ok: false })
    expect(q('endpoint=rank-history&id=1&from=2026-02-30&to=2026-03-01')).toMatchObject({ ok: false })
    expect(q('endpoint=rank-history&id=1&from=2026-02-01&to=2026-01-01')).toMatchObject({ ok: false })
    expect(q('endpoint=rank-history&id=1&from=2023-01-01&to=2026-01-01')).toMatchObject({ ok: false })
    expect(q('endpoint=rank-history&id=1&days=30&from=2026-01-01&to=2026-01-02')).toMatchObject({ ok: false })
    expect(q('endpoint=sdk-adoption')).toMatchObject({ ok: false, error: 'Parameter sdk is required' })
    expect(q('endpoint=rankings&cursor=eyJvIjoyfQ')).toMatchObject({ ok: true })
    expect(q(`endpoint=rankings&cursor=${'a'.repeat(65)}`)).toMatchObject({ ok: false })
    expect(q('endpoint=rankings&category=a%20b')).toMatchObject({ ok: false })
  })
})

describe('handler', () => {
  it('answers only GET and HEAD, without calling upstream', async () => {
    const { calls, fetcher } = mock(() => new Response('{}'))
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const res = await handle(get('endpoint=rankings', { method }), env, fetcher)
      expect(res.status).toBe(405)
      expect(res.headers.get('Allow')).toBe('GET, HEAD')
    }
    expect(calls).toEqual([])
  })

  it('answers 400 for disallowed paths and bad values without calling upstream', async () => {
    const { calls, fetcher } = mock(() => new Response('{}'))
    for (const search of ['endpoint=auth', 'endpoint=mcp', 'endpoint=rankings&limit=500', 'endpoint=app&id=..']) {
      const res = await handle(get(search), env, fetcher)
      expect(res.status).toBe(400)
      expect(res.headers.get('Cache-Control')).toBe('no-store')
      expect(await res.json()).toMatchObject({ code: 'bad_request' })
    }
    expect(calls).toEqual([])
  })

  it('says live data is not configured without the key', async () => {
    const { calls, fetcher } = mock(() => new Response('{}'))
    const res = await handle(get('endpoint=rankings'), {}, fetcher)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'Live data is not configured', code: 'not_configured' })
    expect(calls).toEqual([])
  })

  it('adds the key upstream, sets our cache header and strips upstream headers', async () => {
    const { calls, fetcher } = mock(() => new Response(JSON.stringify(rankingsBody), { headers: upstreamHeaders }))
    const res = await handle(get('endpoint=rankings&store=apple&country=us&limit=5'), env, fetcher)
    expect(res.status).toBe(200)
    expect(calls).toEqual([
      {
        url: 'https://techdevnotes.com/api/v1/rankings?country=us&limit=5&store=apple',
        auth: 'Bearer tdn_test_only',
        method: 'GET',
      },
    ])
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=3600, stale-while-revalidate=86400')
    const names = [...res.headers.keys()]
    expect(names.filter((n) => n.startsWith('ratelimit'))).toEqual([])
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull()
    const text = await res.text()
    expect(text).not.toContain('tdn_test_only')
    expect(JSON.parse(text).meta.recordedAt).toBe('2026-11-01 00:18:03')
  })

  it('caches tech stack and SDK answers for longer', async () => {
    const { fetcher } = mock(() => new Response('{"data":[],"meta":{}}', { headers: upstreamHeaders }))
    for (const search of [
      'endpoint=tech-stack',
      'endpoint=tech-stack-app&id=ai.x.grok&store=google',
      'endpoint=sdk-adoption&sdk=Firebase',
    ]) {
      const res = await handle(get(search), env, fetcher)
      expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=21600, stale-while-revalidate=86400')
    }
  })

  it('answers HEAD with the headers and no body', async () => {
    const { fetcher } = mock(() => new Response(JSON.stringify(rankingsBody), { headers: upstreamHeaders }))
    const res = await handle(get('endpoint=movers&country=us', { method: 'HEAD' }), env, fetcher)
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe(CACHE.hourly)
    expect(await res.text()).toBe('')
  })

  it('passes rate limits through with Retry-After and without RateLimit headers', async () => {
    const { fetcher } = mock(
      () =>
        new Response('{"error":"slow down","code":"rate_limited"}', {
          status: 429,
          headers: { ...upstreamHeaders, 'Retry-After': '17' },
        }),
    )
    const res = await handle(get('endpoint=charts&store=apple&country=gb'), env, fetcher)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('17')
    expect(res.headers.get('Cache-Control')).toBe('no-store')
    expect([...res.headers.keys()].filter((n) => n.startsWith('ratelimit'))).toEqual([])
  })

  it('turns upstream errors and timeouts into clean JSON errors', async () => {
    const server = mock(() => new Response('<html>Bad gateway</html>', { status: 503, headers: upstreamHeaders }))
    const a = await handle(get('endpoint=movers'), env, server.fetcher)
    expect(a.status).toBe(502)
    expect(await a.json()).toEqual({ error: 'The data service returned an error', code: 'upstream_error' })
    expect(a.headers.get('Set-Cookie')).toBeNull()

    const timeout = mock(() => Promise.reject(new DOMException('The operation timed out', 'TimeoutError')))
    const b = await handle(get('endpoint=movers'), env, timeout.fetcher)
    expect(b.status).toBe(504)
    expect(await b.json()).toMatchObject({ code: 'upstream_timeout' })

    const down = mock(() => Promise.reject(new TypeError('fetch failed')))
    const c = await handle(get('endpoint=movers'), env, down.fetcher)
    expect(c.status).toBe(502)

    const html = mock(() => new Response('<html></html>', { status: 200 }))
    const d = await handle(get('endpoint=movers'), env, html.fetcher)
    expect(d.status).toBe(502)

    const missing = mock(() => new Response('{"error":"Not found","code":"not_found"}', { status: 404 }))
    const e = await handle(get('endpoint=app&id=123'), env, missing.fetcher)
    expect(e.status).toBe(404)
    expect(e.headers.get('Cache-Control')).toBe('public, s-maxage=600')

    const unauthorized = mock(() => new Response('{"error":"bad key","code":"unauthorized"}', { status: 401 }))
    const f = await handle(get('endpoint=movers'), env, unauthorized.fetcher)
    expect(f.status).toBe(502)
    expect(await f.text()).not.toContain('key')
  })

  it('stops itself before the upstream per-minute limit', async () => {
    const { calls, fetcher } = mock(() => new Response('{"data":[]}'))
    const statuses: number[] = []
    for (let i = 0; i < 55; i++) statuses.push((await handle(get('endpoint=movers'), env, fetcher)).status)
    expect(calls.length).toBe(50)
    expect(statuses.at(-1)).toBe(429)
  })
})

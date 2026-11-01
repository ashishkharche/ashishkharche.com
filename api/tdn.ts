// Read-only proxy for the chart builder's live data mode: /api/tdn?endpoint=rankings&store=apple&country=us
//
// The upstream API sends no CORS headers and needs a bearer key, so the browser cannot call it directly. This
// function adds the key on the server. It needs two environment variables on the Vercel project, set by the site
// owner: TDN_API_KEY (the bearer key) and TDN_API_ORIGIN (the API's https origin). Without them every request gets
// a 503 "not configured" answer. The key is never logged, echoed or sent back.
//
// Only GET, only the endpoints below, and only the listed query parameters, each checked against a pattern.

type Params = Record<string, RegExp>

interface Endpoint {
  /** Upstream path. `{id}` is filled from the `id` parameter. */
  path: string
  params: Params
  required?: string[]
}

const store = /^(apple|google)$/
const country = /^[a-z]{2}$/
const id = /^[A-Za-z0-9._-]{1,200}$/
const limit200 = /^([1-9]|[1-9][0-9]|1[0-9][0-9]|200)$/
const limit50 = /^([1-9]|[1-4][0-9]|50)$/
const word = /^[a-z0-9-]{1,60}$/
const cursor = /^[A-Za-z0-9_=-]{1,200}$/

export const endpoints: Record<string, Endpoint> = {
  apps: { path: '/api/v1/apps', params: { store, q: /^[\p{L}\p{N} ._'-]{1,80}$/u, limit: limit200, cursor } },
  'tech-stack': { path: '/api/v1/tech-stack', params: { store, limit: limit200, cursor } },
  'tech-stack-app': {
    path: '/api/v1/tech-stack/{id}',
    params: { id, store, version: /^[A-Za-z0-9._-]{1,40}$/ },
    required: ['id'],
  },
  'sdk-adoption': { path: '/api/v1/sdk-adoption', params: { sdk: word, store, limit: limit50 }, required: ['sdk'] },
  rankings: {
    path: '/api/v1/rankings',
    params: { store, country, chart: /^(top-free|top-paid|top-grossing)$/, category: word, limit: limit200, cursor },
  },
  'app-rankings': {
    path: '/api/v1/apps/{id}/rankings',
    params: { id, store, chart_type: /^(top-free|top-paid|top-grossing)$/ },
    required: ['id'],
  },
  charts: {
    path: '/api/v1/charts',
    params: { store: /^apple$/, country, category: word, type: word, collection: word, limit: limit200 },
  },
}

export type Checked = { ok: true; path: string; search: string } | { ok: false; status: number; error: string }

/** Turns the proxy's query string into an upstream path and query, or says what is wrong with it. */
export function checkRequest(query: URLSearchParams): Checked {
  const name = query.get('endpoint') ?? ''
  const endpoint = Object.hasOwn(endpoints, name) ? endpoints[name] : undefined
  if (!endpoint) return { ok: false, status: 404, error: 'Unknown endpoint' }
  const upstream = new URLSearchParams()
  let path = endpoint.path
  const seen = new Set<string>()
  for (const [key, value] of query) {
    if (key === 'endpoint') continue
    if (seen.has(key)) return { ok: false, status: 400, error: `Parameter ${key} is given more than once` }
    seen.add(key)
    const pattern = Object.hasOwn(endpoint.params, key) ? endpoint.params[key] : undefined
    if (!pattern) return { ok: false, status: 400, error: `Parameter ${key} is not allowed` }
    if (!pattern.test(value)) return { ok: false, status: 400, error: `Parameter ${key} is not valid` }
    if (key === 'id') path = path.replace('{id}', encodeURIComponent(value))
    else upstream.set(key, value)
  }
  for (const key of endpoint.required ?? []) {
    if (!seen.has(key)) return { ok: false, status: 400, error: `Parameter ${key} is required` }
  }
  upstream.sort()
  const search = upstream.toString()
  return { ok: true, path, search: search ? `?${search}` : '' }
}

const cacheControl = 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600'

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': status === 200 ? cacheControl : 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  })
}

// Per-instance cache and rate limit. The upstream free tier allows 60 requests a minute; stay under it.
const cache = new Map<string, { at: number; body: string }>()
const CACHE_MS = 10 * 60 * 1000
const CACHE_MAX = 200
let tokens = 50
let refilled = Date.now()

function take(now: number): boolean {
  tokens = Math.min(50, tokens + ((now - refilled) / 60_000) * 50)
  refilled = now
  if (tokens < 1) return false
  tokens -= 1
  return true
}

export interface Env {
  TDN_API_KEY?: string | undefined
  TDN_API_ORIGIN?: string | undefined
}

export async function handle(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET')
    return json(405, { error: 'Only GET is allowed', code: 'method_not_allowed' }, { Allow: 'GET' })
  const checked = checkRequest(new URL(request.url).searchParams)
  if (!checked.ok) return json(checked.status, { error: checked.error, code: 'bad_request' })
  const key = env.TDN_API_KEY
  const origin = env.TDN_API_ORIGIN
  if (!key || !origin || !/^https:\/\/[a-z0-9.-]+$/.test(origin)) {
    return json(503, { error: 'Live data is not configured', code: 'not_configured' })
  }
  const target = `${checked.path}${checked.search}`
  const now = Date.now()
  const hit = cache.get(target)
  if (hit && now - hit.at < CACHE_MS) return new Response(hit.body, { status: 200, headers: okHeaders('HIT') })
  if (!take(now))
    return json(
      429,
      { error: 'Too many requests, try again in a minute', code: 'rate_limited' },
      { 'Retry-After': '60' },
    )
  let upstream: Response
  try {
    upstream = await fetcher(`${origin}${target}`, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(8000),
    })
  } catch {
    return json(502, { error: 'The data service did not answer', code: 'upstream_unavailable' })
  }
  if (upstream.status === 429) {
    return json(
      429,
      { error: 'The data service is busy, try again later', code: 'rate_limited' },
      {
        'Retry-After': upstream.headers.get('Retry-After') ?? '60',
      },
    )
  }
  if (!upstream.ok) {
    const status = upstream.status === 404 ? 404 : 502
    return json(status, {
      error: status === 404 ? 'Not found' : 'The data service returned an error',
      code: 'upstream_error',
    })
  }
  const body = await upstream.text()
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
  cache.set(target, { at: now, body })
  return new Response(body, { status: 200, headers: okHeaders('MISS') })
}

function okHeaders(state: string): Record<string, string> {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'X-Proxy-Cache': state,
  }
}

const env = (): Env => ({ TDN_API_KEY: process.env.TDN_API_KEY, TDN_API_ORIGIN: process.env.TDN_API_ORIGIN })

export function GET(request: Request): Promise<Response> {
  return handle(request, env())
}

const notAllowed = (request: Request): Promise<Response> => handle(request, env())
export { notAllowed as POST, notAllowed as PUT, notAllowed as PATCH, notAllowed as DELETE }

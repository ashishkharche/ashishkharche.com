// Read-only proxy for the chart builder's live data: /api/tdn?endpoint=rankings&store=apple&country=us&limit=5
//
// The upstream API (https://techdevnotes.com/api/v1, see /api/v1/openapi.json there) sends no CORS headers and needs
// a bearer key, so the browser cannot call it directly. This Vercel function adds the key on the server. The key comes
// from the TDN_API_KEY environment variable on the Vercel project; without it every request gets 503 not_configured.
// The key is never logged, echoed or sent back.
//
// - GET and HEAD only; everything else is 405.
// - A fixed list of endpoints and query parameters, each value checked (enums, integer ranges, id format, a country
//   allowlist) before anything is sent upstream, because upstream 400s and 404s still cost units. Anything else is 400.
// - Our own cache headers (the upstream sends private, max-age=60): Vercel-CDN-Cache-Control for Vercel's CDN (an hour,
//   or six for slow-moving answers, then stale-while-revalidate for a day and stale-if-error for a week), and a short
//   Cache-Control max-age for the browser. Only a fixed set of headers is sent back, so the upstream RateLimit-* and
//   Set-Cookie headers never reach the browser, and nothing here sets a cookie or a Vary header, which would stop the
//   CDN from caching. No CORS headers: same origin only.
// - The CDN cache is kept per region and per deployment (https://vercel.com/docs/caching/cdn-cache#limits,
//   https://vercel.com/docs/caching/cdn-cache/purge#cache-keys), so after a deploy, and in each region, the first
//   request for an answer reaches this function. Each warm instance therefore also answers from memory while its copy
//   is fresh, and sends one upstream request for any number of identical requests that arrive together.
// - The upstream body is passed through unchanged, so meta.recordedAt / capturedAt stay in it.
// - Stale on error, at two levels, so the chart builder always gets an answer when there has ever been one:
//   the CDN keeps each answer an hour and may serve it for a week after that if this function fails
//   (stale-if-error), and each warm instance keeps the last good answer per request and sends it when the source
//   fails, times out or is rate limited. Every answer says when it was fetched (X-TDN-Fetched-At, ISO UTC); a kept
//   copy also says X-TDN-Stale: 1. The data time inside the answer (meta.recordedAt) is never changed.

const UPSTREAM = 'https://techdevnotes.com/api/v1'
const TIMEOUT_MS = 8000

/** Returns an error message, or null when the value is fine. */
type Check = (value: string) => string | null

const oneOf =
  (...values: string[]): Check =>
  (v) =>
    values.includes(v) ? null : `must be one of ${values.join(', ')}`

const int =
  (min: number, max: number): Check =>
  (v) =>
    /^[1-9][0-9]{0,3}$/.test(v) && Number(v) >= min && Number(v) <= max ? null : `must be a whole number ${min}-${max}`

const pattern =
  (re: RegExp, what: string): Check =>
  (v) =>
    re.test(v) ? null : `must be ${what}`

/**
 * Countries the chart builder may ask for. The API has no endpoint that lists the countries it collects, so this is
 * our own list of large App Store / Google Play storefronts (ISO 3166-1 alpha-2, lowercase).
 */
export const COUNTRIES: readonly string[] = [
  'us',
  'gb',
  'ca',
  'au',
  'nz',
  'ie',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'be',
  'at',
  'ch',
  'se',
  'no',
  'dk',
  'fi',
  'pl',
  'pt',
  'cz',
  'gr',
  'tr',
  'il',
  'ae',
  'sa',
  'eg',
  'za',
  'ng',
  'ke',
  'in',
  'pk',
  'bd',
  'id',
  'my',
  'sg',
  'th',
  'vn',
  'ph',
  'jp',
  'kr',
  'tw',
  'hk',
  'cn',
  'br',
  'mx',
  'ar',
  'cl',
  'co',
  'pe',
  'ua',
  'ro',
  'hu',
]

const country: Check = (v) => (COUNTRIES.includes(v) ? null : 'is not a supported country')
const store = oneOf('apple', 'google')
const chart = oneOf('top-free', 'top-paid', 'top-grossing')
const category = pattern(/^[A-Za-z0-9_-]{1,40}$/, 'letters, digits, _ or -, up to 40')
const cursor = pattern(/^[A-Za-z0-9_=-]{1,64}$/, 'a cursor from meta.nextCursor')
/** App store ids: numeric App Store ids, Play package names, or tracked slugs. Never starts with a dot. */
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/
const date = /^\d{4}-\d{2}-\d{2}$/

const countries: Check = (v) => {
  const list = v.split(',')
  if (v.length > 64 || list.length > 10) return 'must list at most 10 countries'
  if (new Set(list).size !== list.length) return 'must not repeat a country'
  const bad = list.find((c) => !COUNTRIES.includes(c))
  return bad === undefined ? null : `has an unsupported country: ${bad.slice(0, 8)}`
}

const apps: Check = (v) => {
  const list = v.split(',')
  if (v.length > 600 || list.length > 20) return 'must list at most 20 apps'
  if (new Set(list).size !== list.length) return 'must not repeat an app'
  return list.every((a) => ID.test(a)) ? null : 'has an app id that is not valid'
}

const isoDay = (v: string): number | null => {
  if (!date.test(v)) return null
  const t = Date.parse(`${v}T00:00:00Z`)
  return Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== v ? null : t
}
const day: Check = (v) => (isoDay(v) === null ? 'must be a date YYYY-MM-DD' : null)

/** How long an answer stays fresh, in seconds. Rankings move twice a day; tech stacks every few hours at most. */
export const FRESH = { hourly: 3600, slow: 21600 } as const

/** Vercel's CDN: fresh for `seconds`, then served stale while it is fetched again, and on errors for a week. */
export const cdnCache = (seconds: number): string =>
  `public, max-age=${Math.max(1, Math.round(seconds))}, stale-while-revalidate=86400, stale-if-error=604800`

/** What Vercel's CDN is told, per endpoint group (Vercel-CDN-Cache-Control). */
export const CACHE = { hourly: cdnCache(FRESH.hourly), slow: cdnCache(FRESH.slow) } as const

/** What the browser is told: a minute, so a reload or a second tab reuses the answer and the CDN keeps the rest. */
export const BROWSER_CACHE = 'public, max-age=60'

/** A kept copy is cached briefly, so the CDN asks again soon and a fresh answer replaces it. */
const KEPT_CDN_CACHE = 'public, max-age=300'

interface Endpoint {
  /** Upstream path under /api/v1. `{id}` is filled from the `id` parameter. */
  path: string
  params: Record<string, Check>
  required?: string[]
  /** Parameters always sent upstream, which the caller may leave out or must give with exactly this value. */
  fixed?: Record<string, string>
  cache: keyof typeof CACHE
  /** Upstream unit cost per call (from the API docs). */
  units: number
  /** Extra checks across parameters. */
  extra?: (params: Map<string, string>) => string | null
}

export const ENDPOINTS: Record<string, Endpoint> = {
  rankings: {
    path: '/rankings',
    params: { store, country, chart, category, limit: int(1, 200), cursor },
    cache: 'hourly',
    units: 1,
  },
  app: {
    path: '/apps/{id}',
    params: { id: pattern(ID, 'an app id'), store, country },
    required: ['id'],
    cache: 'hourly',
    units: 1,
  },
  'app-rankings': {
    path: '/apps/{id}/rankings',
    params: { id: pattern(ID, 'an app id'), store, chart_type: chart },
    required: ['id'],
    cache: 'hourly',
    units: 1,
  },
  'rank-history': {
    path: '/apps/{id}/rank-history',
    params: { id: pattern(ID, 'an app id'), store, countries, chart, category, days: int(1, 730), from: day, to: day },
    required: ['id'],
    cache: 'hourly',
    units: 1,
    extra: (p) => {
      const from = p.get('from')
      const to = p.get('to')
      if (p.has('days') && (from !== undefined || to !== undefined)) return 'Use either days or from and to, not both'
      if ((from === undefined) !== (to === undefined)) return 'Parameters from and to go together'
      if (from !== undefined && to !== undefined) {
        const span = ((isoDay(to) ?? 0) - (isoDay(from) ?? 0)) / 86_400_000
        if (span < 0 || span > 730) return 'Parameters from and to must be 0-730 days apart, from first'
      }
      return null
    },
  },
  export: {
    path: '/apps/{id}/export',
    params: { id: pattern(ID, 'an app id'), store, type: oneOf('snapshots'), format: oneOf('json'), days: int(1, 730) },
    required: ['id'],
    fixed: { type: 'snapshots', format: 'json' },
    cache: 'hourly',
    units: 1,
  },
  compare: {
    path: '/compare',
    params: { apps, days: int(1, 365), store, country },
    required: ['apps'],
    cache: 'hourly',
    units: 3,
  },
  charts: {
    path: '/charts',
    // Apple only: Google Play charts are not collected upstream (TOP_FREE and TOP_PAID answer 404, anything else
    // 400), and every 400 or 404 still costs units. For Google ranks use rankings with store=google.
    params: { store: oneOf('apple'), country, category, type: chart, limit: int(1, 100) },
    cache: 'hourly',
    units: 1,
  },
  // The tracked (active) apps the source collects ranks and ratings for. Rarely changes, so cached like tech-stack.
  apps: { path: '/apps', params: { store, limit: int(1, 500), cursor }, cache: 'slow', units: 1 },
  movers: { path: '/movers', params: { country, chart, limit: int(1, 50) }, cache: 'hourly', units: 1 },
  'tech-stack': { path: '/tech-stack', params: { limit: int(1, 500), cursor }, cache: 'slow', units: 1 },
  'tech-stack-app': {
    path: '/tech-stack/{id}',
    params: {
      id: pattern(ID, 'an app id'),
      store,
      version: pattern(/^[A-Za-z0-9._ ()-]{1,40}$/, 'a version, up to 40 characters'),
    },
    required: ['id'],
    cache: 'slow',
    units: 1,
  },
  'sdk-adoption': {
    path: '/sdk-adoption',
    // The OpenAPI document allows limit up to 100, the docs page says 1-50: keep to the stricter one.
    params: { sdk: pattern(/^[A-Za-z0-9][A-Za-z0-9 ._+-]{0,99}$/, 'an SDK name'), limit: int(1, 50) },
    required: ['sdk'],
    cache: 'slow',
    units: 2,
  },
}

export type Checked =
  | { ok: true; path: string; search: string; cache: string; fresh: number; units: number }
  | { ok: false; status: number; error: string }

/** Turns the proxy's query string into an upstream path and query, or says what is wrong with it. */
export function checkRequest(query: URLSearchParams): Checked {
  const bad = (error: string): Checked => ({ ok: false, status: 400, error })
  const names = query.getAll('endpoint')
  if (names.length !== 1) return bad('Give exactly one endpoint')
  const name = names[0] ?? ''
  const endpoint = Object.hasOwn(ENDPOINTS, name) ? ENDPOINTS[name] : undefined
  if (!endpoint) return bad('Unknown endpoint')
  const given = new Map<string, string>()
  for (const [key, value] of query) {
    if (key === 'endpoint') continue
    if (given.has(key)) return bad(`Parameter ${key.slice(0, 40)} is given more than once`)
    const check = Object.hasOwn(endpoint.params, key) ? endpoint.params[key] : undefined
    if (!check) return bad(`Parameter ${key.slice(0, 40)} is not allowed`)
    const problem = check(value)
    if (problem) return bad(`Parameter ${key} ${problem}`)
    given.set(key, value)
  }
  for (const key of endpoint.required ?? []) if (!given.has(key)) return bad(`Parameter ${key} is required`)
  const problem = endpoint.extra?.(given)
  if (problem) return bad(problem)
  const upstream = new URLSearchParams()
  let path = endpoint.path
  for (const [key, value] of given) {
    if (key === 'id') path = path.replace('{id}', encodeURIComponent(value))
    else upstream.set(key, value)
  }
  for (const [key, value] of Object.entries(endpoint.fixed ?? {})) upstream.set(key, value)
  upstream.sort()
  const search = upstream.toString()
  return {
    ok: true,
    path,
    search: search ? `?${search}` : '',
    cache: CACHE[endpoint.cache],
    fresh: FRESH[endpoint.cache],
    units: endpoint.units,
  }
}

const BASE_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...BASE_HEADERS, 'Cache-Control': 'no-store', ...headers },
  })
}

// Per-instance guards. The free key allows 60 requests a minute and 1,000 units a day (reset 00:00 UTC). The CDN
// cache absorbs nearly all traffic; these only stop one warm instance from burning the key on cache misses.
const PER_MINUTE = 50
const UNITS_PER_DAY = 900
let tokens = PER_MINUTE
let refilled = Date.now()
let unitsDay = ''
let unitsUsed = 0

export function resetLimits(): void {
  tokens = PER_MINUTE
  refilled = Date.now()
  unitsDay = ''
  unitsUsed = 0
  kept.clear()
  inflight.clear()
}

// The last good answer per upstream request, in this instance. Bounded: the oldest is dropped first.
const KEPT_MAX = 300
const kept = new Map<string, { body: string; fetchedAt: number }>()

function keep(key: string, body: string, fetchedAt: number): void {
  kept.delete(key)
  kept.set(key, { body, fetchedAt })
  if (kept.size > KEPT_MAX) {
    const oldest = kept.keys().next()
    if (!oldest.done) kept.delete(oldest.value)
  }
}

/** The last good answer to this request, labelled with when it was fetched, or null when there is none. */
function keptCopy(key: string): Response | null {
  const copy = kept.get(key)
  if (!copy) return null
  return new Response(copy.body, {
    status: 200,
    headers: {
      ...BASE_HEADERS,
      'Cache-Control': BROWSER_CACHE,
      'Vercel-CDN-Cache-Control': KEPT_CDN_CACHE,
      'X-TDN-Fetched-At': new Date(copy.fetchedAt).toISOString(),
      'X-TDN-Stale': '1',
    },
  })
}

/** The kept answer while it is still fresh (younger than `fresh` seconds), cached at the CDN for the time it has left. */
function freshCopy(key: string, fresh: number, now: number): Response | null {
  const copy = kept.get(key)
  if (!copy) return null
  const left = fresh - (now - copy.fetchedAt) / 1000
  if (left < 1) return null
  return new Response(copy.body, {
    status: 200,
    headers: {
      ...BASE_HEADERS,
      'Cache-Control': BROWSER_CACHE,
      'Vercel-CDN-Cache-Control': cdnCache(left),
      'X-TDN-Fetched-At': new Date(copy.fetchedAt).toISOString(),
    },
  })
}

/** An answer as plain data, so one upstream answer can be sent to every request that waited for it. */
interface Snapshot {
  status: number
  headers: [string, string][]
  body: string
}

/** Upstream requests on their way, by request: identical requests that arrive meanwhile wait for the same answer. */
const inflight = new Map<string, Promise<Snapshot>>()

async function snapshot(response: Response): Promise<Snapshot> {
  return { status: response.status, headers: [...response.headers], body: await response.text() }
}

const fromSnapshot = (s: Snapshot): Response => new Response(s.body, { status: s.status, headers: s.headers })

function allow(now: number, units: number): boolean {
  tokens = Math.min(PER_MINUTE, tokens + ((now - refilled) / 60_000) * PER_MINUTE)
  refilled = now
  const today = new Date(now).toISOString().slice(0, 10)
  if (today !== unitsDay) {
    unitsDay = today
    unitsUsed = 0
  }
  if (tokens < 1 || unitsUsed + units > UNITS_PER_DAY) return false
  tokens -= 1
  unitsUsed += units
  return true
}

function secondsToMidnightUtc(now: number): number {
  const d = new Date(now)
  return Math.max(1, Math.ceil((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now) / 1000))
}

export interface Env {
  TDN_API_KEY?: string | undefined
}

export async function handle(request: Request, env: Env, fetcher: typeof fetch = fetch): Promise<Response> {
  const response = await answer(request, env, fetcher)
  if (request.method !== 'HEAD') return response
  return new Response(null, { status: response.status, headers: response.headers })
}

async function answer(request: Request, env: Env, fetcher: typeof fetch): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return json(405, { error: 'Only GET is allowed', code: 'method_not_allowed' }, { Allow: 'GET, HEAD' })
  const checked = checkRequest(new URL(request.url).searchParams)
  if (!checked.ok) return json(checked.status, { error: checked.error, code: 'bad_request' })
  const key = env.TDN_API_KEY
  if (!key) return json(503, { error: 'Live data is not configured', code: 'not_configured' })
  const now = Date.now()
  const cacheKey = `${checked.path}${checked.search}`
  const fresh = freshCopy(cacheKey, checked.fresh, now)
  if (fresh) return fresh
  let pending = inflight.get(cacheKey)
  if (!pending) {
    pending = fetchFresh(checked, cacheKey, key, now, fetcher).then(snapshot)
    inflight.set(cacheKey, pending)
    const done = () => inflight.delete(cacheKey)
    pending.then(done, done)
  }
  return fromSnapshot(await pending)
}

/** Asks the source (within this instance's limits) and answers with what it said, or the kept copy when it failed. */
async function fetchFresh(
  checked: Extract<Checked, { ok: true }>,
  cacheKey: string,
  key: string,
  now: number,
  fetcher: typeof fetch,
): Promise<Response> {
  /** The kept copy when there is one, otherwise the error. */
  const orKept = (error: Response): Response => keptCopy(cacheKey) ?? error
  if (!allow(now, checked.units)) {
    const copy = keptCopy(cacheKey)
    if (copy) return copy
    // Out of tokens: the next one comes back within a few seconds (one every 60 / PER_MINUTE s).
    const retry = tokens < 1 ? Math.max(1, Math.ceil(((1 - tokens) * 60) / PER_MINUTE)) : secondsToMidnightUtc(now)
    return json(
      429,
      { error: 'Too many requests, try again later', code: 'rate_limited' },
      { 'Retry-After': String(retry) },
    )
  }
  let upstream: Response
  let body: string
  try {
    upstream = await fetcher(`${UPSTREAM}${checked.path}${checked.search}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    body = await upstream.text()
  } catch (error) {
    const timedOut = error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')
    return orKept(
      timedOut
        ? json(504, { error: 'The data service took too long to answer', code: 'upstream_timeout' })
        : json(502, { error: 'The data service did not answer', code: 'upstream_unavailable' }),
    )
  }
  if (upstream.status === 429) {
    const retry = upstream.headers.get('Retry-After') ?? ''
    return orKept(
      json(
        429,
        { error: 'The data service is busy, try again later', code: 'rate_limited' },
        { 'Retry-After': /^[0-9]{1,6}$/.test(retry) ? retry : '60' },
      ),
    )
  }
  if (upstream.status === 404) {
    // A missing app or an uncollected chart. Cache briefly so repeats do not spend units.
    return json(
      404,
      { error: 'Not found', code: 'not_found' },
      { 'Cache-Control': 'public, max-age=60', 'Vercel-CDN-Cache-Control': 'public, max-age=600' },
    )
  }
  if (upstream.status === 400) {
    return json(400, { error: 'The data service did not accept these parameters', code: 'bad_request' })
  }
  if (upstream.status === 401 || upstream.status === 403) {
    return orKept(json(502, { error: 'Live data is not available right now', code: 'upstream_auth' }))
  }
  if (!upstream.ok) {
    return orKept(json(502, { error: 'The data service returned an error', code: 'upstream_error' }))
  }
  try {
    JSON.parse(body)
  } catch {
    return orKept(json(502, { error: 'The data service returned something that is not JSON', code: 'upstream_error' }))
  }
  const fetchedAt = Date.now()
  keep(cacheKey, body, fetchedAt)
  return new Response(body, {
    status: 200,
    headers: {
      ...BASE_HEADERS,
      'Cache-Control': BROWSER_CACHE,
      'Vercel-CDN-Cache-Control': checked.cache,
      'X-TDN-Fetched-At': new Date(fetchedAt).toISOString(),
    },
  })
}

const env = (): Env => ({ TDN_API_KEY: process.env.TDN_API_KEY })
const route = (request: Request): Promise<Response> => handle(request, env())

export { route as GET, route as HEAD, route as POST, route as PUT, route as PATCH, route as DELETE, route as OPTIONS }

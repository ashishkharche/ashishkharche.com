// Same-origin app icons for the chart builder: /api/icon/?u=<icon URL from the live data>
//
// The live data gives each app's icon as a URL on Apple's image CDN (isN-ssl.mzstatic.com) or Google's
// (play-lh.googleusercontent.com). Visitors never load those hosts: the page first uses the icons baked into the
// deploy (/lab/charts/icons/), and this route for any icon that is not baked.
//
// - Not an open proxy: GET and HEAD only, one query parameter (u), and u must be an https URL on exactly those hosts
//   (no user, password or port, already in normal form). Anything else is 400 and nothing is fetched.
// - Upstream redirects are refused, only PNG, JPEG, WebP and GIF bodies under 1 MB are passed on, and the answer is
//   sent with nosniff and a sandboxing CSP, so it can only ever be an image.
// - Cached long on Vercel's CDN (30 days, then stale-while-revalidate a week and stale-if-error 30 days), a day in the
//   browser. Errors are no-store, so a failed fetch is asked again next time. Each warm instance also keeps the last
//   good copy of each icon and sends it if the source fails or rate limits.
// - Self-contained on purpose (deploys upload api/*.ts on its own); ICON_HOSTNAME must match ICON_HOST in
//   src/lib/charts/tdn.ts, which a unit test checks.

export const ICON_HOSTNAME = /^(?:is[1-9]-ssl\.mzstatic\.com|play-lh\.googleusercontent\.com)$/
export const ICON_CDN_CACHE = 'public, max-age=2592000, stale-while-revalidate=604800, stale-if-error=2592000'
export const ICON_BROWSER_CACHE = 'public, max-age=86400'
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_BYTES = 1_000_000
const TIMEOUT_MS = 8000
const KEEP_MAX = 500

/** The icon URL when it is allowed, otherwise null. */
export function checkIconUrl(raw: string | null): URL | null {
  if (!raw || raw.length > 600) return null
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null
  if (!ICON_HOSTNAME.test(url.hostname)) return null
  // Only URLs already in normal form, so what is checked is exactly what is fetched.
  if (url.href !== raw) return null
  return url
}

const kept = new Map<string, { body: ArrayBuffer; type: string }>()

const BASE = {
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': "default-src 'none'; sandbox",
}

function fail(status: number, message: string, headers: Record<string, string> = {}): Response {
  return new Response(message, {
    status,
    headers: { ...BASE, 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

function image(body: ArrayBuffer, type: string, head: boolean, extra: Record<string, string> = {}): Response {
  return new Response(head ? null : body, {
    status: 200,
    headers: {
      ...BASE,
      'Content-Type': type,
      'Cache-Control': ICON_BROWSER_CACHE,
      'Vercel-CDN-Cache-Control': ICON_CDN_CACHE,
      ...extra,
    },
  })
}

export async function handle(request: Request, fetcher: typeof fetch = fetch): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return fail(405, 'Method not allowed', { Allow: 'GET, HEAD' })
  const head = request.method === 'HEAD'
  const params = new URL(request.url).searchParams
  const keys = [...params.keys()]
  if (keys.length !== 1 || keys[0] !== 'u') return fail(400, 'Expected one parameter, u')
  const target = checkIconUrl(params.get('u'))
  if (!target) return fail(400, 'Not an allowed icon URL')
  const key = target.href
  const orKept = (error: Response) => {
    const copy = kept.get(key)
    return copy
      ? image(copy.body, copy.type, head, { 'Vercel-CDN-Cache-Control': 'public, max-age=300', 'X-Icon-Stale': '1' })
      : error
  }
  let upstream: Response
  try {
    upstream = await fetcher(key, {
      redirect: 'error',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: 'image/webp,image/png,image/jpeg,image/*;q=0.8' },
    })
  } catch {
    return orKept(fail(502, 'The icon host did not answer'))
  }
  if (upstream.status === 429) return orKept(fail(503, 'The icon host is busy', { 'Retry-After': '60' }))
  if (!upstream.ok) return orKept(fail(502, 'The icon host returned an error'))
  const type = (upstream.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() ?? ''
  if (!TYPES.includes(type)) return orKept(fail(502, 'Not an image'))
  const length = Number(upstream.headers.get('content-length') ?? 0)
  if (length > MAX_BYTES) return orKept(fail(502, 'Icon too large'))
  const body = await upstream.arrayBuffer()
  if (body.byteLength === 0 || body.byteLength > MAX_BYTES) return orKept(fail(502, 'Icon empty or too large'))
  if (kept.size >= KEEP_MAX) kept.delete(kept.keys().next().value as string)
  kept.set(key, { body, type })
  return image(body, type, head)
}

/** For tests. */
export function resetIcons() {
  kept.clear()
}

const route = (request: Request): Promise<Response> => handle(request)

export { route as GET, route as HEAD, route as POST, route as PUT, route as PATCH, route as DELETE, route as OPTIONS }

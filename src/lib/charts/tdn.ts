/**
 * The chart builder's live data client. Every request goes to the same-origin proxy in api/tdn.ts:
 *
 *   GET /api/tdn/?endpoint=<name>&<params>
 *
 * (with the trailing slash: the site sets trailingSlash, so /api/tdn?... answers 308 to /api/tdn/?... first)
 *
 * which answers with the upstream JSON unchanged ({ data, meta } for the newer endpoints, a flat object for the
 * older ones). Answers are kept for the life of the page, so switching back to a template costs nothing, and the
 * same request made by two templates is sent once. Nothing is stored between page loads: every load reads fresh data.
 */

export type Endpoint =
  | 'apps'
  | 'rankings'
  | 'app'
  | 'app-rankings'
  | 'rank-history'
  | 'compare'
  | 'movers'
  | 'tech-stack'
  | 'tech-stack-app'
  | 'sdk-adoption'

export type Params = Record<string, string | number | undefined>

export const PROXY_PATH = '/api/tdn/'

/** The proxy URL for one request. Parameters are sorted so equal requests share a cache entry (here and at the edge). */
export function tdnUrl(endpoint: Endpoint, params: Params = {}): string {
  const search = new URLSearchParams({ endpoint })
  for (const [key, value] of Object.entries(params).sort(([a], [b]) => a.localeCompare(b))) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  return `${PROXY_PATH}?${search.toString()}`
}

export class TdnError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message)
  }
}

type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export interface TdnClient {
  get<T>(endpoint: Endpoint, params?: Params): Promise<T>
  /** Every URL requested so far, in order, once each. */
  readonly requested: string[]
}

export function createTdnClient(fetcher: Fetcher = (url) => fetch(url, { headers: { accept: 'application/json' } })) {
  const cache = new Map<string, Promise<unknown>>()
  const requested: string[] = []
  const client: TdnClient = {
    requested,
    get<T>(endpoint: Endpoint, params: Params = {}): Promise<T> {
      const url = tdnUrl(endpoint, params)
      let found = cache.get(url)
      if (!found) {
        requested.push(url)
        found = fetcher(url).then(async (response) => {
          const body = (await response.json().catch(() => null)) as { error?: string; code?: string } | null
          if (!response.ok) {
            throw new TdnError(response.status, body?.code ?? 'error', body?.error ?? `HTTP ${response.status}`)
          }
          return body
        })
        // A failed request is not kept, so Try again sends it again.
        found.catch(() => cache.delete(url))
        cache.set(url, found)
      }
      return found as Promise<T>
    },
  }
  return client
}

// Response shapes, from the public API reference (docs/api and /api/v1/openapi.json).

export interface Meta {
  recordedAt?: string
  capturedAt?: string
  count?: number
  total?: number
  nextCursor?: string | null
  [key: string]: unknown
}

export interface Envelope<T> {
  data: T
  meta?: Meta
}

export interface RankingRow {
  rank: number
  appId: string
  store: 'apple' | 'google'
  name: string
  developer?: string
  iconUrl?: string | null
}

export interface RankHistory {
  appId: string
  store: string
  chart: string
  category?: string
  series: Array<{ country: string; points: Array<{ at: string; rank: number | null }> }>
}

export interface AppRankings {
  appId: string
  store: string
  chartType: string
  rankings: Array<{ country: string; rank: number | null; recordedAt: string }>
  count?: number
}

export interface CompareRow {
  appId: string
  name: string
  currentRating?: number | null
  rank?: number | null
  versionCount?: number | null
}

export interface MoverRow {
  appId: string
  store?: string
  name: string
  iconUrl?: string
  currentRank: number
  previousRank: number
  change: number
}

export interface TechStackRow {
  appId: string
  store: 'apple' | 'google'
  slug?: string
  bundleId?: string
  appName: string
  version?: string
  capturedAt?: string
  sdkCount: number
  /** Added upstream on 2 Nov 2026; null when unknown. Older answers leave them out. */
  iconUrl?: string | null
  developer?: string | null
  developerSlug?: string | null
}

/** The body of an answer: `data` when the endpoint wraps it, otherwise the answer itself. */
export function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) return (body as { data: T }).data
  return body as T
}

export function metaOf(body: unknown): Meta {
  return body && typeof body === 'object' && 'meta' in body ? ((body as { meta?: Meta }).meta ?? {}) : {}
}

/**
 * A data time from the API ("2026-11-01 00:18:03", UTC, or ISO with a zone) as a Date, or null.
 */
export function parseDataTime(value: string | null | undefined): Date | null {
  if (!value) return null
  const text = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(value) ? `${value.replace(' ', 'T')}Z` : value
  const time = Date.parse(text)
  return Number.isNaN(time) ? null : new Date(time)
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "1 Nov 2026, 00:18 UTC". */
export function formatDataTime(date: Date): string {
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  return `${formatDay(date)}, ${hh}:${mm} UTC`
}

/** "1 Nov 2026". */
export function formatDay(date: Date): string {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()] ?? ''} ${date.getUTCFullYear()}`
}

/** The latest of some data times. */
export function latest(values: Array<string | null | undefined>): Date | null {
  const dates = values.map(parseDataTime).filter((d): d is Date => d !== null)
  return dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : null
}

/**
 * Icon hosts the page may load. They must match img-src in the chart builder's CSP (src/lib/csp.ts) and send
 * Access-Control-Allow-Origin, so icons can be drawn on the canvas and the PNG can still be saved.
 */
export const ICON_HOST = /^https:\/\/(?:is[1-5]-ssl\.mzstatic\.com|play-lh\.googleusercontent\.com)\//

export function iconAllowed(url: string | null | undefined): url is string {
  return !!url && ICON_HOST.test(url)
}

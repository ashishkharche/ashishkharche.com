/**
 * The chart builder's live data client, and the one adapter between the data source's API (TDN) and the charts.
 * Every request goes to the same-origin proxy in api/tdn.ts:
 *
 *   GET /api/tdn/?endpoint=<name>&<params>
 *
 * (with the trailing slash: the site sets trailingSlash, so /api/tdn?... answers 308 to /api/tdn/?... first)
 *
 * which answers with the upstream JSON unchanged ({ data, meta } for the newer endpoints, a flat object for the
 * older ones). Answers are kept for the life of the page, so switching back to a template costs nothing, and the
 * same request made by two templates is sent once. The page keeps nothing itself between loads; the proxy lets the
 * browser reuse an answer for a minute and Vercel's CDN for an hour.
 *
 * With `retry` (the page uses it), at most a few requests are on their way at once, so a page of thumbnails asks in
 * turn rather than all together, and a request the proxy turned away (429) or that never reached it is asked again
 * after a short wait, the proxy's Retry-After when it sends one, before the caller sees an error. Callers ask again after
 * that too (retryDelay in live.ts), so the page shows a chart or a loading state, never an error.
 *
 * Everything that knows the shape of a TDN answer is in this file: the read* functions below turn an answer into
 * checked rows, and the chart code (live.ts, about.ts) reads answers only through them. When the API changes, this
 * file is the place to update. What the charts depend on (/api/v1, see /api/v1/openapi.json upstream):
 *
 *   rankings          data[]: rank, appId, store, name, developer, iconUrl; meta.recordedAt, meta.total
 *   apps/{id}/rank-history   data.series[]: country, points[]: at, rank
 *   apps/{id}/rankings       data.rankings[]: country, rank, recordedAt (flat answers are read too)
 *   compare           data[]: appId, currentRating, rank, versionCount
 *   movers            data[]: appId, store, name, iconUrl, currentRank, previousRank, change
 *   tech-stack        data[]: appId, store, appName, capturedAt, sdkCount, iconUrl
 *   tech-stack/{id}   data: sdkCount, sdkListIsFloor, version, capturedAt, techStack.sdks[]: category, label, items[]
 *   apps              apps[]: id, store, name, developer, category, iconUrl, active; total (top level, no data or
 *                     meta wrapper; data[], appId, appName and meta.total are read too)
 *
 * Data times ("2026-11-02 00:18:08") are UTC without a zone. Icons are URLs on Apple's isN-ssl.mzstatic.com or
 * Google's play-lh.googleusercontent.com; an app may have none, and the charts are drawn without it.
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
  readonly status: number
  readonly code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Fetcher = (url: string) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
  headers?: { get(name: string): string | null }
}>

/** When the proxy fetched an answer from the source, and whether it is an older copy kept for when the source fails. */
export interface Fetched {
  fetchedAt: Date | null
  /** Older than STALE_AFTER_MS, or a kept copy. */
  stale: boolean
  /** The proxy sent its kept copy because the source did not answer. */
  kept: boolean
}

export interface TdnClient {
  get<T>(endpoint: Endpoint, params?: Params): Promise<T>
  /** Every URL requested so far, in order, once each. */
  readonly requested: string[]
  /** How old each answer is, by URL, for the answers that said (the proxy sends X-TDN-Fetched-At). */
  readonly fetched: Map<string, Fetched>
}

/**
 * A view of a client that remembers the URLs one chart asked for, so the chart's own answers (and their
 * x-tdn-fetched-at times) can be told apart from other charts' on the same page.
 */
export function trackClient(client: TdnClient): { client: TdnClient; answers: () => Fetched[] } {
  const urls = new Set<string>()
  const view: TdnClient = {
    requested: client.requested,
    fetched: client.fetched,
    get<T>(endpoint: Endpoint, params: Params = {}) {
      urls.add(tdnUrl(endpoint, params))
      return client.get<T>(endpoint, params)
    },
  }
  return {
    client: view,
    answers: () => [...urls].map((u) => client.fetched.get(u)).filter((f): f is Fetched => !!f),
  }
}

/** The oldest fetch time among a chart's answers: the chart is as old as its oldest answer. */
export function oldestFetch(answers: Fetched[]): Date | null {
  const times = answers.map((f) => f.fetchedAt?.getTime() ?? 0).filter((t) => t > 0)
  return times.length ? new Date(Math.min(...times)) : null
}

/** An answer the proxy fetched longer ago than this is labelled with its fetch time: it is a kept copy. */
export const STALE_AFTER_MS = 2 * 3_600_000

export interface ClientOptions {
  /** Waits before asking again, in seconds, for each retry of a request that failed for a passing reason. */
  retry?: readonly number[]
  /** Most requests on their way at once. */
  maxInFlight?: number
  /** For tests: how to wait. */
  sleep?: (ms: number) => Promise<void>
  /**
   * The last good answer kept for a URL (the snapshot shipped with the page), used when the proxy does not answer
   * after the retries. Its answer is marked kept and stale, with when it was fetched.
   */
  lastGood?: (url: string) => Promise<KeptAnswer | null>
}

/** One answer kept in the snapshot: the body and when the proxy fetched it. */
export interface KeptAnswer {
  body: unknown
  fetchedAt: string
}

/** The snapshot file: the answers every live template's default chart needs, saved at build time. */
export interface Snapshot {
  savedAt: string
  answers: Record<string, KeptAnswer>
}

export const SNAPSHOT_PATH = '/lab/charts/snapshot.json'

/** Reads the snapshot once; a missing or broken file is no snapshot. */
export function snapshotLookup(
  load: () => Promise<Snapshot | null> = () =>
    fetch(SNAPSHOT_PATH).then((r) => (r.ok ? (r.json() as Promise<Snapshot>) : null)),
): (url: string) => Promise<KeptAnswer | null> {
  let file: Promise<Snapshot | null> | undefined
  return async (url) => {
    file ??= load().catch(() => null)
    return (await file)?.answers[url] ?? null
  }
}

/** Longest wait for one proxy answer before it counts as failed, in ms. */
export const REQUEST_TIMEOUT_MS = 8_000

/**
 * Failures the client asks again for itself: rate limited (429). A 5xx is passed straight to the caller, which shows
 * "Waiting for live data. Asking again…" and asks again on its own schedule; a failed network request is asked again
 * like a 429.
 */
export const isPassing = (status: number): boolean => status === 429

/** The page's settings: three on their way at once, and three quick retries. */
export const PAGE_CLIENT: ClientOptions = { retry: [1, 3, 6], maxInFlight: 3 }

/** Longest wait taken from a Retry-After header, in seconds; longer waits are left to the caller's own retries. */
const MAX_RETRY_AFTER = 10

export function createTdnClient(
  fetcher: Fetcher = (url) =>
    fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
  options: ClientOptions = {},
) {
  const retries = options.retry ?? []
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const limit = options.maxInFlight ?? Infinity
  let active = 0
  const queue: Array<() => void> = []
  /** Runs `task` when fewer than `limit` requests are on their way. */
  const slot = async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((resolve) => queue.push(resolve))
    active++
    try {
      return await task()
    } finally {
      active--
      queue.shift()?.()
    }
  }
  /** One request, asked again for passing failures. */
  const send = async (url: string) => {
    for (let attempt = 0; ; attempt++) {
      let response: Awaited<ReturnType<Fetcher>>
      try {
        response = await slot(() => fetcher(url))
      } catch (error) {
        // A request that timed out is not asked again: the kept copy is drawn now, rather than after more waits.
        if (attempt >= retries.length || (error as Error)?.name === 'TimeoutError') throw error
        await sleep((retries[attempt] ?? 1) * 1000)
        continue
      }
      if (response.ok || !isPassing(response.status) || attempt >= retries.length) return response
      const after = Number(response.headers?.get('retry-after') ?? '')
      const wait = Number.isFinite(after) && after > 0 ? Math.min(after, MAX_RETRY_AFTER) : (retries[attempt] ?? 1)
      await sleep(wait * 1000)
    }
  }
  const cache = new Map<string, Promise<unknown>>()
  const requested: string[] = []
  const fetched = new Map<string, Fetched>()
  const client: TdnClient = {
    requested,
    fetched,
    get<T>(endpoint: Endpoint, params: Params = {}): Promise<T> {
      const url = tdnUrl(endpoint, params)
      let found = cache.get(url)
      if (!found) {
        requested.push(url)
        const live = send(url).then(async (response) => {
          const body = (await response.json().catch(() => null)) as { error?: string; code?: string } | null
          if (!response.ok) {
            throw new TdnError(response.status, body?.code ?? 'error', body?.error ?? `HTTP ${response.status}`)
          }
          const at = parseDataTime(response.headers?.get('x-tdn-fetched-at'))
          const kept = response.headers?.get('x-tdn-stale') === '1'
          if (at || kept) {
            fetched.set(url, {
              fetchedAt: at,
              stale: kept || (!!at && Date.now() - at.getTime() > STALE_AFTER_MS),
              kept,
            })
          }
          return body
        })
        found = live.catch(async (error: unknown) => {
          const kept = await options.lastGood?.(url)
          if (!kept) throw error
          const at = parseDataTime(kept.fetchedAt)
          fetched.set(url, { fetchedAt: at, stale: true, kept: true })
          return kept.body
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
  /** The newest snapshot's rating count (snapshots[] are snake_case: recorded_at, rating, rating_count). */
  ratingCount?: number | null
  /** Nested rank points (snake_case upstream: recorded_at, chart_type, rank), read in either case. */
  rankings?: Array<{ recordedAt: string; chartType: string; rank: number }>
}

export interface MoverRow {
  appId: string
  store?: string
  name: string
  iconUrl?: string
  currentRank: number
  previousRank: number
  change: number
  /** When the row was recorded; movers has no top-level meta.recordedAt, and old rows can linger. */
  recordedAt?: string
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
/** "13:05 GMT" (or BST in summer): the time in London, for the line under a chart. */
export function londonTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'short',
  }).formatToParts(date)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const zone = ['BST', 'GMT+1'].includes(get('timeZoneName')) ? 'BST' : 'GMT'
  return `${get('hour')}:${get('minute')} ${zone}`
}

/** "Data from 13:05 GMT", with the day when it is not today in London ("Data from 23:10 GMT, 3 Nov"). */
export function dataFromLine(date: Date, now: Date = new Date()): string {
  const day = (d: Date) => d.toLocaleDateString('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'short' })
  return `Data from ${londonTime(date)}${day(date) === day(now) ? '' : `, ${day(date)}`}`
}

/** "Data from 13:05 GMT" from a chart's data time ("1 Nov 2026, 00:18 UTC"). */
export function dataLineOf(dataTime: string, now: Date = new Date()): string {
  const m = /^(\d{1,2}) (\w{3}) (\d{4}), (\d{2}):(\d{2}) UTC$/.exec(dataTime)
  const date = m ? parseDataTime(new Date(`${m[2]} ${m[1]}, ${m[3]} ${m[4]}:${m[5]}:00 UTC`).toISOString()) : null
  return date ? dataFromLine(date, now) : `Data from ${dataTime}`
}

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
export const ICON_HOST = /^https:\/\/(?:is[1-9]-ssl\.mzstatic\.com|play-lh\.googleusercontent\.com)\//

export function iconAllowed(url: string | null | undefined): url is string {
  return !!url && ICON_HOST.test(url)
}

// Readers --------------------------------------------------------------------------------------------------------
// Each one takes an answer as it came (or null when a request failed) and returns only rows with the fields the
// charts need, of the right types. A missing or malformed field never throws here: the row is left out, or the
// optional field is left empty.

type Raw = Record<string, unknown>
const rowsOf = (body: unknown): Raw[] => {
  const data = unwrap<unknown>(body)
  return Array.isArray(data) ? data.filter((r): r is Raw => !!r && typeof r === 'object') : []
}
const objectOf = (body: unknown): Raw | undefined => {
  const data = unwrap<unknown>(body)
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Raw) : undefined
}
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const storeOf = (v: unknown): 'apple' | 'google' | undefined => (v === 'apple' || v === 'google' ? v : undefined)
const iconOf = (v: unknown): string | null => str(v) ?? null

/** The data time of an answer (meta.recordedAt, or meta.capturedAt), or null. */
export function recordedAt(body: unknown): Date | null {
  const meta = metaOf(body)
  return parseDataTime(str(meta.recordedAt) ?? str(meta.capturedAt))
}

/** A rankings answer: rows with a rank, an id and a name, best rank first. */
export function readRankings(body: unknown, store?: 'apple' | 'google'): RankingRow[] {
  const out: RankingRow[] = []
  for (const r of rowsOf(body)) {
    const rank = num(r.rank)
    const appId = str(r.appId)
    const name = str(r.name)
    const s = storeOf(r.store) ?? store
    if (rank === undefined || rank < 1 || !appId || !name || !s) continue
    out.push({ rank, appId, store: s, name, developer: str(r.developer), iconUrl: iconOf(r.iconUrl) })
  }
  return out.sort((a, b) => a.rank - b.rank)
}

/** A rank history: series with their points; points without a time are left out, a missing rank is null. */
export function readRankHistory(body: unknown): RankHistory | undefined {
  const h = objectOf(body)
  if (!h || !Array.isArray(h.series)) return undefined
  const series = (h.series as unknown[])
    .filter((s): s is Raw => !!s && typeof s === 'object')
    .map((s) => ({
      country: str(s.country) ?? '',
      points: (Array.isArray(s.points) ? (s.points as unknown[]) : [])
        .filter((p): p is Raw => !!p && typeof p === 'object')
        .map((p) => ({ at: str(p.at) ?? '', rank: num(p.rank) ?? null }))
        .filter((p) => parseDataTime(p.at) !== null),
    }))
  return {
    appId: str(h.appId) ?? '',
    store: str(h.store) ?? '',
    chart: str(h.chart) ?? '',
    category: str(h.category),
    series,
  }
}

/** One app's ranks by country: rows with a country, a rank above 0 and a data time. */
export function readAppRankings(body: unknown): AppRankings['rankings'] {
  const list = objectOf(body)?.rankings
  return (Array.isArray(list) ? (list as unknown[]) : [])
    .filter((r): r is Raw => !!r && typeof r === 'object')
    .map((r) => ({ country: str(r.country) ?? '', rank: num(r.rank) ?? null, recordedAt: str(r.recordedAt) ?? '' }))
    .filter((r) => r.country && typeof r.rank === 'number' && r.rank > 0)
}

export function readCompare(body: unknown): CompareRow[] {
  return rowsOf(body)
    .map((r) => ({
      appId: str(r.appId) ?? '',
      name: str(r.name) ?? '',
      currentRating: num(r.currentRating) ?? null,
      rank: num(r.rank) ?? null,
      versionCount: num(r.versionCount) ?? null,
      ratingCount: newestRatingCount(r.snapshots),
      rankings: (Array.isArray(r.rankings) ? (r.rankings as unknown[]) : [])
        .filter((p): p is Raw => !!p && typeof p === 'object')
        .map((p) => ({
          recordedAt: str(p.recorded_at) ?? str(p.recordedAt) ?? '',
          chartType: str(p.chart_type) ?? str(p.chartType) ?? '',
          rank: num(p.rank) ?? 0,
        }))
        .filter((p) => p.rank > 0 && parseDataTime(p.recordedAt) !== null),
    }))
    .filter((r) => r.appId)
}

/** The rating count of the newest snapshot, from snake_case (rating_count) or camelCase fields. */
function newestRatingCount(snapshots: unknown): number | null {
  if (!Array.isArray(snapshots)) return null
  let best: { at: number; count: number } | null = null
  for (const p of snapshots as unknown[]) {
    if (!p || typeof p !== 'object') continue
    const r = p as Raw
    const at = parseDataTime(str(r.recorded_at) ?? str(r.recordedAt))?.getTime()
    const count = num(r.rating_count) ?? num(r.ratingCount)
    if (at === undefined || count === undefined) continue
    if (!best || at > best.at) best = { at, count }
  }
  return best?.count ?? null
}

export function readMovers(body: unknown): MoverRow[] {
  const out: MoverRow[] = []
  for (const r of rowsOf(body)) {
    const appId = str(r.appId)
    const [currentRank, previousRank, change] = [num(r.currentRank), num(r.previousRank), num(r.change)]
    if (!appId || currentRank === undefined || previousRank === undefined || change === undefined) continue
    out.push({
      appId,
      store: str(r.store),
      name: str(r.name) ?? '',
      iconUrl: str(r.iconUrl),
      currentRank,
      previousRank,
      change,
      recordedAt: str(r.recordedAt),
    })
  }
  return out
}

export function readTechStack(body: unknown): TechStackRow[] {
  const out: TechStackRow[] = []
  for (const r of rowsOf(body)) {
    const appId = str(r.appId)
    const s = storeOf(r.store)
    const sdkCount = num(r.sdkCount)
    if (!appId || !s || sdkCount === undefined) continue
    out.push({
      appId,
      store: s,
      appName: str(r.appName) ?? '',
      version: str(r.version),
      capturedAt: str(r.capturedAt),
      sdkCount,
      iconUrl: iconOf(r.iconUrl),
      developer: str(r.developer) ?? null,
    })
  }
  return out
}

/** The tech-stack detail of one build: SDKs grouped by the source's own kinds. */
export interface TechStackDetail {
  appId: string
  store: string
  appName?: string
  version?: string
  capturedAt?: string
  sdkCount?: number
  sdkListIsFloor?: boolean
  techStack?: { sdks?: Array<{ category: string; label: string; items: unknown[] }> }
}

export function readTechStackDetail(body: unknown): TechStackDetail | undefined {
  const d = objectOf(body)
  if (!d) return undefined
  const sdks = (d.techStack as Raw | undefined)?.sdks
  return {
    appId: str(d.appId) ?? '',
    store: str(d.store) ?? '',
    appName: str(d.appName),
    version: str(d.version),
    capturedAt: str(d.capturedAt),
    sdkCount: num(d.sdkCount),
    sdkListIsFloor: typeof d.sdkListIsFloor === 'boolean' ? d.sdkListIsFloor : undefined,
    techStack: {
      sdks: (Array.isArray(sdks) ? (sdks as unknown[]) : [])
        .filter((g): g is Raw => !!g && typeof g === 'object')
        .map((g) => ({
          category: str(g.category) ?? '',
          label: str(g.label) ?? '',
          items: Array.isArray(g.items) ? (g.items as unknown[]) : [],
        })),
    },
  }
}

export interface AppRow {
  id: string
  store: 'apple' | 'google'
  name: string
  developer?: string
  category?: string
  iconUrl: string | null
  active?: boolean
}

/**
 * The /apps answer: { apps: [{ id, store, name, developer, category, iconUrl, active }], count, total, nextCursor },
 * with no data or meta wrapper. A data[] list and meta.total are read too, and appId and appName stand in for id and
 * name. Rows without an id, a known store or a name are left out; total is the top-level total when it is a number.
 */
export function readApps(body: unknown): { rows: AppRow[]; total?: number } {
  const top = body && typeof body === 'object' && !Array.isArray(body) ? (body as Raw) : undefined
  const list = Array.isArray(top?.apps)
    ? (top.apps as unknown[]).filter((r): r is Raw => !!r && typeof r === 'object')
    : rowsOf(body)
  const rows: AppRow[] = []
  for (const r of list) {
    const id = str(r.id) ?? str(r.appId) ?? (typeof r.id === 'number' ? String(r.id) : undefined)
    const store = storeOf(r.store)
    const name = str(r.name) ?? str(r.appName)
    if (!id || !store || !name) continue
    rows.push({
      id,
      store,
      name,
      developer: str(r.developer),
      category: str(r.category),
      iconUrl: iconOf(r.iconUrl),
      active: typeof r.active === 'boolean' ? r.active : undefined,
    })
  }
  const total = num(top?.total) ?? num(metaOf(body).total)
  return total === undefined ? { rows } : { rows, total }
}

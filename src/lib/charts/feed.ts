/**
 * Daily-feed and feed-metrics chart mappers (TDN schema v20).
 * Numbers on a chart come only from stat-answer cells or the item's answer string.
 * Fixture numbers stay in tests and are never hard-coded into the page.
 */
import {
  formatDataTime,
  formatDay,
  parseDataTime,
  readDailyFeed,
  readFeedMetrics,
  type DailyFeed,
  type FeedMetrics,
  type StatAnswer,
  type StatCell,
} from './tdn.ts'

export const FEED_SCOPE = 'Among the tracked apps'
export const FEED_SOURCE = 'public App Store chart data'
export const METRICS_SOURCE = 'public App Store chart data'
export const GOOGLE_METRICS_SOURCE = 'public Google Play chart data'
export const NO_DATA_SENTENCE = 'No data for this day yet.'

export type FeedApp = { appId: string; store: string; name: string; iconUrl?: string | null }

export type FeedMapped = {
  model:
    | {
        kind: 'headline'
        app: FeedApp
        answer: string
        unit?: string
        sentence: string
        support?:
          | { type: 'bars'; label: string; bars: Array<{ label: string; value: number }> }
          | { type: 'icon-bars'; label: string; bars: Array<{ app: FeedApp; label: string; value: number }> }
        others: Array<{ app: FeedApp; note: string }>
      }
    | {
        kind: 'leaderboard'
        rows: Array<{ app: FeedApp; value: number; display: string; detail?: string }>
      }
  text: { title: string; subtitle: string; footnote: [string, string, string] }
  source: string
  dataTime: string
  numbers: Set<string>
  coverage: string
  /** True when the chart is the empty-day state (no invented figures). */
  empty: boolean
}

/** Bytes as "240.1 MB" (decimal megabytes), matching TDN's own wording. */
export function formatBytesMb(bytes: number): string {
  return `${(bytes / 1e6).toFixed(1)} MB`
}

/**
 * A calendar day from a TDN slot ("2026-11-01 00:00:00") or ISO date ("2026-10-01"), parsed as UTC
 * so the day does not shift with the local time zone.
 */
export function formatUtcDate(value: string): string | null {
  const slot = parseDataTime(value)
  if (slot) return formatDay(slot)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const t = Date.parse(`${value}T00:00:00Z`)
    if (!Number.isNaN(t)) return formatDay(new Date(t))
  }
  return null
}

function collect(...values: Array<number | string | null | undefined>): Set<string> {
  const out = new Set<string>()
  for (const v of values) {
    if (v === null || v === undefined) continue
    for (const n of String(v).match(/\d+(?:\.\d+)?/g) ?? []) out.add(n)
  }
  return out
}

function merge(...sets: Array<Set<string>>): Set<string> {
  return new Set(sets.flatMap((s) => [...s]))
}

function cellStr(cells: Record<string, StatCell>, key: string): string | null {
  const v = cells[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function cellNum(cells: Record<string, StatCell>, key: string): number | null {
  const v = cells[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function appFromRow(cells: Record<string, StatCell>, href: string | null, store: 'apple' | 'google'): FeedApp {
  const name = cellStr(cells, 'app') ?? 'App'
  const parts = href?.split('/').filter(Boolean) ?? []
  const id =
    parts.at(-1) ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') ||
    'app'
  return { appId: id, store, name, iconUrl: null }
}

function timeFromFeed(feed: DailyFeed): Date | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(feed.date)) return parseDataTime(`${feed.date} 00:00:00`)
  return parseDataTime(feed.generatedAt ?? null)
}

function timeFromMetrics(metrics: FeedMetrics): Date | null {
  return (
    parseDataTime(metrics.slot) ??
    (/^\d{4}-\d{2}-\d{2}$/.test(metrics.date) ? parseDataTime(`${metrics.date} 00:00:00`) : null)
  )
}

function foot(source: string, a: string, b: string): [string, string, string] {
  return ['Source: {source}. Data from {time}.', a, b]
}

function emptyState(opts: {
  title: string
  subtitle: string
  source: string
  time: Date
  coverage: string
  line2: string
  line3: string
}): FeedMapped {
  const dataTime = formatDataTime(opts.time)
  return {
    model: {
      kind: 'headline',
      app: { appId: 'tracked-apps', store: 'apple', name: 'Tracked apps', iconUrl: null },
      answer: 'None',
      sentence: NO_DATA_SENTENCE,
      others: [],
    },
    text: {
      title: opts.title,
      subtitle: NO_DATA_SENTENCE,
      footnote: foot(opts.source, opts.line2, opts.line3),
    },
    source: opts.source,
    dataTime,
    numbers: collect(dataTime),
    coverage: opts.coverage,
    empty: true,
  }
}

function findItem(items: StatAnswer[], kind: string, idIncludes?: string): StatAnswer | undefined {
  return items.find((i) => i.kind === kind && (!idIncludes || i.id.includes(idIncludes)))
}

function skippedReason(metrics: FeedMetrics, kind: string): string | undefined {
  return metrics.skipped.find((s) => s.kind === kind)?.reason
}

export class FeedDataError extends Error {}

export function mapSizePercentiles(body: unknown): FeedMapped {
  const metrics = readFeedMetrics(body)
  if (!metrics) throw new FeedDataError('The feed metrics answer is missing.')
  const time = timeFromMetrics(metrics)
  if (!time) throw new FeedDataError('The feed metrics answer has no data time.')
  const title = 'How large are tracked App Store downloads?'
  const subtitle = 'Download size percentiles among tracked US App Store apps.'
  const line2 = `${FEED_SCOPE}. App Store download sizes only.`
  const line3 = 'Percentiles use the nearest rank, never interpolated.'
  const item = findItem(metrics.items, 'size_percentiles', 'apple')
  if (!item || item.table.rows.length === 0) {
    const reason = skippedReason(metrics, 'size_percentiles')
    return emptyState({
      title,
      subtitle,
      source: METRICS_SOURCE,
      time,
      coverage: reason ? `Skipped: ${reason}` : 'No size percentile rows for this day.',
      line2,
      line3,
    })
  }

  const bars: Array<{ label: string; value: number }> = []
  const numbers = collect(formatDataTime(time))
  let largest: { mb: string; app: string } | null = null
  for (const row of item.table.rows) {
    const mark = cellStr(row.cells, 'mark')
    const size = cellNum(row.cells, 'size')
    const app = cellStr(row.cells, 'app')
    if (!mark || size === null || size < 0) continue
    const mbLabel = formatBytesMb(size)
    bars.push({ label: mark, value: size / 1e6 })
    for (const n of collect(mark, mbLabel, app, cellStr(row.cells, 'version'), size / 1e6)) numbers.add(n)
    if (mark === 'Largest') largest = { mb: mbLabel, app: app ?? 'an app' }
  }
  if (!bars.length || !largest) {
    return emptyState({
      title,
      subtitle,
      source: METRICS_SOURCE,
      time,
      coverage: 'Size percentile rows had no usable sizes.',
      line2,
      line3,
    })
  }

  const answer = largest.mb.replace(/ MB$/, '')
  const sentence = `${FEED_SCOPE}, the largest App Store download is ${largest.mb} (${largest.app}).`
  for (const n of collect(answer, largest.mb, largest.app, sentence)) numbers.add(n)

  return {
    model: {
      kind: 'headline',
      app: { appId: 'size-percentiles', store: 'apple', name: largest.app, iconUrl: null },
      answer,
      unit: 'MB',
      sentence,
      support: { type: 'bars', label: 'Download size (MB)', bars },
      others: [],
    },
    text: { title, subtitle, footnote: foot(METRICS_SOURCE, line2, line3) },
    source: METRICS_SOURCE,
    dataTime: formatDataTime(time),
    numbers,
    coverage: `${item.table.rows.length} percentile marks from feed metrics for ${metrics.date}.`,
    empty: false,
  }
}

export function mapChartReleaseDates(body: unknown): FeedMapped {
  const metrics = readFeedMetrics(body)
  if (!metrics) throw new FeedDataError('The feed metrics answer is missing.')
  const time = timeFromMetrics(metrics)
  if (!time) throw new FeedDataError('The feed metrics answer has no data time.')
  const store = metrics.filters.store === 'google' ? 'google' : 'apple'
  const storeName = store === 'google' ? 'Google Play' : 'App Store'
  const source = store === 'google' ? GOOGLE_METRICS_SOURCE : METRICS_SOURCE
  const item = findItem(metrics.items, 'chart_release_dates', store) ?? findItem(metrics.items, 'chart_release_dates')
  const title = `Which tracked apps on the US ${storeName} top free chart are newest?`
  const subtitle = `Original release dates among tracked apps in the US ${storeName} top free chart.`
  const line2 = `${FEED_SCOPE}. Release dates from store facts.`
  const line3 = 'Rank is the store chart position on the feed day.'
  if (!item || item.table.rows.length === 0) {
    const reason = skippedReason(metrics, 'chart_release_dates')
    return emptyState({
      title,
      subtitle,
      source,
      time,
      coverage: reason ? `Skipped: ${reason}` : 'No release-date rows for this day.',
      line2,
      line3,
    })
  }

  type Row = { app: FeedApp; released: string; releasedLabel: string; rankNow: number }
  const rows: Row[] = []
  for (const row of item.table.rows) {
    const appName = cellStr(row.cells, 'app')
    const released = cellStr(row.cells, 'released')
    const rankNow = cellNum(row.cells, 'rankNow')
    if (!appName || !released || rankNow === null || rankNow < 1) continue
    const releasedLabel = formatUtcDate(released)
    if (!releasedLabel) continue
    rows.push({ app: appFromRow(row.cells, row.href, store), released, releasedLabel, rankNow })
  }
  if (!rows.length) {
    return emptyState({
      title,
      subtitle,
      source,
      time,
      coverage: 'Release-date rows had no usable dates.',
      line2,
      line3,
    })
  }

  rows.sort((a, b) => (a.released < b.released ? 1 : a.released > b.released ? -1 : a.rankNow - b.rankNow))
  const top = rows[0]
  if (!top) {
    return emptyState({
      title,
      subtitle,
      source,
      time,
      coverage: 'Release-date rows had no usable dates.',
      line2,
      line3,
    })
  }
  const sentence = `${FEED_SCOPE}, ${top.app.name} is the newest on the US ${storeName} top free chart, released on ${top.releasedLabel}.`
  const numbers = merge(
    collect(formatDataTime(time), sentence),
    ...rows.map((r) => collect(r.releasedLabel, r.rankNow, r.app.name, r.released)),
  )

  return {
    model: {
      kind: 'leaderboard',
      rows: rows.map((r) => ({
        app: r.app,
        value: r.rankNow,
        display: r.releasedLabel,
        detail: `#${r.rankNow}`,
      })),
    },
    text: {
      title,
      subtitle: sentence,
      footnote: foot(source, line2, line3),
    },
    source,
    dataTime: formatDataTime(time),
    numbers,
    coverage: `${rows.length} apps with release dates from feed metrics for ${metrics.date}.`,
    empty: false,
  }
}

export function mapTop10Returns(body: unknown): FeedMapped {
  const feed = readDailyFeed(body)
  if (!feed) throw new FeedDataError('The daily feed answer is missing.')
  const time = timeFromFeed(feed)
  if (!time) throw new FeedDataError('The daily feed answer has no data time.')
  const title = 'Which tracked apps returned to the US App Store top ten?'
  const subtitle = 'Apps back in the US App Store top free top ten, and when they were last there.'
  const line2 = `${FEED_SCOPE}. US App Store top free only.`
  const line3 = 'A gap can mean the app was off the collected chart in between.'

  if (feed.status === 'skipped') {
    return emptyState({
      title,
      subtitle,
      source: FEED_SOURCE,
      time,
      coverage: `Daily feed skipped for ${feed.date}.`,
      line2,
      line3,
    })
  }

  const item = findItem(feed.items, 'top10_returns', 'apple:us:top-free')
  if (!item || item.table.rows.length === 0) {
    return emptyState({
      title,
      subtitle,
      source: FEED_SOURCE,
      time,
      coverage: 'No top10_returns item for this day (left out when empty).',
      line2,
      line3,
    })
  }

  type Row = { app: FeedApp; rankNow: number; lastLabel: string; rankThen: number; lastRaw: string }
  const rows: Row[] = []
  for (const row of item.table.rows) {
    const appName = cellStr(row.cells, 'app')
    const rankNow = cellNum(row.cells, 'rankNow')
    const lastRaw = cellStr(row.cells, 'lastTop10')
    const rankThen = cellNum(row.cells, 'rankThen')
    if (!appName || rankNow === null || rankNow < 1 || !lastRaw || rankThen === null || rankThen < 1) continue
    const lastLabel = formatUtcDate(lastRaw)
    if (!lastLabel) continue
    rows.push({
      app: appFromRow(row.cells, row.href, 'apple'),
      rankNow,
      lastLabel,
      rankThen,
      lastRaw,
    })
  }
  if (!rows.length) {
    return emptyState({
      title,
      subtitle,
      source: FEED_SOURCE,
      time,
      coverage: 'top10_returns rows had no usable ranks or dates.',
      line2,
      line3,
    })
  }

  rows.sort((a, b) => a.rankNow - b.rankNow)
  const top = rows[0]
  if (!top) {
    return emptyState({
      title,
      subtitle,
      source: FEED_SOURCE,
      time,
      coverage: 'top10_returns rows had no usable ranks or dates.',
      line2,
      line3,
    })
  }
  // Compose our own sentence: the feed's answer string may name the private source brand.
  const sentence = `${FEED_SCOPE}, ${top.app.name} is back in the US App Store top ten at #${top.rankNow}, last there on ${top.lastLabel}.`

  const numbers = merge(
    collect(formatDataTime(time), sentence, item.answer),
    ...rows.map((r) => collect(r.rankNow, r.rankThen, r.lastLabel, r.app.name, r.lastRaw)),
  )

  return {
    model: {
      kind: 'leaderboard',
      rows: rows.map((r) => ({
        app: r.app,
        value: r.rankNow,
        display: `#${r.rankNow}`,
        detail: `last top ten ${r.lastLabel} (#${r.rankThen})`,
      })),
    },
    text: {
      title,
      subtitle: sentence,
      footnote: foot(FEED_SOURCE, line2, line3),
    },
    source: FEED_SOURCE,
    dataTime: formatDataTime(time),
    numbers,
    coverage: `${rows.length} apps returned to the top ten in the daily feed for ${feed.date}.`,
    empty: false,
  }
}

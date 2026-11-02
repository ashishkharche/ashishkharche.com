/**
 * Live chart templates: what each one asks, which proxy requests it makes, and how the answers become a chart
 * model. The mappers are pure functions of the API answers, so they are unit tested with fixtures shaped like
 * the API reference. Every number a chart shows comes out of these answers.
 */
import { shortName } from './config.ts'
import {
  formatDataTime,
  formatDay,
  latest,
  parseDataTime,
  readAppRankings,
  readCompare,
  readMovers,
  readRankHistory,
  readRankings,
  readTechStack,
  readTechStackDetail,
  recordedAt,
  type Envelope,
  type RankHistory,
  type RankingRow,
  type TdnClient,
  type TechStackRow,
} from './tdn.ts'

export type Kind = 'headline' | 'leaderboard' | 'head-to-head' | 'bump' | 'dumbbell'

export const kindNames: Record<Kind | 'scatter', string> = {
  headline: 'Headline number',
  leaderboard: 'Ranked list',
  'head-to-head': 'Head to head',
  bump: 'Rank over time',
  dumbbell: 'iOS vs Android',
  scatter: 'Scatter',
}

export interface AppRef {
  appId: string
  store: string
  name: string
  iconUrl?: string | null
}

export interface HeadlineModel {
  kind: 'headline'
  app: AppRef
  /** The big answer: a number, or a short name when the question asks "which". */
  answer: string
  /** Small text after the answer ("countries"). */
  unit?: string
  sentence: string
  /** The supporting chart. */
  support:
    | { type: 'spark'; label: string; days: string[]; values: Array<number | null>; invert: boolean }
    | { type: 'bars'; label: string; bars: Array<{ label: string; value: number }> }
  /** Other apps shown under the answer, with a short note each ("#2"). */
  others: Array<{ app: AppRef; note: string }>
}

export interface LeaderboardModel {
  kind: 'leaderboard'
  rows: Array<{ app: AppRef; value: number; display: string; detail?: string }>
}

export interface HeadToHeadModel {
  kind: 'head-to-head'
  apps: [AppRef, AppRef]
  metrics: Array<{
    label: string
    a: number
    b: number
    display: [string, string]
    /** Which way is better, or none when more is neither better nor worse. */
    better: 'higher' | 'lower' | 'none'
  }>
}

export interface BumpModel {
  kind: 'bump'
  /** UTC days, YYYY-MM-DD. */
  days: string[]
  series: Array<{ app: AppRef; ranks: Array<number | null> }>
}

export interface DumbbellModel {
  kind: 'dumbbell'
  left: string
  right: string
  rows: Array<{ app: AppRef; left: number; right: number }>
}

export type Model = HeadlineModel | LeaderboardModel | HeadToHeadModel | BumpModel | DumbbellModel

/** The words of a chart. {source} and {time} in the footnote are filled from the Source field and the data. */
export interface ChartText {
  title: string
  subtitle: string
  footnote: [string, string, string]
  source: string
}

export interface LiveChart {
  templateId: string
  model: Model
  text: ChartText
  /** When the data was recorded, "1 Nov 2026, 00:18 UTC". */
  dataTime: string
  /** Every number the chart may show, as text ("4.8", "169"), taken from the answers. */
  numbers: Set<string>
  /** Apps the head-to-head pickers can choose from. */
  choices?: AppRef[]
  /** How much of what the chart asks for the data has, measured from the answers ("29 of 30 days have a rank"). */
  coverage: string
}

export interface LoadOptions {
  /** Rows for a ranked list or iOS vs Android. */
  rows?: number
  /** App ids for a head to head. */
  apps?: [string, string]
}

export interface LiveTemplate {
  id: string
  kind: Kind
  /** The question it answers, as listed on the page. */
  name: string
  /** Requests per load, at most 5. */
  requests: number
  /** The data in a few words, for the list: "Live, US App Store Top Free". */
  about: string
  rowChoices?: number[]
  pickApps?: boolean
  /** The API field the chart is drawn from, for the About the data panel. */
  field: string
  load(client: TdnClient, options: LoadOptions): Promise<LiveChart>
}

/**
 * A template cannot be drawn from the data it got (nothing moved, no analyzed builds, ...). The page then draws a
 * fallback template instead (see FALLBACKS), so this never reaches the page as an error.
 */
export class NoDataError extends Error {}

/** Templates drawn instead of one that has no data, in order: each needs only one rankings answer. */
export const FALLBACKS = ['us-number-one', 'google-number-one', 'grossing-number-one', 'uk-number-one'] as const

// Requests -------------------------------------------------------------------------------------------------------

/** One store chart: where it is and how the chart names it. Only charts the source collects for tracked apps. */
export interface Where {
  store: 'apple' | 'google'
  country: 'us' | 'gb'
  chart: 'top-free' | 'top-grossing'
  /** "US", "UK". */
  place: string
  /** "App Store", "Google Play". */
  storeName: string
  /** "Top Free". */
  chartName: string
}

export const US: Where = {
  store: 'apple',
  country: 'us',
  chart: 'top-free',
  place: 'US',
  storeName: 'App Store',
  chartName: 'Top Free',
}
export const US_GOOGLE: Where = { ...US, store: 'google', storeName: 'Google Play' }
export const US_GROSSING: Where = { ...US, chart: 'top-grossing', chartName: 'Top Grossing' }
export const UK: Where = { ...US, country: 'gb', place: 'UK' }

/** "US Top Free", "US Google Play Top Free". */
const chartLabel = (w: Where) =>
  w.store === 'google' ? `${w.place} ${w.storeName} ${w.chartName}` : `${w.place} ${w.chartName}`

/** Google ranks: the rankings endpoint with the overall category (Google /charts is not collected). */
const rankingParams = (w: Where) => ({
  store: w.store,
  country: w.country,
  chart: w.chart,
  limit: 200,
  ...(w.store === 'google' ? { category: 'APPLICATION' } : {}),
})

export const getRankings = (client: TdnClient, where: Where | boolean = US) =>
  client.get<Envelope<RankingRow[]>>('rankings', rankingParams(where === true ? US_GOOGLE : where || US))
export const getHistory = (client: TdnClient, appId: string, days: number, where: Where = US) =>
  client.get<Envelope<RankHistory>>('rank-history', {
    id: appId,
    store: where.store,
    countries: where.country,
    chart: where.chart,
    days,
  })
const getTechStack = (client: TdnClient) => client.get<Envelope<TechStackRow[]>>('tech-stack', { limit: 500 })

// Helpers --------------------------------------------------------------------------------------------------------

const AI_APPS = /^(chatgpt|google gemini|gemini|claude|grok|perplexity|meta ai|microsoft copilot|copilot|deepseek)\b/i

export const plainName = (name: string) =>
  shortName(name)
    .replace(/ by [A-Z].*$/, '')
    .trim()
const key = (name: string) =>
  plainName(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')

/** The rows of a rankings answer, best rank first (read by the TDN adapter in tdn.ts). */
export const sortedRankings = (body: unknown): RankingRow[] => readRankings(body)

/** A request a chart can do without: a failed one is drawn as missing data rather than stopping the chart. */
const optional = <T>(request: Promise<T>): Promise<T | null> => request.catch(() => null)

const ref = (row: RankingRow): AppRef => ({
  appId: row.appId,
  store: row.store,
  name: plainName(row.name),
  iconUrl: row.iconUrl,
})

function findApp(rows: RankingRow[], pattern: RegExp): RankingRow | undefined {
  return rows.find((r) => pattern.test(plainName(r.name)))
}

/**
 * The last rank of each UTC day, for the last `days` days ending on the latest day in the data. Only the asked
 * country's series is read (a series with no country stands in for it): when a collection slot has points for some
 * countries only, the others simply have no point there, and another country's rank is never shown in its place.
 * A day keeps its latest point that has a rank, so a missed 12:00 run leaves the 00:00 rank; a day with no ranked
 * point is a gap (null), drawn across, never filled with a made-up value.
 */
export function dailyRanks(
  history: RankHistory | undefined,
  days: number,
  country = 'us',
): { days: string[]; ranks: Array<number | null> } {
  const series = history?.series ?? []
  const points =
    series.find((s) => s.country.toLowerCase() === country.toLowerCase())?.points ??
    series.find((s) => !s.country)?.points ??
    []
  const byDay = new Map<string, { at: number; rank: number | null }>()
  for (const p of points) {
    const at = parseDataTime(p.at)
    if (!at) continue
    const day = at.toISOString().slice(0, 10)
    const rank = typeof p.rank === 'number' && p.rank > 0 ? p.rank : null
    const seen = byDay.get(day)
    const later = !seen || seen.at < at.getTime()
    if (!seen || (rank !== null && (later || seen.rank === null)) || (later && seen.rank === null)) {
      byDay.set(day, { at: at.getTime(), rank })
    }
  }
  const last = [...byDay.keys()].sort().at(-1)
  if (!last) return { days: [], ranks: [] }
  const end = Date.parse(`${last}T00:00:00Z`)
  const list = Array.from({ length: days }, (_, i) =>
    new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  )
  return { days: list, ranks: list.map((d) => byDay.get(d)?.rank ?? null) }
}

function lastPointTime(history: RankHistory | undefined): Date | null {
  return latest((history?.series ?? []).flatMap((s) => s.points.map((p) => p.at)))
}

/** Numbers as the chart writes them: whole numbers with no separator, ratings with one decimal. */
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

function requireTime(date: Date | null, what: string): Date {
  if (!date) throw new NoDataError(`The ${what} answer has no data time, so it cannot be shown as live.`)
  return date
}

// Names and icons ----------------------------------------------------------------------------------------------

/** Added to the last footnote line of a list that left an app out. */
export const NAME_NOTE = 'Apps with no name in the data are left out.'
const STAND_IN = /^(unknown|n\/a|na|none|null|undefined|-+|\?+)$/i
/** A name or company worth showing: not empty, and not a stand-in such as "Unknown". */
export const realValue = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim() !== '' && !STAND_IN.test(value.trim())

type Named = { name: string; iconUrl?: string | null }

/**
 * An app the chart may show: one with a real name. The icon is not needed: the page draws each icon that loads
 * from an allowed host, and an app without one is drawn with its name only (never a letter or a stand-in).
 */
export const usable = (app: Named): boolean => realValue(app.name)

/** The first `n` usable items in order, and how many were passed over to get them. */
export function pickUsable<T>(items: T[], n: number, app: (item: T) => Named) {
  const kept: T[] = []
  let skipped = 0
  for (const item of items) {
    if (kept.length >= n) break
    if (usable(app(item))) kept.push(item)
    else skipped++
  }
  return { kept, skipped }
}

const noted = (line: string, skipped: number) => (skipped > 0 ? `${line} ${NAME_NOTE}` : line)

const shortDay = (iso: string) => formatDay(new Date(`${iso}T00:00:00Z`)).replace(/ \d{4}$/, '')

// Mappers ---------------------------------------------------------------------------------------------------------

export function mapNumberOne(rankingsBody: unknown, historyBody: unknown, where: Where = US) {
  const all = sortedRankings(rankingsBody)
  const label = chartLabel(where)
  const { kept, skipped } = pickUsable(all, 1, ref)
  const top = kept[0]
  if (!top) throw new NoDataError(`The ${label} answer has no apps.`)
  // Rows above the top one were left out for their names only, so the answer stays the highest app the chart can name.
  const rows = all.slice(all.indexOf(top))
  const time = requireTime(recordedAt(rankingsBody) ?? lastPointTime(readRankHistory(historyBody)), label)
  const history = readRankHistory(historyBody)
  const days = 30
  const daily = dailyRanks(history, days, where.country)
  const atTop = daily.ranks.filter((r) => r === top.rank).length
  const recorded = daily.ranks.filter((r) => r !== null).length
  const name = plainName(top.name)
  const isFirst = top.rank === 1
  const picked = pickUsable(rows.slice(1), 4, ref)
  const others = picked.kept.map((r) => ({ app: ref(r), note: `#${r.rank}` }))
  const storeChart = `${where.place} ${where.storeName} ${where.chartName}`
  const sentence = isFirst
    ? `${name} is #1 on the ${storeChart} chart, and was #1 on ${atTop} of the last ${days} days.`
    : `${name} is the highest tracked app on the ${label} chart, at #${top.rank}.`
  const notWhat = where.chart === 'top-grossing' ? 'not revenue, downloads or users' : 'not downloads or users'
  return {
    model: {
      kind: 'headline',
      app: ref(top),
      answer: name,
      sentence,
      support: {
        type: 'spark',
        label: `${name}, ${where.place} rank by day`,
        days: daily.days,
        values: daily.ranks,
        invert: true,
      },
      others,
    } satisfies HeadlineModel,
    text: {
      title: isFirst
        ? `Which app is #1 on the ${label} chart right now?`
        : `Which tracked app ranks highest on the ${label} chart?`,
      subtitle: `${where.place} ${where.storeName}, ${where.chartName}, ${where.store === 'google' ? 'all apps' : 'all categories'}. Rank by day for the last ${days} days.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        `Last rank each day. ${recorded} of ${days} days have one. A gap: a failed run or below #100.`,
        noted(`Rank is the store chart position, ${notWhat}.`, skipped + picked.skipped),
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(
      collect(top.rank, atTop, days, recorded, 100, ...daily.ranks),
      ...others.map((o) => collect(o.note)),
    ),
    coverage: `${recorded} of ${days} days have a ${where.place} rank for ${name}. ${all.length} tracked apps on the chart.`,
  }
}

/** Rows older than this, before the newest row, are left out: an app that left the top 100 keeps its last rank. */
export const FRESH_HOURS = 36

export function mapCountries(rankingsBody: unknown, appRankingsBody: unknown, app: RankingRow) {
  const ranked = readAppRankings(appRankingsBody)
  // No country ranks is an answer too (0 countries), dated by the rankings answer.
  const time = requireTime(latest(ranked.map((r) => r.recordedAt)) ?? recordedAt(rankingsBody), 'country ranks')
  const cutoff = time.getTime() - FRESH_HOURS * 3_600_000
  const ranks = ranked.filter((r) => (parseDataTime(r.recordedAt)?.getTime() ?? 0) >= cutoff)
  const stale = ranked.length - ranks.length
  const count = ranks.length
  const first = ranks.filter((r) => (r.rank ?? 0) === 1).length
  const top10 = ranks.filter((r) => (r.rank ?? 0) <= 10).length
  const bands = [
    { label: '#1', value: first },
    { label: '#2 to #10', value: top10 - first },
    { label: '#11 to #50', value: ranks.filter((r) => (r.rank ?? 0) > 10 && (r.rank ?? 0) <= 50).length },
    { label: '#51 or lower', value: ranks.filter((r) => (r.rank ?? 0) > 50).length },
  ]
  const name = plainName(app.name)
  return {
    model: {
      kind: 'headline',
      app: ref(app),
      answer: String(count),
      unit: 'countries',
      sentence: count
        ? `${name} has a Top Free rank in ${count} App Store countries: #1 in ${first}, top 10 in ${top10}.`
        : `${name} has no Top Free rank in any App Store country in the latest update.`,
      support: { type: 'bars', label: 'Countries by rank', bars: bands },
      others: [],
    } satisfies HeadlineModel,
    text: {
      title: `In how many countries is ${name} on the Top Free chart?`,
      subtitle: `App Store countries where ${name} has a Top Free rank in the latest update.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        `Counts ranks recorded within ${FRESH_HOURS} hours of the latest. Only the top 100 is collected.`,
        'Rank is the store chart position, not downloads or users.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(
      collect(count, first, top10, 1, 2, 10, 11, 50, 51, 100, FRESH_HOURS),
      collect(...bands.map((b) => b.value)),
    ),
    coverage: `${count} countries with a rank from the latest ${FRESH_HOURS} hours. ${stale} older rows left out.`,
  }
}

/** Climbers in order, biggest first, before any are left out. */
export function moverCandidates(moversBody: unknown, rankingsBody: unknown, store: 'apple' | 'google' = 'apple') {
  const byId = new Map(sortedRankings(rankingsBody).map((r) => [r.appId, r]))
  // Movers covers both stores, and some rows are from other charts than the tracked Top Free list. Keep rows of one
  // store whose current rank matches the rankings answer, so the list agrees with the other Top Free charts.
  return readMovers(moversBody)
    .filter((m) => (m.store ?? 'apple') === store && byId.get(m.appId)?.rank === m.currentRank)
    .filter((m) => m.change > 0 && Number.isFinite(m.currentRank) && Number.isFinite(m.previousRank))
    .sort((a, b) => b.change - a.change || a.currentRank - b.currentRank)
    .map((m) => ({
      ...m,
      app: {
        appId: m.appId,
        store: m.store ?? store,
        name: plainName(m.name),
        iconUrl: byId.get(m.appId)?.iconUrl ?? m.iconUrl,
      } satisfies AppRef,
    }))
}

export function mapMovers(moversBody: unknown, rankingsBody: unknown, limit: number, where: Where = US) {
  const label = chartLabel(where)
  const time = requireTime(recordedAt(rankingsBody), label)
  const candidates = moverCandidates(moversBody, rankingsBody, where.store)
  const picked = pickUsable(candidates, limit, (m) => m.app)
  const movers = picked.kept
  if (!movers.length) throw new NoDataError(`No tracked app climbed on the ${label} chart in the latest update.`)
  const rows = movers.map((m) => ({
    app: m.app,
    value: m.change,
    display: `+${m.change}`,
    detail: `#${m.previousRank} to #${m.currentRank}`,
  }))
  return {
    model: { kind: 'leaderboard', rows } satisfies LeaderboardModel,
    text: {
      title: `Biggest climbs on the ${label} chart`,
      subtitle: `Places gained since the previous update, top ${rows.length} tracked apps.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        'Change compares the last two updates. After a failed run it spans a longer gap.',
        noted('Rank is the store chart position, not downloads or users.', picked.skipped),
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(collect(rows.length, limit), ...movers.map((m) => collect(m.change, m.previousRank, m.currentRank))),
    coverage: `${candidates.length} tracked apps climbed in the movers answer; ${rows.length} shown.`,
  }
}

/**
 * Analyzed builds, most SDKs first, each with its icon: the tech-stack answer's own iconUrl first, then the one the
 * rankings answers give the same app (older tech-stack answers have no iconUrl).
 */
export function sdkCandidates(
  techBody: unknown,
  appleBody: unknown,
  googleBody: unknown,
  store: 'apple' | 'google' = 'apple',
) {
  const iconOf = new Map(
    [...sortedRankings(appleBody), ...sortedRankings(googleBody)].map((r) => [`${r.store}:${r.appId}`, r.iconUrl]),
  )
  // SDK counts come from different detection on iOS and Android, so a list compares one platform only.
  const list = readTechStack(techBody).filter((r) => r.store === store && r.sdkCount > 0)
  const sorted = [...list]
    .sort((a, b) => b.sdkCount - a.sdkCount || a.appName.localeCompare(b.appName))
    .map((r) => ({
      ...r,
      app: {
        appId: r.appId,
        store: r.store,
        name: plainName(r.appName ?? ''),
        iconUrl: r.iconUrl || iconOf.get(`${r.store}:${r.appId}`),
      } satisfies AppRef,
    }))
  return { list, sorted }
}

export function mapMostSdks(
  techBody: unknown,
  appleBody: unknown,
  googleBody: unknown,
  limit: number,
  store: 'apple' | 'google' = 'apple',
) {
  const { list, sorted } = sdkCandidates(techBody, appleBody, googleBody, store)
  const os = store === 'apple' ? 'iOS' : 'Android'
  const picked = pickUsable(sorted, limit, (r) => r.app)
  const top = picked.kept
  if (!top.length) throw new NoDataError(`No analyzed ${os} builds in the answer.`)
  const times = top.map((r) => parseDataTime(r.capturedAt)).filter((d): d is Date => d !== null)
  const newest = requireTime(times.length ? new Date(Math.max(...times.map(Number))) : null, 'tech stack')
  const oldest = new Date(Math.min(...times.map(Number)))
  const rows = top.map((r) => ({
    app: r.app,
    value: r.sdkCount,
    display: String(r.sdkCount),
    detail: store === 'apple' ? 'iOS, at least' : 'Android',
  }))
  return {
    model: { kind: 'leaderboard', rows } satisfies LeaderboardModel,
    text: {
      title: `Most SDKs in one ${os} app build`,
      subtitle: picked.skipped
        ? `Third-party SDKs found in the latest analyzed ${os} build: ${rows.length} of ${list.length} ${os} builds, most first.`
        : `Third-party SDKs found in the latest analyzed ${os} build, top ${rows.length} of ${list.length} ${os} builds.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        store === 'apple'
          ? `Builds analyzed ${formatDay(oldest)} to ${formatDay(newest)}. iOS counts are a floor: at least this many.`
          : `Builds analyzed ${formatDay(oldest)} to ${formatDay(newest)}. Some Android counts are a floor.`,
        noted('An SDK count says nothing about app size, quality or privacy.', picked.skipped),
      ] as [string, string, string],
    },
    dataTime: formatDataTime(newest),
    numbers: merge(
      collect(rows.length, list.length, limit, formatDay(oldest), formatDay(newest)),
      ...top.map((r) => collect(r.sdkCount)),
    ),
    coverage: `${list.length} ${os} builds analyzed, ${top.length} shown${picked.skipped ? `, ${picked.skipped} passed over for names` : ''}.`,
  }
}

const shortLabels: Record<string, string> = {
  'US Top Free rank': 'US rank',
  'Countries with a Top Free rank': 'countries charted',
  'Star rating': 'rating',
  'SDKs in the latest iOS build, at least': 'SDKs (at least)',
  'Versions on record': 'versions',
}

/** "a, b and c". */
const list = (items: string[]) =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

export function mapHeadToHead(
  rankingsBody: unknown,
  compareBody: unknown,
  techBody: unknown,
  countryBodies: [unknown, unknown],
  pair: [RankingRow, RankingRow],
) {
  const time = requireTime(recordedAt(rankingsBody), 'US Top Free')
  const compared = readCompare(compareBody)
  const tech = readTechStack(techBody)
  const row = (app: RankingRow) => compared.find((c) => c.appId === app.appId)
  const sdk = (app: RankingRow) => tech.find((t) => t.store === app.store && t.appId === app.appId)?.sdkCount
  // A count only when the answer came: a failed request is a missing measure, not 0 countries.
  const countries = (body: unknown) => (body ? readAppRankings(body).length : undefined)
  const [a, b] = pair
  const candidates: HeadToHeadModel['metrics'] = []
  const add = (
    label: string,
    va: number | null | undefined,
    vb: number | null | undefined,
    better: 'higher' | 'lower' | 'none',
    format: (v: number) => string,
  ) => {
    if (typeof va === 'number' && typeof vb === 'number' && Number.isFinite(va) && Number.isFinite(vb)) {
      candidates.push({ label, a: va, b: vb, display: [format(va), format(vb)], better })
    }
  }
  add('US Top Free rank', row(a)?.rank ?? a.rank, row(b)?.rank ?? b.rank, 'lower', (v) => `#${v}`)
  add('Countries with a Top Free rank', countries(countryBodies[0]), countries(countryBodies[1]), 'higher', String)
  add('Star rating', row(a)?.currentRating, row(b)?.currentRating, 'higher', (v) => v.toFixed(1))
  // Same platform for both apps (iOS), and every iOS count is a floor.
  add('SDKs in the latest iOS build, at least', sdk(a), sdk(b), 'none', String)
  add('Versions on record', row(a)?.versionCount, row(b)?.versionCount, 'none', String)
  const metrics = candidates.slice(0, 5)
  if (!metrics.length) throw new NoDataError('No measure has values for both apps.')
  const [na, nb] = [plainName(a.name), plainName(b.name)]
  return {
    model: { kind: 'head-to-head', apps: [ref(a), ref(b)], metrics } satisfies HeadToHeadModel,
    text: {
      title: `${na} vs ${nb}`,
      subtitle: `${list(metrics.map((m) => shortLabels[m.label] ?? m.label))}, side by side.`.replace(/^./, (c) =>
        c.toUpperCase(),
      ),
      footnote: [
        'Source: {source}. Data from {time}.',
        'Rank and rating are for the US App Store. Countries: App Store countries with a recorded rank.',
        metrics.length < 5
          ? 'Rank is not downloads or users. Measures without values for both apps are left out.'
          : 'Rank is not downloads or users. Ratings round to one decimal.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(collect(1), ...metrics.map((m) => collect(...m.display))),
    coverage: `${metrics.length} of 5 measures have values for both apps.`,
  }
}

export function mapBump(
  rankingsBody: unknown,
  historyBodies: unknown[],
  apps: RankingRow[],
  days: number,
  skipped = 0,
  which = 'AI apps',
) {
  const series = apps
    .map((app, i) => ({ app: ref(app), daily: dailyRanks(readRankHistory(historyBodies[i]), days) }))
    .filter((s) => usable(s.app))
  // An app with one ranked day is drawn as a dot; gaps between days are drawn across.
  const withData = series.filter((s) => s.daily.ranks.some((r) => r !== null))
  if (!withData.length) throw new NoDataError('No app has a rank history.')
  const last =
    withData
      .map((s) => s.daily.days.at(-1) ?? '')
      .sort()
      .at(-1) ?? ''
  const end = Date.parse(`${last}T00:00:00Z`)
  const dayList = Array.from({ length: days }, (_, i) =>
    new Date(end - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  )
  const time = requireTime(
    latest(historyBodies.map((b) => lastPointTime(readRankHistory(b))?.toISOString())),
    'rank history',
  )
  const out = withData.map((s) => {
    const byDay = new Map(s.daily.days.map((d, i) => [d, s.daily.ranks[i] ?? null]))
    return { app: s.app, ranks: dayList.map((d) => byDay.get(d) ?? null) }
  })
  const names = out.map((s) => s.app.name)
  return {
    model: { kind: 'bump', days: dayList, series: out } satisfies BumpModel,
    text: {
      title: `US Top Free rank over ${days} days`,
      subtitle:
        out.length === 1
          ? `Rank by day, US App Store, Top Free: ${list(names)}, the highest-ranked of the ${which} today.`
          : `Rank by day, US App Store, Top Free: ${list(names)}, the ${out.length} highest-ranked ${which} today.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        `${shortDay(dayList[0] ?? '')} to ${shortDay(last)}. Last rank each day. A gap: a failed run or below #100.`,
        noted('Rank is the store chart position, not downloads or users.', skipped),
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(
      collect(days, out.length, 100, shortDay(dayList[0] ?? ''), shortDay(last), ...dayList.map(shortDay)),
      ...out.map((s) => collect(...s.ranks)),
    ),
    coverage: `Days with a rank: ${out.map((s) => `${s.app.name} ${s.ranks.filter((r) => r !== null).length} of ${days}`).join(', ')}.`,
  }
}

/** iOS apps, best US rank first, that are also on the Google Play chart. */
export function bothStoreCandidates(appleBody: unknown, googleBody: unknown) {
  const androidRank = new Map<string, number>()
  for (const r of sortedRankings(googleBody)) if (!androidRank.has(key(r.name))) androidRank.set(key(r.name), r.rank)
  return sortedRankings(appleBody)
    .filter((r) => androidRank.has(key(r.name)))
    .map((r) => ({ row: r, app: ref(r), right: androidRank.get(key(r.name)) ?? 0 }))
}

export function mapIosAndroid(appleBody: unknown, googleBody: unknown, limit: number) {
  const appleTime = requireTime(recordedAt(appleBody), 'App Store')
  const googleTime = requireTime(recordedAt(googleBody), 'Google Play')
  const both = bothStoreCandidates(appleBody, googleBody)
  const picked = pickUsable(both, limit, (c) => c.app)
  const rows = picked.kept.map((c) => ({ app: c.app, left: c.row.rank, right: c.right }))
  if (!rows.length) throw new NoDataError('No tracked app is on both US Top Free charts.')
  const same = formatDataTime(appleTime) === formatDataTime(googleTime)
  return {
    model: { kind: 'dumbbell', left: 'App Store (iOS)', right: 'Google Play (Android)', rows } satisfies DumbbellModel,
    text: {
      title: 'US Top Free rank on iOS and Android',
      subtitle:
        rows.length === 1
          ? 'The one tracked iOS app that is also on the Google Play Top Free chart.'
          : `The ${rows.length} highest-ranked tracked iOS apps that are also on the Google Play Top Free chart.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        same
          ? 'Apps matched by name across the two stores. Google Play: all apps, Top Free.'
          : `Google Play data from ${formatDataTime(googleTime)}. Apps matched by name across the stores.`,
        noted('Rank is the store chart position, not downloads or users.', picked.skipped),
      ] as [string, string, string],
    },
    dataTime: formatDataTime(appleTime),
    numbers: merge(collect(rows.length, formatDataTime(googleTime)), ...rows.map((r) => collect(r.left, r.right))),
    coverage: `${both.length} tracked apps are on both charts, matched by name; ${rows.length} shown.`,
  }
}

export function mapSdkKinds(rankingsBody: unknown, detailBody: unknown, app: RankingRow) {
  const detail = readTechStackDetail(detailBody)
  const grouped = (detail?.techStack?.sdks ?? [])
    .map((g) => ({
      label: realValue(g.label) ? g.label : g.category,
      value: Array.isArray(g.items) ? g.items.length : 0,
    }))
    .filter((g) => realValue(g.label) && g.value > 0)
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))
  // A build with a count but no grouped list is one bar, "Other" (the footnote says what that is).
  const groups = grouped.length
    ? grouped
    : detail?.sdkCount && detail.sdkCount > 0
      ? [{ label: 'Other', value: detail.sdkCount }]
      : []
  if (!groups.length) throw new NoDataError(`${plainName(app.name)} has no analyzed SDK list.`)
  const listed = groups.reduce((n, g) => n + g.value, 0)
  const total = typeof detail?.sdkCount === 'number' && detail.sdkCount >= listed ? detail.sdkCount : listed
  const time = requireTime(parseDataTime(detail?.capturedAt), 'tech stack')
  // Five bars at most, so the labels stay readable at every size; the rest add up in one bar.
  const shown = groups.length > 5 ? groups.slice(0, 4) : groups
  const rest = groups.slice(shown.length)
  const bars = rest.length
    ? [...shown, { label: `${rest.length} more kinds`, value: rest.reduce((n, g) => n + g.value, 0) }]
    : shown
  const name = plainName(app.name)
  const floor = detail?.sdkListIsFloor !== false
  const version = detail?.version && /^[\w.() -]{1,40}$/.test(detail.version) ? detail.version : ''
  return {
    model: {
      kind: 'headline',
      app: ref(app),
      answer: String(total),
      unit: floor ? 'SDKs, at least' : 'SDKs',
      sentence: `${name}'s latest analyzed iOS build ships ${floor ? 'at least ' : ''}${total} third-party SDKs, in ${groups.length} kinds.`,
      support: { type: 'bars', label: 'SDKs by kind', bars },
      others: [],
    } satisfies HeadlineModel,
    text: {
      title: `What kinds of SDKs does the ${name} iOS app ship?`,
      subtitle: 'Third-party SDKs found in the latest analyzed iOS build, grouped by kind.',
      footnote: [
        'Source: {source}. Data from {time}.',
        `${version ? `Build ${version}, analyzed` : 'Analyzed'} ${formatDay(time)}. iOS counts are a floor: at least this many.`,
        "Kinds are the source's grouping. Other: SDKs it does not group.",
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(
      collect(total, groups.length, listed, version, formatDay(time)),
      ...bars.map((b) => collect(b.value, b.label)),
    ),
    coverage: `${listed} SDKs listed in ${groups.length} kinds for one build; the list is ${floor ? 'a floor' : 'complete'}.`,
  }
}

// Templates -------------------------------------------------------------------------------------------------------

const chartsSource = 'public App Store chart data'
const bothStores = 'public App Store and Google Play chart data'
const buildSource = 'public app build analysis data'

function finish(
  templateId: string,
  source: string,
  mapped: { model: Model; text: Omit<ChartText, 'source'>; dataTime: string; numbers: Set<string>; coverage: string },
  choices?: AppRef[],
): LiveChart {
  return { templateId, ...mapped, text: { ...mapped.text, source }, choices }
}

/** The highest tracked app on one chart, with its rank by day. */
function numberOne(id: string, where: Where, source: string): LiveTemplate['load'] {
  return async (client) => {
    const rankings = await getRankings(client, where)
    const top = pickUsable(sortedRankings(rankings), 1, ref).kept[0]
    if (!top) throw new NoDataError(`The ${chartLabel(where)} answer has no apps.`)
    const history = await optional(getHistory(client, top.appId, 30, where))
    return finish(id, source, mapNumberOne(rankings, history, where))
  }
}

/** App Store ids of the apps some templates are about, for when the app is not in the latest rankings answer. */
export const KNOWN_IDS = { chatgpt: '6448311069', claude: '6473753684' } as const

/** The app a template is about: its row in the rankings answer, or its known id and name when it is not there. */
function appFor(rows: RankingRow[], pattern: RegExp, label: string, id: string): RankingRow {
  return findApp(rows, pattern) ?? { rank: 0, appId: id, store: 'apple', name: label, iconUrl: null }
}

/** In how many App Store countries one app has a fresh Top Free rank. */
function countries(id: string, pattern: RegExp, label: string, appId: string): LiveTemplate['load'] {
  return async (client) => {
    const rankings = await getRankings(client)
    const app = appFor(sortedRankings(rankings), pattern, label, appId)
    const detail = await client.get('app-rankings', { id: app.appId, store: 'apple', chart_type: 'top-free' })
    return finish(id, chartsSource, mapCountries(rankings, detail, app))
  }
}

function climbers(id: string, where: Where, source: string): LiveTemplate['load'] {
  return async (client, { rows = 10 }) => {
    const [movers, rankings] = await Promise.all([
      client.get('movers', { country: 'us', chart: 'top-free', limit: 20 }),
      getRankings(client, where),
    ])
    return finish(id, source, mapMovers(movers, rankings, rows, where))
  }
}

function mostSdks(id: string, store: 'apple' | 'google'): LiveTemplate['load'] {
  return async (client, { rows = 10 }) => {
    // The rankings answers only add icons, so the list is drawn without them if they fail.
    const [tech, apple, google] = await Promise.all([
      getTechStack(client),
      optional(getRankings(client)),
      optional(getRankings(client, true)),
    ])
    return finish(id, buildSource, mapMostSdks(tech, apple, google, rows, store))
  }
}

const googleSource = 'public Google Play chart data'

export const liveTemplates: LiveTemplate[] = [
  {
    id: 'us-number-one',
    about: 'Live · US App Store, Top Free',
    kind: 'headline',
    name: 'Which tracked app ranks highest on the US Top Free chart?',
    field: 'rankings rank, rank-history points (US, 30 days)',
    requests: 2,
    load: numberOne('us-number-one', US, chartsSource),
  },
  {
    id: 'google-number-one',
    about: 'Live · US Google Play, Top Free',
    kind: 'headline',
    name: 'Which tracked app ranks highest on the US Google Play chart?',
    field: 'rankings rank (Google, APPLICATION), rank-history points',
    requests: 2,
    load: numberOne('google-number-one', US_GOOGLE, googleSource),
  },
  {
    id: 'grossing-number-one',
    about: 'Live · US App Store, Top Grossing',
    kind: 'headline',
    name: 'Which tracked app ranks highest on the US Top Grossing chart?',
    field: 'rankings rank (top-grossing), rank-history points',
    requests: 2,
    load: numberOne('grossing-number-one', US_GROSSING, chartsSource),
  },
  {
    id: 'uk-number-one',
    about: 'Live · UK App Store, Top Free',
    kind: 'headline',
    name: 'Which tracked app ranks highest on the UK Top Free chart?',
    field: 'rankings rank (gb), rank-history points (gb)',
    requests: 2,
    load: numberOne('uk-number-one', UK, chartsSource),
  },
  {
    id: 'chatgpt-countries',
    about: 'Live · App Store, all countries',
    kind: 'headline',
    name: 'In how many countries is ChatGPT on the Top Free chart?',
    field: 'app rankings per country, recordedAt within 36 hours',
    requests: 2,
    load: countries('chatgpt-countries', /^chatgpt$/i, 'ChatGPT', KNOWN_IDS.chatgpt),
  },
  {
    id: 'claude-countries',
    about: 'Live · App Store, all countries',
    kind: 'headline',
    name: 'In how many countries is Claude on the Top Free chart?',
    field: 'app rankings per country, recordedAt within 36 hours',
    requests: 2,
    load: countries('claude-countries', /^claude\b/i, 'Claude', KNOWN_IDS.claude),
  },
  {
    id: 'chatgpt-sdk-kinds',
    about: 'Live · Analyzed iOS build',
    kind: 'headline',
    name: 'What kinds of SDKs does the ChatGPT iOS app ship?',
    field: 'tech-stack detail: techStack.sdks by category, sdkListIsFloor',
    requests: 2,
    async load(client) {
      const rankings = await getRankings(client)
      const app = appFor(sortedRankings(rankings), /^chatgpt$/i, 'ChatGPT', KNOWN_IDS.chatgpt)
      const detail = await client.get('tech-stack-app', { id: app.appId, store: 'apple' })
      return finish('chatgpt-sdk-kinds', buildSource, mapSdkKinds(rankings, detail, app))
    },
  },
  {
    id: 'us-climbers',
    about: 'Live · US App Store, latest update',
    kind: 'leaderboard',
    name: 'Who climbed most on the US Top Free chart since the last update?',
    field: 'movers change, matched to rankings rank',
    requests: 2,
    rowChoices: [5, 10],
    load: climbers('us-climbers', US, chartsSource),
  },
  {
    id: 'google-climbers',
    about: 'Live · US Google Play, latest update',
    kind: 'leaderboard',
    name: 'Who climbed most on the US Google Play chart since the last update?',
    field: 'movers change (Google rows), matched to rankings rank',
    requests: 2,
    rowChoices: [5, 10],
    load: climbers('google-climbers', US_GOOGLE, googleSource),
  },
  {
    id: 'most-sdks',
    about: 'Live · Analyzed iOS builds',
    kind: 'leaderboard',
    name: 'Which iOS app builds ship the most SDKs?',
    field: 'tech-stack sdkCount (iOS only, a floor)',
    requests: 3,
    rowChoices: [5, 10],
    load: mostSdks('most-sdks', 'apple'),
  },
  {
    id: 'most-sdks-android',
    about: 'Live · Analyzed Android builds',
    kind: 'leaderboard',
    name: 'Which Android app builds ship the most SDKs?',
    field: 'tech-stack sdkCount (Android only)',
    requests: 3,
    rowChoices: [5, 10],
    load: mostSdks('most-sdks-android', 'google'),
  },
  {
    id: 'chatgpt-vs-gemini',
    about: 'Live · US App Store and builds',
    kind: 'head-to-head',
    name: 'ChatGPT vs Gemini: rank, countries, rating, SDKs',
    field: 'compare rating and versions, rankings, app rankings, tech-stack sdkCount (iOS)',
    requests: 5,
    pickApps: true,
    async load(client, { apps }) {
      const rankings = await getRankings(client)
      const rows = sortedRankings(rankings).filter((r) => usable(ref(r)))
      const pick = (id: string | undefined, pattern: RegExp) =>
        (id ? rows.find((r) => r.appId === id) : undefined) ?? findApp(rows, pattern)
      // ChatGPT and Gemini, or the picked apps; any that is missing is filled with the highest tracked app left.
      const chosen = [pick(apps?.[0], /^chatgpt$/i), pick(apps?.[1], /^(google )?gemini$/i)]
      if (chosen[0] && chosen[1] && chosen[0].appId === chosen[1].appId) chosen[1] = undefined
      for (const [i, app] of chosen.entries())
        if (!app) chosen[i] = rows.find((r) => !chosen.some((c) => c?.appId === r.appId))
      const [a, b] = chosen
      if (!a || !b) throw new NoDataError('Fewer than 2 apps are in the latest US Top Free data.')
      // Every measure but the rank is optional: one that does not come is left out of the chart.
      const [compare, tech, ca, cb] = await Promise.all([
        optional(client.get('compare', { apps: `${a.appId},${b.appId}`, store: 'apple', country: 'us', days: 30 })),
        optional(getTechStack(client)),
        optional(client.get('app-rankings', { id: a.appId, store: 'apple', chart_type: 'top-free' })),
        optional(client.get('app-rankings', { id: b.appId, store: 'apple', chart_type: 'top-free' })),
      ])
      return finish(
        'chatgpt-vs-gemini',
        chartsSource,
        mapHeadToHead(rankings, compare, tech, [ca, cb], [a, b]),
        rows.map(ref),
      )
    },
  },
  {
    id: 'ai-rank-30-days',
    about: 'Live · US App Store, 30 days',
    kind: 'bump',
    name: 'How have the top AI apps ranked in the US over 30 days?',
    field: 'rank-history points (US, 30 days)',
    requests: 5,
    async load(client) {
      const rankings = await getRankings(client)
      const rows = sortedRankings(rankings)
      const ai = pickUsable(
        rows.filter((r) => AI_APPS.test(plainName(r.name))),
        4,
        ref,
      )
      // With fewer than 2 AI apps on the chart, the highest tracked apps are drawn, and the subtitle says so.
      const [{ kept: apps, skipped }, which] =
        ai.kept.length >= 2 ? [ai, 'AI apps'] : [pickUsable(rows, 4, ref), 'tracked apps']
      const histories = await Promise.all(apps.map((app) => optional(getHistory(client, app.appId, 30))))
      return finish('ai-rank-30-days', chartsSource, mapBump(rankings, histories, apps, 30, skipped, which))
    },
  },
  {
    id: 'ios-vs-android',
    about: 'Live · US App Store and Google Play',
    kind: 'dumbbell',
    name: 'Do the top US apps rank the same on iOS and Android?',
    field: 'rankings rank on both stores, matched by name',
    requests: 2,
    rowChoices: [5, 8],
    async load(client, { rows = 8 }) {
      const [apple, google] = await Promise.all([getRankings(client), getRankings(client, true)])
      return finish('ios-vs-android', bothStores, mapIosAndroid(apple, google, rows))
    },
  },
]

/**
 * The data-file (scatter) templates: the field each one plots, and why a template is held back. A held-back
 * template is not in the default gallery; it is listed under Pending verification with the reason.
 */
export const scatterNotes: Record<string, { field: string; pending?: string }> = {
  'us-rank-countries': { field: 'latest US rank and countries with a rank (data file)' },
  'us-rating-countries': { field: 'star rating and countries with a rank (data file)' },
  'android-permissions': {
    field: 'Android permissions per build (data file)',
    pending: 'Permission counts are not in the live API coverage check yet.',
  },
  'android-native-libs': {
    field: 'Android native libraries per build (data file)',
    pending: 'Native library counts are not in the live API coverage check yet.',
  },
}

// Rules -------------------------------------------------------------------------------------------------------------

export const FOOT_MAX = 110
const siteMark = /\b(?:https?:\/\/|www\.)|\b[a-z0-9-]+\.(?:com|net|org|io|app|dev|co|uk)\b|ashish\s*kharche/i

/** The footnote as drawn: {source} and {time} filled in. */
export function liveFootnote(chart: LiveChart, text: ChartText = chart.text): string[] {
  return text.footnote.map((line) => line.replaceAll('{source}', text.source).replaceAll('{time}', chart.dataTime))
}

/** Problems that stop a live chart from being drawn or downloaded. Empty means fine. */
export function validateLive(chart: LiveChart, text: ChartText = chart.text): string[] {
  const errors: string[] = []
  const foot = liveFootnote(chart, text)
  if (!chart.dataTime) errors.push('The data has no time, so it cannot be shown as live.')
  if (!text.title.trim()) errors.push('The chart needs a title.')
  if (foot.length !== 3) errors.push('The footnote needs exactly 3 lines.')
  if (!foot[0]?.startsWith('Source:')) errors.push('The first footnote line must start with "Source:".')
  if (!text.source.trim()) errors.push('Say where the data comes from (the Source line).')
  if (!text.footnote.some((line) => line.includes('{time}')))
    errors.push('The footnote must show the data time, {time}.')
  for (const [i, line] of foot.entries()) {
    if (!line.trim()) errors.push(`Footnote line ${i + 1} is empty.`)
    if (line.length > FOOT_MAX)
      errors.push(`Footnote line ${i + 1} is ${line.length} characters; the limit is ${FOOT_MAX}.`)
  }
  const visible = [text.title, text.subtitle, ...foot]
  if (visible.some((t) => siteMark.test(t))) errors.push('No site name or web address on the chart.')
  if (visible.some((t) => /[\u2013\u2014]/.test(t))) errors.push('Use a comma or a full stop, not a long dash.')
  const allowed = merge(chart.numbers, collect(chart.dataTime))
  const unknown = [...new Set(visible.flatMap((t) => t.match(/\d+(?:\.\d+)?/g) ?? []))].filter((n) => !allowed.has(n))
  if (unknown.length) errors.push(`These numbers are not in the data: ${unknown.join(', ')}.`)
  return [...new Set(errors)]
}

// Always a chart --------------------------------------------------------------------------------------------------

export interface Loaded {
  chart: LiveChart
  /** Why another template is drawn in place of the one asked for, or empty. */
  note: string
}

/**
 * Loads a template, and when its data cannot answer its question (NoDataError), the first fallback template that
 * can, with a note saying so. A failed request (TdnError, a network error) is passed on: the page waits and asks
 * again, and the proxy answers with its last kept copy when the source is down.
 */
export async function loadWithFallback(
  template: LiveTemplate,
  client: TdnClient,
  options: LoadOptions = {},
  templates: LiveTemplate[] = liveTemplates,
): Promise<Loaded> {
  try {
    return { chart: await template.load(client, options), note: '' }
  } catch (error) {
    if (!(error instanceof NoDataError)) throw error
    for (const id of FALLBACKS) {
      const fallback = templates.find((t) => t.id === id)
      if (!fallback || fallback.id === template.id) continue
      try {
        const chart = await fallback.load(client, {})
        return { chart, note: `${error.message} The chart "${fallback.name}" is shown instead.` }
      } catch (next) {
        if (!(next instanceof NoDataError)) throw next
      }
    }
    throw error
  }
}

/** Seconds to wait before asking again after the n-th failed load (0 first): soon at first, then once a minute. */
export const retryDelay = (n: number): number => [2, 5, 10, 20, 30][n] ?? 60

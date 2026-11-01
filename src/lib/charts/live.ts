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
  metaOf,
  parseDataTime,
  unwrap,
  type AppRankings,
  type CompareRow,
  type Envelope,
  type MoverRow,
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
  load(client: TdnClient, options: LoadOptions): Promise<LiveChart>
}

/** A template cannot be drawn from the data it got (an app is missing, nothing moved, ...). */
export class NoDataError extends Error {}

// Requests -------------------------------------------------------------------------------------------------------

const US_TOP_FREE = { store: 'apple', country: 'us', chart: 'top-free', limit: 200 } as const
/** Google ranks: the rankings endpoint with the overall category (Google /charts is not collected). */
const US_TOP_FREE_GOOGLE = { ...US_TOP_FREE, store: 'google', category: 'APPLICATION' } as const

const getRankings = (client: TdnClient, google = false) =>
  client.get<Envelope<RankingRow[]>>('rankings', google ? US_TOP_FREE_GOOGLE : US_TOP_FREE)
const getHistory = (client: TdnClient, appId: string, days: number) =>
  client.get<Envelope<RankHistory>>('rank-history', {
    id: appId,
    store: 'apple',
    countries: 'us',
    chart: 'top-free',
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

export function sortedRankings(body: unknown): RankingRow[] {
  const rows = unwrap<RankingRow[]>(body)
  if (!Array.isArray(rows)) return []
  return rows.filter((r) => Number.isFinite(r.rank)).sort((a, b) => a.rank - b.rank)
}

const ref = (row: RankingRow): AppRef => ({
  appId: row.appId,
  store: row.store,
  name: plainName(row.name),
  iconUrl: row.iconUrl,
})

function findApp(rows: RankingRow[], pattern: RegExp): RankingRow | undefined {
  return rows.find((r) => pattern.test(plainName(r.name)))
}

/** The last rank of each UTC day, for the last `days` days ending on the latest day in the data. */
export function dailyRanks(
  history: RankHistory | undefined,
  days: number,
): { days: string[]; ranks: Array<number | null> } {
  const points = history?.series.find((s) => s.country === 'us')?.points ?? history?.series[0]?.points ?? []
  const byDay = new Map<string, { at: number; rank: number | null }>()
  for (const p of points) {
    const at = parseDataTime(p.at)
    if (!at) continue
    const day = at.toISOString().slice(0, 10)
    const seen = byDay.get(day)
    if (!seen || seen.at < at.getTime()) byDay.set(day, { at: at.getTime(), rank: p.rank ?? null })
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

const shortDay = (iso: string) => formatDay(new Date(`${iso}T00:00:00Z`)).replace(/ \d{4}$/, '')

// Mappers ---------------------------------------------------------------------------------------------------------

export function mapNumberOne(rankingsBody: unknown, historyBody: unknown) {
  const rows = sortedRankings(rankingsBody)
  const top = rows[0]
  if (!top) throw new NoDataError('The US Top Free answer has no apps.')
  const time = requireTime(parseDataTime(metaOf(rankingsBody).recordedAt), 'US Top Free')
  const history = unwrap<RankHistory>(historyBody)
  const days = 30
  const daily = dailyRanks(history, days)
  const atTop = daily.ranks.filter((r) => r === top.rank).length
  const recorded = daily.ranks.filter((r) => r !== null).length
  const name = plainName(top.name)
  const isFirst = top.rank === 1
  const others = rows.slice(1, 5).map((r) => ({ app: ref(r), note: `#${r.rank}` }))
  const sentence = isFirst
    ? `${name} is #1 on the US App Store Top Free chart, and was #1 on ${atTop} of the last ${days} days.`
    : `${name} is the highest tracked app on the US Top Free chart, at #${top.rank}.`
  return {
    model: {
      kind: 'headline',
      app: ref(top),
      answer: name,
      sentence,
      support: { type: 'spark', label: `${name}, US rank by day`, days: daily.days, values: daily.ranks, invert: true },
      others,
    } satisfies HeadlineModel,
    text: {
      title: isFirst
        ? 'Which app is #1 on the US Top Free chart right now?'
        : 'Which tracked app ranks highest on the US Top Free chart?',
      subtitle: `US App Store, Top Free, all categories. Rank by day for the last ${days} days.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        `Daily rank is the last recorded rank that day. ${recorded} of ${days} days have a rank.`,
        'Rank is the store chart position, not downloads or users.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(collect(top.rank, atTop, days, recorded, ...daily.ranks), ...others.map((o) => collect(o.note))),
  }
}

export function mapCountries(rankingsBody: unknown, appRankingsBody: unknown, app: RankingRow) {
  const detail = unwrap<AppRankings>(appRankingsBody)
  const ranks = (detail?.rankings ?? []).filter((r) => typeof r.rank === 'number' && r.rank > 0)
  if (!ranks.length) throw new NoDataError(`${plainName(app.name)} has no country ranks in the latest update.`)
  const time = requireTime(latest(ranks.map((r) => r.recordedAt)), 'country ranks')
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
      sentence: `${name} has a Top Free rank in ${count} App Store countries: #1 in ${first}, top 10 in ${top10}.`,
      support: { type: 'bars', label: 'Countries by rank', bars: bands },
      others: [],
    } satisfies HeadlineModel,
    text: {
      title: `In how many countries is ${name} on the Top Free chart?`,
      subtitle: `App Store countries where ${name} has a Top Free rank in the latest update.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        'Counts only countries with a recorded rank. A country without one is not counted.',
        'Rank is the store chart position, not downloads or users.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(collect(count, first, top10, 1, 2, 10, 11, 50, 51), collect(...bands.map((b) => b.value))),
  }
}

export function mapMovers(moversBody: unknown, rankingsBody: unknown, limit: number) {
  const rankings = sortedRankings(rankingsBody)
  const time = requireTime(parseDataTime(metaOf(rankingsBody).recordedAt), 'US Top Free')
  const byId = new Map(rankings.map((r) => [r.appId, r]))
  // Movers covers both stores, and some rows are from other charts than the tracked US Top Free list. Keep App Store
  // rows whose current rank matches the rankings answer, so the list agrees with the other US Top Free charts.
  const movers = (unwrap<MoverRow[]>(moversBody) ?? [])
    .filter((m) => (m.store ?? 'apple') === 'apple' && byId.get(m.appId)?.rank === m.currentRank)
    .filter((m) => m.change > 0 && Number.isFinite(m.currentRank) && Number.isFinite(m.previousRank))
    .sort((a, b) => b.change - a.change || a.currentRank - b.currentRank)
    .slice(0, limit)
  if (!movers.length) throw new NoDataError('No tracked app climbed on the US Top Free chart in the latest update.')
  const rows = movers.map((m) => ({
    app: {
      appId: m.appId,
      store: m.store ?? 'apple',
      name: plainName(m.name),
      iconUrl: byId.get(m.appId)?.iconUrl ?? m.iconUrl,
    },
    value: m.change,
    display: `+${m.change}`,
    detail: `#${m.previousRank} to #${m.currentRank}`,
  }))
  return {
    model: { kind: 'leaderboard', rows } satisfies LeaderboardModel,
    text: {
      title: 'Biggest climbs on the US Top Free chart',
      subtitle: `Places gained since the previous update, top ${rows.length} tracked apps.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        'Change compares the latest US Top Free update with the one before it.',
        'Rank is the store chart position, not downloads or users.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(collect(rows.length, limit), ...movers.map((m) => collect(m.change, m.previousRank, m.currentRank))),
  }
}

export function mapMostSdks(techBody: unknown, appleBody: unknown, googleBody: unknown, limit: number) {
  const icons = new Map(
    [...sortedRankings(appleBody), ...sortedRankings(googleBody)].map((r) => [`${r.store}:${r.appId}`, r.iconUrl]),
  )
  const list = (unwrap<TechStackRow[]>(techBody) ?? []).filter((r) => Number.isFinite(r.sdkCount) && r.sdkCount > 0)
  const top = [...list].sort((a, b) => b.sdkCount - a.sdkCount || a.appName.localeCompare(b.appName)).slice(0, limit)
  if (!top.length) throw new NoDataError('No analyzed builds in the answer.')
  const times = top.map((r) => parseDataTime(r.capturedAt)).filter((d): d is Date => d !== null)
  const newest = requireTime(times.length ? new Date(Math.max(...times.map(Number))) : null, 'tech stack')
  const oldest = new Date(Math.min(...times.map(Number)))
  const rows = top.map((r) => ({
    app: { appId: r.appId, store: r.store, name: plainName(r.appName), iconUrl: icons.get(`${r.store}:${r.appId}`) },
    value: r.sdkCount,
    display: String(r.sdkCount),
    detail: r.store === 'google' ? 'Android' : 'iOS',
  }))
  return {
    model: { kind: 'leaderboard', rows } satisfies LeaderboardModel,
    text: {
      title: 'Most SDKs in one app build',
      subtitle: `Third-party SDKs detected in the latest analyzed build, top ${rows.length} of ${list.length} builds.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        `Builds analyzed ${formatDay(oldest)} to ${formatDay(newest)}. Detected SDKs can be a lower bound.`,
        'An SDK count says nothing about app size, quality or privacy.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(newest),
    numbers: merge(
      collect(rows.length, list.length, limit, formatDay(oldest), formatDay(newest)),
      ...top.map((r) => collect(r.sdkCount)),
    ),
  }
}

const shortLabels: Record<string, string> = {
  'US Top Free rank': 'US rank',
  'Countries with a Top Free rank': 'countries charted',
  'Star rating': 'rating',
  'SDKs in the latest build': 'SDKs',
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
  const time = requireTime(parseDataTime(metaOf(rankingsBody).recordedAt), 'US Top Free')
  const compared = unwrap<CompareRow[]>(compareBody) ?? []
  const tech = unwrap<TechStackRow[]>(techBody) ?? []
  const row = (app: RankingRow) => compared.find((c) => c.appId === app.appId)
  const sdk = (app: RankingRow) => tech.find((t) => t.store === app.store && t.appId === app.appId)?.sdkCount
  const countries = (body: unknown) =>
    (unwrap<AppRankings>(body)?.rankings ?? []).filter((r) => typeof r.rank === 'number' && r.rank > 0).length
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
  add('SDKs in the latest build', sdk(a), sdk(b), 'none', String)
  add('Versions on record', row(a)?.versionCount, row(b)?.versionCount, 'none', String)
  const metrics = candidates.slice(0, 5)
  if (metrics.length < 3) throw new NoDataError('Fewer than 3 measures have values for both apps.')
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
        'Rank is not downloads or users. Ratings round to one decimal.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(collect(1), ...metrics.map((m) => collect(...m.display))),
  }
}

export function mapBump(rankingsBody: unknown, historyBodies: unknown[], apps: RankingRow[], days: number) {
  const series = apps.map((app, i) => ({
    app: ref(app),
    daily: dailyRanks(unwrap<RankHistory>(historyBodies[i]), days),
  }))
  const withData = series.filter((s) => s.daily.ranks.filter((r) => r !== null).length >= 2)
  if (withData.length < 2) throw new NoDataError('Fewer than 2 apps have a rank history.')
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
    latest(historyBodies.map((b) => lastPointTime(unwrap<RankHistory>(b))?.toISOString())),
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
      title: `US Top Free rank over ${days} days: ${list(names)}`,
      subtitle: `Rank by day, US App Store, Top Free. The ${out.length} highest-ranked AI apps today.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        `${shortDay(dayList[0] ?? '')} to ${shortDay(last)}. Daily rank is the last recorded that day. A gap: no rank.`,
        'Rank is the store chart position, not downloads or users.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(time),
    numbers: merge(
      collect(days, out.length, shortDay(dayList[0] ?? ''), shortDay(last), ...dayList.map(shortDay)),
      ...out.map((s) => collect(...s.ranks)),
    ),
  }
}

export function mapIosAndroid(appleBody: unknown, googleBody: unknown, limit: number) {
  const apple = sortedRankings(appleBody)
  const google = sortedRankings(googleBody)
  const appleTime = requireTime(parseDataTime(metaOf(appleBody).recordedAt), 'App Store')
  const googleTime = requireTime(parseDataTime(metaOf(googleBody).recordedAt), 'Google Play')
  const androidRank = new Map<string, number>()
  for (const r of google) if (!androidRank.has(key(r.name))) androidRank.set(key(r.name), r.rank)
  const rows = apple
    .filter((r) => androidRank.has(key(r.name)))
    .slice(0, limit)
    .map((r) => ({ app: ref(r), left: r.rank, right: androidRank.get(key(r.name)) ?? 0 }))
  if (rows.length < 2) throw new NoDataError('Fewer than 2 apps are on both US Top Free charts.')
  const same = formatDataTime(appleTime) === formatDataTime(googleTime)
  return {
    model: { kind: 'dumbbell', left: 'App Store (iOS)', right: 'Google Play (Android)', rows } satisfies DumbbellModel,
    text: {
      title: 'US Top Free rank on iOS and Android',
      subtitle: `The ${rows.length} highest-ranked iOS apps that are also on the Google Play Top Free chart.`,
      footnote: [
        'Source: {source}. Data from {time}.',
        same
          ? 'Apps matched by name across the two stores. Google Play: all apps, Top Free.'
          : `Google Play data from ${formatDataTime(googleTime)}. Apps matched by name across the stores.`,
        'Rank is the store chart position, not downloads or users.',
      ] as [string, string, string],
    },
    dataTime: formatDataTime(appleTime),
    numbers: merge(collect(rows.length, formatDataTime(googleTime)), ...rows.map((r) => collect(r.left, r.right))),
  }
}

// Templates -------------------------------------------------------------------------------------------------------

const chartsSource = 'public App Store chart data'
const bothStores = 'public App Store and Google Play chart data'
const buildSource = 'public app build analysis data'

function finish(
  templateId: string,
  source: string,
  mapped: { model: Model; text: Omit<ChartText, 'source'>; dataTime: string; numbers: Set<string> },
  choices?: AppRef[],
): LiveChart {
  return { templateId, ...mapped, text: { ...mapped.text, source }, choices }
}

export const liveTemplates: LiveTemplate[] = [
  {
    id: 'us-number-one',
    about: 'Live · US App Store, Top Free',
    kind: 'headline',
    name: 'Which tracked app ranks highest on the US Top Free chart?',
    requests: 2,
    async load(client) {
      const rankings = await getRankings(client)
      const top = sortedRankings(rankings)[0]
      if (!top) throw new NoDataError('The US Top Free answer has no apps.')
      const history = await getHistory(client, top.appId, 30)
      return finish('us-number-one', chartsSource, mapNumberOne(rankings, history))
    },
  },
  {
    id: 'chatgpt-countries',
    about: 'Live · App Store, all countries',
    kind: 'headline',
    name: 'In how many countries is ChatGPT on the Top Free chart?',
    requests: 2,
    async load(client) {
      const rankings = await getRankings(client)
      const app = findApp(sortedRankings(rankings), /^chatgpt$/i)
      if (!app) throw new NoDataError('ChatGPT is not in the latest US Top Free data.')
      const detail = await client.get('app-rankings', { id: app.appId, store: 'apple', chart_type: 'top-free' })
      return finish('chatgpt-countries', chartsSource, mapCountries(rankings, detail, app))
    },
  },
  {
    id: 'us-climbers',
    about: 'Live · US App Store, latest update',
    kind: 'leaderboard',
    name: 'Who climbed most on the US Top Free chart since the last update?',
    requests: 2,
    rowChoices: [5, 10],
    async load(client, { rows = 10 }) {
      const [movers, rankings] = await Promise.all([
        client.get('movers', { country: 'us', chart: 'top-free', limit: 20 }),
        getRankings(client),
      ])
      return finish('us-climbers', chartsSource, mapMovers(movers, rankings, rows))
    },
  },
  {
    id: 'most-sdks',
    about: 'Live · Analyzed iOS and Android builds',
    kind: 'leaderboard',
    name: 'Which app builds ship the most SDKs?',
    requests: 3,
    rowChoices: [5, 10],
    async load(client, { rows = 10 }) {
      const [tech, apple, google] = await Promise.all([
        getTechStack(client),
        getRankings(client),
        getRankings(client, true),
      ])
      return finish('most-sdks', buildSource, mapMostSdks(tech, apple, google, rows))
    },
  },
  {
    id: 'chatgpt-vs-gemini',
    about: 'Live · US App Store and builds',
    kind: 'head-to-head',
    name: 'ChatGPT vs Gemini: rank, countries, rating, SDKs',
    requests: 5,
    pickApps: true,
    async load(client, { apps }) {
      const rankings = await getRankings(client)
      const rows = sortedRankings(rankings)
      const pick = (id: string | undefined, pattern: RegExp) =>
        (id ? rows.find((r) => r.appId === id) : undefined) ?? findApp(rows, pattern)
      const a = pick(apps?.[0], /^chatgpt$/i)
      const b = pick(apps?.[1], /^(google )?gemini$/i)
      if (!a || !b) throw new NoDataError('ChatGPT or Gemini is not in the latest US Top Free data.')
      if (a.appId === b.appId) throw new NoDataError('Pick two different apps.')
      const [compare, tech, ca, cb] = await Promise.all([
        client.get('compare', { apps: `${a.appId},${b.appId}`, store: 'apple', country: 'us', days: 30 }),
        getTechStack(client),
        client.get('app-rankings', { id: a.appId, store: 'apple', chart_type: 'top-free' }),
        client.get('app-rankings', { id: b.appId, store: 'apple', chart_type: 'top-free' }),
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
    requests: 5,
    async load(client) {
      const rankings = await getRankings(client)
      const apps = sortedRankings(rankings)
        .filter((r) => AI_APPS.test(plainName(r.name)))
        .slice(0, 4)
      if (apps.length < 2) throw new NoDataError('Fewer than 2 AI apps are in the latest US Top Free data.')
      const histories = await Promise.all(apps.map((app) => getHistory(client, app.appId, 30)))
      return finish('ai-rank-30-days', chartsSource, mapBump(rankings, histories, apps, 30))
    },
  },
  {
    id: 'ios-vs-android',
    about: 'Live · US App Store and Google Play',
    kind: 'dumbbell',
    name: 'Do the top US apps rank the same on iOS and Android?',
    requests: 2,
    rowChoices: [5, 8],
    async load(client, { rows = 8 }) {
      const [apple, google] = await Promise.all([getRankings(client), getRankings(client, true)])
      return finish('ios-vs-android', bothStores, mapIosAndroid(apple, google, rows))
    },
  },
]

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

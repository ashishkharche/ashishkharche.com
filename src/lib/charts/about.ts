/**
 * The "About the data" panel: what the source tracks and how it collects it, worked out from live answers only
 * (the tracked-apps list, a rankings answer and one rank history). Pure functions, unit tested with fixtures.
 */
import { realValue } from './live.ts'
import { iconAllowed, metaOf, parseDataTime, unwrap, type RankHistory, type RankingRow } from './tdn.ts'

export interface TrackedApp {
  appId: string
  store: 'apple' | 'google'
  name: string
  developer?: string
  iconUrl?: string
}

const text = (v: unknown) => (typeof v === 'string' && realValue(v) ? v.trim() : undefined)

/** The tracked apps in an /apps answer, by platform and name. Rows without an id, store or real name are left out. */
export function trackedApps(body: unknown): { apps: TrackedApp[]; ios: number; android: number; total: number } {
  const rows = unwrap<unknown>(body)
  const list = Array.isArray(rows) ? (rows as Array<Record<string, unknown>>) : []
  const apps: TrackedApp[] = []
  const seen = new Set<string>()
  for (const r of list) {
    const appId = text(r.appId) ?? text(r.id)
    const store = r.store === 'apple' || r.store === 'google' ? r.store : undefined
    const name = text(r.name) ?? text(r.appName)
    if (!appId || !store || !name || seen.has(`${store}:${appId}`)) continue
    seen.add(`${store}:${appId}`)
    const icon = typeof r.iconUrl === 'string' && iconAllowed(r.iconUrl) ? r.iconUrl : undefined
    apps.push({ appId, store, name, developer: text(r.developer), iconUrl: icon })
  }
  apps.sort((a, b) => a.store.localeCompare(b.store) || a.name.localeCompare(b.name))
  const ios = apps.filter((a) => a.store === 'apple').length
  const total = typeof metaOf(body).total === 'number' ? Number(metaOf(body).total) : apps.length
  return { apps, ios, android: apps.length - ios, total: Math.max(total, apps.length) }
}

/**
 * When the collector runs, read from one rank history: the times of day (UTC) its points fall on, and how many of
 * the runs in the window have a point. A missing run is a failed collection or a rank below the top 100.
 */
export function collectionRuns(historyBody: unknown): {
  times: string[]
  points: number
  expected: number
  days: number
  first: Date | null
  last: Date | null
} {
  const history = unwrap<RankHistory>(historyBody)
  const points = (history?.series ?? []).flatMap((s) => s.points).filter((p) => typeof p.rank === 'number')
  const dates = points.map((p) => parseDataTime(p.at)).filter((d): d is Date => d !== null)
  // Runs start a few minutes apart from day to day, so they are grouped by hour, each shown at its usual minute.
  const byHour = new Map<number, Map<string, number>>()
  for (const d of dates) {
    const hhmm = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
    const minutes = byHour.get(d.getUTCHours()) ?? new Map<string, number>()
    minutes.set(hhmm, (minutes.get(hhmm) ?? 0) + 1)
    byHour.set(d.getUTCHours(), minutes)
  }
  const total = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0)
  const most = Math.max(0, ...[...byHour.values()].map(total))
  // Hours seen at least a fifth as often as the most common one: the regular runs, not a one-off rerun.
  const times = [...byHour.entries()]
    .filter(([, m]) => total(m) >= Math.max(2, most / 5))
    .sort(([a], [b]) => a - b)
    .map(([, m]) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '')
  if (!dates.length) return { times, points: 0, expected: 0, days: 0, first: null, last: null }
  const first = new Date(Math.min(...dates.map(Number)))
  const last = new Date(Math.max(...dates.map(Number)))
  const dayOf = (d: Date) => Date.parse(d.toISOString().slice(0, 10))
  const days = Math.round((dayOf(last) - dayOf(first)) / 86_400_000) + 1
  // One run per hour slot: two points in the same hour are one run.
  const runs = new Set(dates.map((d) => d.toISOString().slice(0, 13)))
  return { times, points: runs.size, expected: days * Math.max(1, times.length), days, first, last }
}

/** The deepest rank in a rankings answer: the source keeps the top 100 only, so this is at most 100. */
export function deepestRank(body: unknown): number | null {
  const rows = unwrap<RankingRow[]>(body)
  const ranks = Array.isArray(rows) ? rows.map((r) => r.rank).filter((r) => Number.isFinite(r)) : []
  return ranks.length ? Math.max(...ranks) : null
}

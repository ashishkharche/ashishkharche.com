// Pure helpers for the chart builder page: the gallery groups, the data-age line and the kept-copy flag.
import type { Kind } from './live.ts'
import { dataFromLine, dataLineOf, londonTime, oldestFetch, STALE_AFTER_MS, type Fetched } from './tdn.ts'

/** The gallery's groups, in order, and the kinds in each. */
export const galleryGroups: Array<{ id: string; title: string; kinds: Array<Kind | 'scatter'> }> = [
  { id: 'headlines', title: 'Headlines', kinds: ['headline'] },
  { id: 'leaderboards', title: 'Leaderboards', kinds: ['leaderboard'] },
  { id: 'head-to-head', title: 'Head-to-head', kinds: ['head-to-head', 'dumbbell'] },
  { id: 'over-time', title: 'Over time', kinds: ['bump'] },
  { id: 'data-files', title: 'Data files, not live', kinds: ['scatter'] },
]

/**
 * A plain flag for answers that are not fresh, or empty when all are fresh. A kept copy (the proxy's, or the
 * snapshot shipped with the page) is named as one; any answer fetched more than two hours ago says how old it is.
 */
export function keptCopyNote(
  fetched: Iterable<{ fetchedAt: Date | null; stale: boolean; kept: boolean }>,
  now = Date.now(),
) {
  const old = [...fetched].filter((f) => f.stale)
  if (!old.length) return ''
  const times = old.map((f) => f.fetchedAt?.getTime() ?? 0).filter((t) => t > 0)
  const first = times.length ? Math.min(...times) : 0
  const at = first ? londonTime(new Date(first)) : ''
  const hours = first ? Math.floor((now - first) / 3_600_000) : 0
  const age = first && now - first > STALE_AFTER_MS ? ` It is ${hours} hours old.` : ''
  if (old.some((f) => f.kept))
    return at ? `Kept copy. Live data did not load, so the copy fetched at ${at} is shown.${age}` : 'Kept copy.'
  return at ? `Live data last fetched at ${at}.${age}` : ''
}

/**
 * "Data from 13:33 GMT": when the proxy fetched the chart's oldest answer (x-tdn-fetched-at), in London time. Falls
 * back to the data time in the answers when no fetch time came.
 */
export function fetchedLine(answers: Fetched[], dataTime: string, now = new Date()): string {
  const at = oldestFetch(answers)
  return at ? dataFromLine(at, now) : dataLineOf(dataTime, now)
}

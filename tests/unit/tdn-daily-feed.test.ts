import { describe, expect, it } from 'vitest'
import { readDailyFeed, readFeedMetrics } from '~/lib/charts/tdn'
import daily from '../../reports/tdn-v20/daily-feed-2026-11-05.json'
import metrics from '../../reports/tdn-v20/daily-feed-metrics-apple-2026-11-05.json'

describe('readDailyFeed', () => {
  it('reads the live 5 Nov 2026 published feed', () => {
    const feed = readDailyFeed(daily)
    expect(feed?.date).toBe('2026-11-05')
    expect(feed?.status).toBe('published')
    expect(feed?.scope).toBe('Among the apps TechDevNotes tracks')
    expect(feed?.items.map((i) => i.kind)).toEqual([
      'rank_movers',
      'rank_movers',
      'top10_entries',
      'top10_entries',
      'new_versions',
      'build_changes',
      'rating_changes',
    ])
    expect(feed?.items.some((i) => i.kind === 'top10_returns')).toBe(false)
    const apple = feed?.items.find((i) => i.id === 'top10_entries:apple:us:top-free')
    expect(apple?.answer).toContain('TikTok Pro - Events')
    expect(apple?.table.rows[0]?.cells.rankNow).toBe(1)
    expect(apple?.table.columns.some((c) => c.format === 'yes_no')).toBe(true)
  })

  it('handles empty and odd shapes', () => {
    expect(readDailyFeed(null)).toBeUndefined()
    expect(readDailyFeed({})).toBeUndefined()
    expect(
      readDailyFeed({
        data: {
          schema: 'tdn.daily-feed.v1',
          date: '2026-11-05',
          status: 'published',
          scope: 'Among the apps TechDevNotes tracks',
          freshness: 'data from the 00:00 UTC run, 5 Nov 2026',
          items: [null, { kind: 'x' }, { schema: 'tdn.stat-answer.v1', id: 'a', kind: 'k', title: 'T', answer: 'A.', table: { columns: [], rows: [], total: 0 } }],
        },
      })?.items,
    ).toHaveLength(1)
  })
})

describe('readFeedMetrics', () => {
  it('reads the live empty/skipped metrics answer', () => {
    const m = readFeedMetrics(metrics)
    expect(m?.items).toEqual([])
    expect(m?.skipped).toHaveLength(4)
    expect(m?.skipped.every((s) => s.reason.includes('no store facts'))).toBe(true)
    expect(m?.filters.store).toBe('apple')
  })

  it('handles null filters and missing skipped', () => {
    const m = readFeedMetrics({
      data: {
        schema: 'tdn.feed-metrics.v1',
        date: '2026-11-05',
        slot: '2026-11-05 00:00:00',
        scope: 'Among the apps TechDevNotes tracks',
        freshness: 'data from the 00:00 UTC run, 5 Nov 2026',
        filters: { store: null, genre: null, kind: null },
        genres: { apple: [], google: [] },
        items: [],
      },
    })
    expect(m?.filters).toEqual({ store: null, genre: null, kind: null })
    expect(m?.skipped).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import {
  FEED_SCOPE,
  NO_DATA_SENTENCE,
  formatBytesMb,
  formatUtcDate,
  mapChartReleaseDates,
  mapSizePercentiles,
  mapTop10Returns,
} from '~/lib/charts/feed'
import { liveFootnote, liveTemplates, validateLive, type LiveChart } from '~/lib/charts/live'
import { createTdnClient } from '~/lib/charts/tdn'
import { fixtureFetch } from '../fixtures/tdn/index.ts'

/** Fixture-only envelopes: never ship these numbers on the page. */
function metricsEnvelope(items: unknown[], skipped: unknown[] = [], kind: string | null = 'size_percentiles') {
  return {
    data: {
      schema: 'tdn.feed-metrics.v1',
      date: '2026-11-06',
      slot: '2026-11-06 00:00:00',
      scope: FEED_SCOPE,
      freshness: 'data from the 00:00 UTC run, 6 Nov 2026',
      filters: { store: 'apple', genre: null, kind },
      genres: { apple: [], google: [] },
      items,
      skipped,
    },
    meta: { date: '2026-11-06', schema: 'tdn.feed-metrics.v1', count: items.length, skipped: skipped.length },
  }
}

function sizeItem(rows: Array<Record<string, unknown>>) {
  return {
    schema: 'tdn.stat-answer.v1',
    id: 'size_percentiles:apple:us',
    kind: 'size_percentiles',
    title: 'App Store download size percentiles',
    answer: 'Among the tracked apps, the largest App Store download is 240.0 MB (Extra 18).',
    table: {
      columns: [
        { key: 'mark', label: 'Mark', format: 'text' },
        { key: 'size', label: 'Size', format: 'bytes' },
        { key: 'app', label: 'App', format: 'text' },
        { key: 'version', label: 'Version', format: 'version' },
      ],
      rows: rows.map((cells, i) => ({ position: i + 1, tied: false, href: `/apps/ios/x/${i}`, cells, sources: [] })),
      total: rows.length,
    },
  }
}

function releaseItem(rows: Array<Record<string, unknown>>) {
  return {
    schema: 'tdn.stat-answer.v1',
    id: 'chart_release_dates:apple:us:top-free',
    kind: 'chart_release_dates',
    title: 'Newest tracked apps',
    answer:
      'Among the tracked apps, Echo Photos is the newest on the US App Store top free chart, released on 1 Oct 2026.',
    table: {
      columns: [
        { key: 'app', label: 'App', format: 'text' },
        { key: 'released', label: 'Released', format: 'date' },
        { key: 'rankNow', label: 'Rank now', format: 'rank' },
      ],
      rows: rows.map((cells, i) => ({ position: i + 1, tied: false, href: `/apps/ios/x/${i}`, cells, sources: [] })),
      total: rows.length,
    },
  }
}

function feedEnvelope(items: unknown[], status = 'published') {
  return {
    data: {
      schema: 'tdn.daily-feed.v1',
      date: '2026-11-06',
      status,
      generatedAt: '2026-11-06 03:10:00',
      scope: FEED_SCOPE,
      freshness: 'data from the 00:00 UTC run, 6 Nov 2026',
      items,
    },
    meta: { date: '2026-11-06', status, schema: 'tdn.daily-feed.v1', count: items.length },
  }
}

function returnsItem(rows: Array<Record<string, unknown>>, answer?: string) {
  return {
    schema: 'tdn.stat-answer.v1',
    id: 'top10_returns:apple:us:top-free',
    kind: 'top10_returns',
    title: 'Back in the top 10',
    answer:
      answer ??
      'Among the tracked apps, Delta Chat is back in the US App Store top ten at #7, last there on 1 Nov 2026.',
    table: {
      columns: [
        { key: 'app', label: 'App', format: 'text' },
        { key: 'rankNow', label: 'Rank now', format: 'rank' },
        { key: 'lastTop10', label: 'Last in top 10', format: 'date' },
        { key: 'rankThen', label: 'Rank then', format: 'rank' },
      ],
      rows: rows.map((cells, i) => ({ position: i + 1, tied: false, href: `/apps/ios/x/${i}`, cells, sources: [] })),
      total: rows.length,
    },
  }
}

function asChart(templateId: string, mapped: ReturnType<typeof mapSizePercentiles>): LiveChart {
  return {
    templateId,
    model: mapped.model as LiveChart['model'],
    text: { ...mapped.text, source: mapped.source },
    dataTime: mapped.dataTime,
    numbers: mapped.numbers,
    coverage: mapped.coverage,
  }
}

describe('format helpers', () => {
  it('formats bytes in decimal MB like TDN', () => {
    expect(formatBytesMb(240_000_000)).toBe('240.0 MB')
    expect(formatBytesMb(240_123_904)).toBe('240.1 MB')
    expect(formatBytesMb(268_435_456)).toBe('268.4 MB')
  })

  it('formats slot and ISO dates as UTC calendar days without shifting', () => {
    // A London evening must not move the UTC calendar day backwards.
    expect(formatUtcDate('2026-11-01 00:00:00')).toBe('1 Nov 2026')
    expect(formatUtcDate('2026-10-01')).toBe('1 Oct 2026')
    // Odd but valid UTC midnight after a day boundary in US time zones
    expect(formatUtcDate('2026-01-01 00:00:00')).toBe('1 Jan 2026')
    expect(formatUtcDate('not-a-date')).toBeNull()
  })
})

describe('size_percentiles', () => {
  it('maps the TDN sample shape (fixture numbers only)', () => {
    const mapped = mapSizePercentiles(
      metricsEnvelope([
        sizeItem([
          { mark: 'Largest', size: 240_000_000, app: 'Extra 18', version: '1.0' },
          { mark: 'Median', size: 80_000_000, app: 'Median App', version: '3.0' },
        ]),
      ]),
    )
    expect(mapped.empty).toBe(false)
    expect(mapped.model.kind).toBe('headline')
    if (mapped.model.kind !== 'headline') throw new Error('kind')
    expect(mapped.model.answer).toBe('240.0')
    expect(mapped.model.unit).toBe('MB')
    expect(mapped.model.sentence).toContain('240.0 MB')
    expect(mapped.model.sentence).toContain('Extra 18')
    expect(mapped.model.sentence).toContain(FEED_SCOPE)
    expect(validateLive(asChart('feed-size-percentiles', mapped))).toEqual([])
  })

  it('empty items and skipped reasons become No data for this day yet', () => {
    const empty = mapSizePercentiles(metricsEnvelope([]))
    expect(empty.empty).toBe(true)
    expect(empty.model.kind).toBe('headline')
    if (empty.model.kind !== 'headline') throw new Error('kind')
    expect(empty.model.sentence).toBe(NO_DATA_SENTENCE)
    expect(empty.model.answer).toBe('None')

    const skipped = mapSizePercentiles(
      metricsEnvelope(
        [],
        [{ kind: 'size_percentiles', store: 'apple', reason: '19 of 19 apps have no store facts' }],
        'size_percentiles',
      ),
    )
    expect(skipped.empty).toBe(true)
    expect(skipped.coverage).toContain('Skipped:')
    expect(validateLive(asChart('feed-size-percentiles', skipped))).toEqual([])
  })

  it('one row, long names, null cells', () => {
    const one = mapSizePercentiles(
      metricsEnvelope([sizeItem([{ mark: 'Largest', size: 10_000_000, app: 'A'.repeat(80), version: '1.0.0-beta' }])]),
    )
    expect(one.empty).toBe(false)
    if (one.model.kind !== 'headline') throw new Error('kind')
    expect(one.model.sentence).toContain('A'.repeat(80))

    const nulls = mapSizePercentiles(
      metricsEnvelope([
        sizeItem([
          { mark: 'Largest', size: null, app: 'X', version: '1' },
          { mark: null, size: 1_000_000, app: 'Y', version: '1' },
        ]),
      ]),
    )
    expect(nulls.empty).toBe(true)
  })
})

describe('chart_release_dates', () => {
  it('maps the TDN sample and keeps UTC dates', () => {
    const mapped = mapChartReleaseDates(
      metricsEnvelope(
        [
          releaseItem([
            { app: 'Echo Photos', released: '2026-10-01', rankNow: 9 },
            { app: 'Old Notes', released: '2025-01-15', rankNow: 3 },
          ]),
        ],
        [],
        'chart_release_dates',
      ),
    )
    expect(mapped.empty).toBe(false)
    expect(mapped.model.kind).toBe('leaderboard')
    if (mapped.model.kind !== 'leaderboard') throw new Error('kind')
    expect(mapped.model.rows[0]?.app.name).toBe('Echo Photos')
    expect(mapped.model.rows[0]?.display).toBe('1 Oct 2026')
    expect(mapped.text.subtitle).toContain('1 Oct 2026')
    expect(validateLive(asChart('feed-release-dates', mapped))).toEqual([])
  })

  it('empty and skipped', () => {
    const skipped = mapChartReleaseDates(
      metricsEnvelope(
        [],
        [
          {
            kind: 'chart_release_dates',
            store: 'apple',
            reason: '149 of 149 apps have no store facts stored for the run',
          },
        ],
        'chart_release_dates',
      ),
    )
    expect(skipped.empty).toBe(true)
    if (skipped.model.kind !== 'headline') throw new Error('kind')
    expect(skipped.model.sentence).toBe(NO_DATA_SENTENCE)
  })

  it('odd dates and null ranks are dropped', () => {
    const mapped = mapChartReleaseDates(
      metricsEnvelope(
        [
          releaseItem([
            { app: 'Bad', released: 'not-a-date', rankNow: 1 },
            { app: 'NullRank', released: '2026-10-01', rankNow: null },
            { app: 'Ok', released: '2026-09-01', rankNow: 2 },
          ]),
        ],
        [],
        'chart_release_dates',
      ),
    )
    expect(mapped.empty).toBe(false)
    if (mapped.model.kind !== 'leaderboard') throw new Error('kind')
    expect(mapped.model.rows).toHaveLength(1)
    expect(mapped.model.rows[0]?.app.name).toBe('Ok')
  })
})

describe('top10_returns', () => {
  it('maps the TDN sample; lastTop10 slot stays on the UTC day', () => {
    const mapped = mapTop10Returns(
      feedEnvelope([returnsItem([{ app: 'Delta Chat', rankNow: 7, lastTop10: '2026-11-01 00:00:00', rankThen: 4 }])]),
    )
    expect(mapped.empty).toBe(false)
    expect(mapped.model.kind).toBe('leaderboard')
    if (mapped.model.kind !== 'leaderboard') throw new Error('kind')
    expect(mapped.model.rows[0]?.display).toBe('#7')
    expect(mapped.model.rows[0]?.detail).toContain('1 Nov 2026')
    expect(mapped.text.subtitle).toContain('Delta Chat')
    expect(validateLive(asChart('feed-top10-returns', mapped))).toEqual([])
  })

  it('absent item (often empty) and skipped feed are empty states, not broken charts', () => {
    const absent = mapTop10Returns(feedEnvelope([]))
    expect(absent.empty).toBe(true)
    if (absent.model.kind !== 'headline') throw new Error('kind')
    expect(absent.model.sentence).toBe(NO_DATA_SENTENCE)
    expect(absent.coverage).toMatch(/left out when empty|No top10_returns/)

    const skipped = mapTop10Returns(feedEnvelope([], 'skipped'))
    expect(skipped.empty).toBe(true)
    expect(validateLive(asChart('feed-top10-returns', skipped))).toEqual([])
  })

  it('one row, long names, nulls', () => {
    const long = mapTop10Returns(
      feedEnvelope([
        returnsItem([
          {
            app: 'Very Long Returning App Name That Goes On And On',
            rankNow: 1,
            lastTop10: '2026-05-03 00:00:00',
            rankThen: 10,
          },
        ]),
      ]),
    )
    expect(long.empty).toBe(false)

    const nulls = mapTop10Returns(
      feedEnvelope([
        returnsItem([
          { app: 'X', rankNow: null, lastTop10: '2026-11-01 00:00:00', rankThen: 1 },
          { app: 'Y', rankNow: 2, lastTop10: null, rankThen: 1 },
        ]),
      ]),
    )
    expect(nulls.empty).toBe(true)
  })
})

describe('live templates load from fixtures', () => {
  const ids = ['feed-size-percentiles', 'feed-release-dates', 'feed-top10-returns'] as const

  it('registers the three new templates', () => {
    for (const id of ids) expect(liveTemplates.some((t) => t.id === id)).toBe(true)
  })

  it.each(ids)('%s loads, validates, and keeps the scope line', async (id) => {
    const template = liveTemplates.find((t) => t.id === id)
    if (!template) throw new Error(id)
    const chart = await template.load(createTdnClient(fixtureFetch()), {})
    expect(chart.templateId).toBe(id)
    expect(validateLive(chart)).toEqual([])
    expect(liveFootnote(chart).join(' ')).toContain(FEED_SCOPE)
    expect(chart.coverage).toMatch(/\d|Skipped|No /)
  })
})

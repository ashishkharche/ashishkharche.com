import { describe, expect, it } from 'vitest'
import {
  FEED_SCOPE,
  NO_DATA_SENTENCE,
  daysBetweenUtc,
  formatBytesMb,
  formatMbNumber,
  formatUtcDate,
  mapChartReleaseDates,
  mapSizePercentiles,
  mapTop10Returns,
} from '~/lib/charts/feed'
import { drawLive, leaderboardDisplayWidth } from '~/lib/charts/kinds'
import { liveFootnote, liveTemplates, validateLive, type LiveChart } from '~/lib/charts/live'
import type { Ctx } from '~/lib/charts/render'
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

function releaseItem(rows: Array<Record<string, unknown>>, total?: number) {
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
      total: total ?? rows.length,
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

  it('formats MB numbers to 1 decimal for bar labels', () => {
    expect(formatMbNumber(1_088_421_888)).toBe('1088.4')
    expect(formatMbNumber(559_939_584)).toBe('559.9')
    expect(formatMbNumber(240_000_000)).toBe('240.0')
  })

  it('counts whole UTC days between calendar days', () => {
    expect(daysBetweenUtc('2026-09-08', '2026-11-06')).toBe(59)
    expect(daysBetweenUtc('2026-08-11', '2026-11-06')).toBe(87)
    expect(daysBetweenUtc('not-a-day', '2026-11-06')).toBeNull()
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
    expect(mapped.model.support?.type).toBe('bars')
    if (mapped.model.support?.type === 'bars') {
      expect(mapped.model.support.bars.map((b) => b.display)).toEqual(['240.0', '80.0'])
      expect(mapped.model.support.bars.every((b) => !String(b.display).includes('240.000'))).toBe(true)
    }
    expect(validateLive(asChart('feed-size-percentiles', mapped))).toEqual([])
  })

  it('keeps full API app names (no truncation)', () => {
    const mapped = mapSizePercentiles(
      metricsEnvelope([
        sizeItem([
          { mark: 'Largest', size: 1_088_421_888, app: 'Tesla', version: '4.47.5' },
          { mark: '75th percentile', size: 438_304_768, app: 'Uber - Rides, Eats, Hotels', version: '3.746.10001' },
          { mark: '25th percentile', size: 169_869_312, app: 'WayShot:Aesthetic Photo Editor', version: '2.14.0' },
        ]),
      ]),
    )
    if (mapped.model.kind !== 'headline') throw new Error('kind')
    expect(mapped.model.sentence).toContain('Tesla')
    expect([...mapped.numbers].join(' ')).not.toContain('1088.421888')
    // Marks are labels; full names stay on the sentence/app when that row is Largest.
    expect(mapped.numbers.has('1088.4')).toBe(true)
    // Re-read apps from a dedicated pass: sentence + collected app tokens keep the full strings.
    const again = mapSizePercentiles(
      metricsEnvelope([
        sizeItem([{ mark: 'Largest', size: 10_000_000, app: 'Uber - Rides, Eats, Hotels', version: '1' }]),
      ]),
    )
    if (again.model.kind !== 'headline') throw new Error('kind')
    expect(again.model.sentence).toContain('Uber - Rides, Eats, Hotels')
    expect(again.model.app.name).toBe('Uber - Rides, Eats, Hotels')
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
          releaseItem(
            [
              { app: 'Echo Photos', released: '2026-10-01', rankNow: 9 },
              { app: 'Old Notes', released: '2025-01-15', rankNow: 3 },
            ],
            64,
          ),
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
    // Bars encode days since release (metrics.date), never chart rank.
    expect(mapped.model.rows[0]?.value).toBe(daysBetweenUtc('2026-10-01', '2026-11-06'))
    expect(mapped.model.rows[0]?.value).not.toBe(9)
    expect(mapped.model.rows[1]?.value).toBe(daysBetweenUtc('2025-01-15', '2026-11-06'))
    expect(mapped.model.barLabel).toBe('Days since release')
    expect(mapped.text.subtitle).toContain('1 Oct 2026')
    expect(mapped.text.subtitle).toMatch(/Newest 2 of 64/)
    expect(mapped.coverage).toMatch(/Newest 2 of 64/)
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
    expect(absent.coverage).toMatch(/No top10_returns|left out when empty|omits the kind when empty/)

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

describe('edge cases from live 2026-11-06 shapes', () => {
  it('published feed without top10_returns stays empty (real day shape)', () => {
    const mapped = mapTop10Returns(
      feedEnvelope(
        [
          {
            schema: 'tdn.stat-answer.v1',
            id: 'rank_movers:apple:us:top-free',
            kind: 'rank_movers',
            title: 'Biggest moves',
            answer: 'X moved.',
            table: { columns: [], rows: [], total: 0 },
          },
        ],
        'published',
      ),
    )
    expect(mapped.empty).toBe(true)
    if (mapped.model.kind !== 'headline') throw new Error('kind')
    expect(mapped.model.sentence).toBe(NO_DATA_SENTENCE)
    expect(mapped.model.answer).toBe('None')
    expect(mapped.coverage).toMatch(/omits the kind when empty|No top10_returns/)
    expect(validateLive(asChart('feed-top10-returns', mapped))).toEqual([])
  })

  it('release-date coverage names an API page when total exceeds rows', () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({
      app: `App ${i}`,
      released: `2026-0${(i % 9) + 1}-01`,
      rankNow: i + 1,
    }))
    // Force total > rows.length via a hand-built envelope
    const body = metricsEnvelope(
      [
        {
          ...releaseItem(rows),
          table: {
            columns: [
              { key: 'app', label: 'App', format: 'text' },
              { key: 'released', label: 'Released', format: 'date' },
              { key: 'rankNow', label: 'Rank now', format: 'rank' },
            ],
            rows: rows.map((cells, i) => ({
              position: i + 1,
              tied: false,
              href: `/apps/ios/x/${i}`,
              cells,
              sources: [],
            })),
            total: 64,
          },
        },
      ],
      [],
      'chart_release_dates',
    )
    const mapped = mapChartReleaseDates(body)
    expect(mapped.empty).toBe(false)
    expect(mapped.coverage).toMatch(/10 of 64/)
    expect(mapped.coverage).toMatch(/API page/)
  })

  it('size rows missing mark or size are dropped; all-bad becomes empty', () => {
    const mapped = mapSizePercentiles(
      metricsEnvelope([
        sizeItem([
          { mark: 'Largest', size: -1, app: 'Neg', version: '1' },
          { mark: '', size: 1_000_000, app: 'Blank', version: '1' },
          { mark: 'Median', size: undefined, app: 'NoSize', version: '1' },
        ]),
      ]),
    )
    expect(mapped.empty).toBe(true)
  })

  it('readers tolerate column origin metadata on live size cells', () => {
    const body = metricsEnvelope([
      {
        ...sizeItem([{ mark: 'Largest', size: 1088421888, app: 'Tesla', version: '4.62.3' }]),
        table: {
          columns: [
            { key: 'mark', label: 'Percentile', format: 'text', align: 'left', origin: { kind: 'label' } },
            {
              key: 'size',
              label: 'Size',
              format: 'bytes',
              align: 'right',
              origin: { kind: 'source', role: 'current', field: 'size_bytes' },
            },
            {
              key: 'app',
              label: 'App',
              format: 'text',
              align: 'left',
              origin: { kind: 'source', role: 'app', field: 'name' },
            },
            {
              key: 'version',
              label: 'Version',
              format: 'version',
              align: 'left',
              origin: { kind: 'source', role: 'current', field: 'version' },
            },
          ],
          rows: [
            {
              position: 1,
              tied: false,
              href: '/apps/ios/tesla/1',
              cells: { mark: 'Largest', size: 1088421888, app: 'Tesla', version: '4.62.3' },
              sources: [],
            },
          ],
          total: 6,
        },
      },
    ])
    const mapped = mapSizePercentiles(body)
    expect(mapped.empty).toBe(false)
    if (mapped.model.kind !== 'headline') throw new Error('kind')
    expect(mapped.model.sentence).toContain('1088.4 MB')
    expect(mapped.model.sentence).toContain('Tesla')
  })
})

function fakeDrawCtx(): Ctx & { texts: string[]; lineEnds: number[] } {
  const texts: string[] = []
  const lineEnds: number[] = []
  let font = '10px x'
  let pathX = 0
  const target = {
    texts,
    lineEnds,
    get font() {
      return font
    },
    set font(value: string) {
      font = value
    },
    measureText(text: string) {
      const size = Number(/(\d+(\.\d+)?)px/.exec(font)?.[1] ?? 10)
      return {
        width: text.length * size * 0.55,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * size * 0.55,
        actualBoundingBoxAscent: size * 0.7,
        actualBoundingBoxDescent: size * 0.2,
      }
    },
    fillText(text: string) {
      texts.push(text)
    },
    moveTo(x: number) {
      pathX = x
    },
    lineTo(x: number) {
      lineEnds.push(Math.max(pathX, x))
      pathX = x
    },
  }
  return new Proxy(target, {
    get(t, key) {
      if (key in t) return Reflect.get(t, key)
      return () => undefined
    },
    set(_t, key, value) {
      if (key === 'font') font = value as string
      return true
    },
  }) as unknown as Ctx & { texts: string[]; lineEnds: number[] }
}

describe('feed chart drawing', () => {
  it('size bar labels are 1-decimal MB, never raw floats', () => {
    const mapped = mapSizePercentiles(
      metricsEnvelope([
        sizeItem([
          { mark: 'Largest', size: 1_088_421_888, app: 'Tesla', version: '4.47.5' },
          { mark: 'Median', size: 559_939_584, app: 'Other', version: '1' },
        ]),
      ]),
    )
    const chart = asChart('feed-size-percentiles', mapped)
    const ctx = fakeDrawCtx()
    drawLive(ctx, chart, chart.text, { width: 1800, height: 1390 })
    expect(ctx.texts).toContain('1088.4')
    expect(ctx.texts).toContain('559.9')
    expect(ctx.texts.some((x) => x.includes('1088.421888'))).toBe(false)
    expect(ctx.texts.some((x) => x.includes('559.939584'))).toBe(false)
  })

  it('leaderboard display width leaves a gap so bars cannot cover the date', () => {
    const measure = (text: string) => text.length * 8
    const displays = ['11 Aug 2026', '8 Sep 2026', '3 Jun 2026']
    const valueW = leaderboardDisplayWidth(displays, measure, 120, 16)
    expect(valueW).toBeGreaterThanOrEqual(measure('11 Aug 2026') + 16)
    // Synthetic chart: long date labels + large bar values must still keep bar ends left of the display column.
    const mapped = mapChartReleaseDates(
      metricsEnvelope(
        [
          releaseItem(
            [
              { app: 'Muse from Meta', released: '2026-09-08', rankNow: 1 },
              { app: 'Grok Bot', released: '2026-08-11', rankNow: 81 },
            ],
            64,
          ),
        ],
        [],
        'chart_release_dates',
      ),
    )
    const chart = asChart('feed-release-dates', mapped)
    const ctx = fakeDrawCtx()
    drawLive(ctx, chart, chart.text, { width: 1800, height: 1390 })
    expect(ctx.texts).toContain('Days since release')
    expect(ctx.texts).toContain('11 Aug 2026')
    expect(ctx.texts.some((x) => /Newest 2 of 64/.test(x))).toBe(true)
    // Every stroked bar end must sit left of the right padding reserved for the widest date.
    const nameSizeApprox = 28
    const reserved = leaderboardDisplayWidth(
      mapped.model.kind === 'leaderboard' ? mapped.model.rows.map((r) => r.display) : [],
      (text) => text.length * nameSizeApprox * 0.55,
      120,
      16,
    )
    const boxRight = 1800 - 64 // layout pad roughly; bars must end before display column
    for (const end of ctx.lineEnds) {
      expect(end).toBeLessThan(boxRight)
    }
    // Rank must not be the bar value: Grok Bot rank 81 would dominate length; days-since does not equal 81.
    if (mapped.model.kind === 'leaderboard') {
      expect(mapped.model.rows.find((r) => r.app.name === 'Grok Bot')?.value).not.toBe(81)
    }
    expect(reserved).toBeGreaterThan(120)
  })
})

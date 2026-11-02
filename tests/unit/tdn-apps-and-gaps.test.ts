// Two things the data source (TDN) reported on 2 Nov 2026. The /apps answer is { apps, count, total, nextCursor }
// with no data or meta wrapper, so the tracked-apps facts read 0 apps on the live site. And rank history has
// missing and partial collection slots: an outage with no points from 8 Oct 00:00 to 16 Oct 12:00 (18 slots),
// Apple 12:00 slots missing on 28, 29 and 31 Oct, and slots with points for some countries only.
import { describe, expect, it } from 'vitest'
import liveApps from '../fixtures/tdn/live-apps-2026-11-02.json' with { type: 'json' }
import { fixtureFetch, fixtures } from '../fixtures/tdn/index'
import { trackedApps } from '~/lib/charts/about'
import { drawLive, trace } from '~/lib/charts/kinds'
import { dailyRanks, liveTemplates, loadWithFallback, mapNumberOne, validateLive } from '~/lib/charts/live'
import type { Ctx } from '~/lib/charts/render'
import { createTdnClient, readApps, readRankHistory } from '~/lib/charts/tdn'

describe('the /apps answer, in its real shape', () => {
  it('the live answer has a top-level apps list and total, with no data or meta wrapper', () => {
    expect(Object.keys(liveApps).sort()).toEqual(['apps', 'count', 'nextCursor', 'total'])
    expect(Object.keys(liveApps.apps[0] ?? {}).sort()).toEqual(
      ['active', 'category', 'developer', 'iconUrl', 'id', 'name', 'store'].sort(),
    )
  })

  it('reads every row of the live answer, by id', () => {
    const { rows, total } = readApps(liveApps)
    expect(total).toBe(151)
    expect(rows).toHaveLength(151)
    expect(rows[0]).toMatchObject({ id: '1001501844', store: 'apple', name: 'Deliveroo: Food & Shopping' })
    expect(rows[0]?.category).toBe('Food & Drink')
    expect(rows.every((r) => r.active === true)).toBe(true)
  })

  it('gives the real tracked-apps count: 151 apps, 92 iOS and 59 Android', () => {
    const t = trackedApps(liveApps)
    expect(t).toMatchObject({ total: 151, ios: 92, android: 59 })
    expect(t.apps).toHaveLength(151)
    expect(t.apps.filter((a) => a.iconUrl).length).toBeGreaterThan(140)
  })

  it('the page fixture has the real shape too', () => {
    const body = fixtures['apps?limit=500'] as Record<string, unknown>
    expect(body).not.toHaveProperty('data')
    expect(trackedApps(body)).toMatchObject({ total: 35, ios: 20, android: 15 })
  })

  it('takes the total from the top level when the list is paged', () => {
    const t = trackedApps({ apps: [{ id: '1', store: 'google', name: 'A' }], count: 1, total: 151, nextCursor: 'x' })
    expect(t.total).toBe(151)
    expect(t.apps).toHaveLength(1)
  })

  it('still reads a data[] list with meta.total, and appId or appName in place of id and name', () => {
    const { rows, total } = readApps({
      data: [
        { appId: '7', store: 'apple', appName: 'Seven' },
        { id: 8, store: 'google', name: 'Eight' },
      ],
      meta: { total: 9 },
    })
    expect(total).toBe(9)
    expect(rows.map((r) => [r.id, r.store, r.name])).toEqual([
      ['7', 'apple', 'Seven'],
      ['8', 'google', 'Eight'],
    ])
  })

  it('leaves out rows with no id, store or name, and reads nothing from an empty or odd answer', () => {
    expect(
      readApps({ apps: [{ store: 'apple', name: 'A' }, { id: '2', store: 'amazon', name: 'B' }, { id: '3' }, null] })
        .rows,
    ).toEqual([])
    for (const body of [null, undefined, {}, [], 'x', { apps: 'x' }, { apps: [] }]) {
      expect(trackedApps(body)).toMatchObject({ total: 0, ios: 0, android: 0, apps: [] })
    }
  })
})

// Rank history ----------------------------------------------------------------------------------------------------

const DAY = 86_400_000
const at = (ms: number) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19)
/** Two runs a day (00:15 and 12:15 UTC) from 3 Oct to 2 Nov, for the given countries, with slots left out. */
function history(countries: string[], skip: (t: number, country: string) => boolean) {
  const start = Date.parse('2026-10-03T00:15:00Z')
  const end = Date.parse('2026-11-02T00:15:00Z')
  return {
    data: {
      appId: '6448311069',
      store: 'apple',
      chart: 'top-free',
      series: countries.map((country, c) => {
        const points = []
        for (let t = start; t <= end; t += DAY / 2) if (!skip(t, country)) points.push({ at: at(t), rank: 2 + c })
        return { country, points }
      }),
    },
  }
}
const outage = (t: number) => t >= Date.parse('2026-10-08T00:00:00Z') && t <= Date.parse('2026-10-16T12:59:00Z')
const rankings = {
  data: [{ rank: 2, appId: '6448311069', store: 'apple', name: 'ChatGPT', developer: 'OpenAI OpCo, LLC' }],
  meta: { recordedAt: '2026-11-02 00:15:00', total: 1 },
}

function dashCtx() {
  const lines: Array<{ dash: number[]; x0: number; x1: number }> = []
  let dash: number[] = []
  let x0 = 0
  const target = {
    lines,
    setLineDash: (d: number[]) => (dash = d),
    moveTo: (x: number) => (x0 = x),
    lineTo: (x: number) => lines.push({ dash, x0, x1: x }),
    measureText: (t: string) => ({
      width: t.length * 5,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: t.length * 5,
      actualBoundingBoxAscent: 7,
      actualBoundingBoxDescent: 2,
    }),
    createLinearGradient: () => ({ addColorStop() {} }),
  }
  return new Proxy(target, {
    get: (t, k) => (k in t ? Reflect.get(t, k) : () => undefined),
    set: () => true,
  }) as unknown as Ctx & { lines: typeof lines }
}

describe('rank history with missing and partial slots', () => {
  it('a 9-day outage is a gap of 9 days with no values, not a made-up rank', () => {
    const h = readRankHistory(history(['us'], outage))
    const { days, ranks } = dailyRanks(h, 30, 'us')
    const gap = days.map((d, i) => [d, ranks[i]] as const).filter(([, r]) => r === null)
    expect(gap.map(([d]) => d)).toEqual(
      Array.from({ length: 9 }, (_, i) => `2026-10-${String(8 + i).padStart(2, '0')}`),
    )
    expect(ranks.filter((r) => r !== null).every((r) => r === 2)).toBe(true)
  })

  it('draws across the outage with one dashed bridge and no error', async () => {
    const body = history(['us'], outage)
    const client = createTdnClient(
      fixtureFetch({
        'rankings?chart=top-free&country=us&limit=200&store=apple': { status: 200, body: rankings },
        'rank-history?chart=top-free&countries=us&days=30&id=6448311069&store=apple': { status: 200, body },
      }),
    )
    const template = liveTemplates.find((t) => t.id === 'us-number-one')
    if (!template) throw new Error('us-number-one')
    const { chart, note } = await loadWithFallback(template, client)
    expect(note).toBe('')
    expect(validateLive(chart)).toEqual([])
    expect(() => drawLive(dashCtx(), chart, chart.text, { width: 1800, height: 1390, icons: new Map() })).not.toThrow()
    expect(chart.text.footnote[1]).toBe(
      'Last rank each day. 21 of 30 days have one. A gap: a failed run or below #100.',
    )
    if (chart.model.kind !== 'headline' || chart.model.support.type !== 'spark') throw new Error('spark')
    const values = chart.model.support.values
    const ctx = dashCtx()
    trace(
      ctx,
      values,
      (i) => i,
      (v) => v,
      '#000',
      4,
    )
    const bridges = ctx.lines.filter((l) => l.dash.length > 0)
    expect(bridges).toHaveLength(1)
    // The bridge spans the gap: from the last day before it to the first day after it, with no point inside.
    const first = values.findIndex((v, i) => v === null && values[i - 1] !== null)
    expect(bridges[0]).toMatchObject({ x0: first - 1, x1: first + 9 })
    expect(ctx.lines.filter((l) => !l.dash.length).every((l) => l.x1 - l.x0 === 1)).toBe(true)
  })

  it('a missed 12:00 run keeps that day’s 00:00 rank', () => {
    const missed = ['2026-10-28', '2026-10-29', '2026-10-31']
    const body = history(['us'], (t) => missed.includes(at(t).slice(0, 10)) && at(t).slice(11, 13) === '12')
    const { days, ranks } = dailyRanks(readRankHistory(body), 30, 'us')
    for (const d of missed) expect(ranks[days.indexOf(d)]).toBe(2)
    expect(ranks.every((r) => r === 2)).toBe(true)
  })

  it('a slot with a null or 0 rank does not hide the day’s earlier rank', () => {
    const h = readRankHistory({
      data: {
        series: [
          {
            country: 'us',
            points: [
              { at: '2026-10-28 00:15:00', rank: 5 },
              { at: '2026-10-28 12:15:00', rank: null },
              { at: '2026-10-29 00:15:00', rank: 0 },
            ],
          },
        ],
      },
    })
    expect(dailyRanks(h, 2, 'us').ranks).toEqual([5, null])
  })

  it('a partial slot has no point for the countries it missed, and never another country’s rank', () => {
    // On 20 Oct only GB was collected; US has no point there.
    const body = history(['us', 'gb'], (t, c) => c === 'us' && at(t).startsWith('2026-10-20'))
    const h = readRankHistory(body)
    const us = dailyRanks(h, 30, 'us')
    const gb = dailyRanks(h, 30, 'gb')
    expect(us.ranks[us.days.indexOf('2026-10-20')]).toBeNull()
    expect(gb.ranks[gb.days.indexOf('2026-10-20')]).toBe(3)
    // An answer with no US series at all gives no US values, not GB's.
    const gbOnly = readRankHistory(history(['gb'], () => false))
    expect(dailyRanks(gbOnly, 30, 'us').ranks).toEqual([])
    expect(() =>
      mapNumberOne(
        rankings,
        history(['gb'], () => false),
      ),
    ).not.toThrow()
  })
})

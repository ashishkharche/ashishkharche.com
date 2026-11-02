import { describe, expect, it } from 'vitest'
import { drawLive } from '~/lib/charts/kinds'
import {
  dailyRanks,
  liveFootnote,
  liveTemplates,
  mapBump,
  mapCountries,
  mapHeadToHead,
  mapIosAndroid,
  mapMostSdks,
  mapMovers,
  mapNumberOne,
  NoDataError,
  sortedRankings,
  validateLive,
  type LiveChart,
} from '~/lib/charts/live'
import { ChartRuleError, type Ctx } from '~/lib/charts/render'
import { createTdnClient, formatDataTime, parseDataTime, tdnUrl, TdnError, unwrap } from '~/lib/charts/tdn'
import { findBanned } from '~/content/rules'
import { fixtureFetch, fixtureKey, fixtures } from '../fixtures/tdn/index.ts'

const f = (key: string) => {
  const body = fixtures[key]
  if (body === undefined) throw new Error(`missing fixture ${key}`)
  return structuredClone(body)
}
const APPLE = 'rankings?chart=top-free&country=us&limit=200&store=apple'
const GOOGLE = 'rankings?category=APPLICATION&chart=top-free&country=us&limit=200&store=google'
const TECH = 'tech-stack?limit=500'
const history = (id: string) => `rank-history?chart=top-free&countries=us&days=30&id=${id}&store=apple`
const appRankings = (id: string) => `app-rankings?chart_type=top-free&id=${id}&store=apple`

function fakeCtx(): Ctx & { calls: string[]; texts: string[] } {
  const calls: string[] = []
  const texts: string[] = []
  let font = '10px x'
  const target = {
    calls,
    texts,
    get font() {
      return font
    },
    set font(value: string) {
      font = value
    },
    measureText(text: string) {
      const size = Number(/(\d+(\.\d+)?)px/.exec(font)?.[1] ?? 10)
      return {
        width: text.length * size * 0.5,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * size * 0.5,
        actualBoundingBoxAscent: size * 0.7,
        actualBoundingBoxDescent: size * 0.2,
      }
    },
    fillText(text: string) {
      calls.push('fillText')
      texts.push(text)
    },
  }
  return new Proxy(target, {
    get(t, key) {
      if (key in t) return Reflect.get(t, key)
      return () => {
        calls.push(String(key))
      }
    },
    set(_t, key, value) {
      if (key === 'font') font = value as string
      return true
    },
  }) as unknown as Ctx & { calls: string[]; texts: string[] }
}

const numbersIn = (text: string) => text.match(/\d+(?:\.\d+)?/g) ?? []

describe('proxy client', () => {
  it('builds query-style proxy URLs with sorted parameters', () => {
    expect(tdnUrl('rankings', { store: 'apple', country: 'us', limit: 5 })).toBe(
      '/api/tdn/?endpoint=rankings&country=us&limit=5&store=apple',
    )
    expect(tdnUrl('compare', { apps: '1,2', days: undefined })).toBe('/api/tdn/?endpoint=compare&apps=1%2C2')
  })
  it('sends each request once per page load and retries failures', async () => {
    let calls = 0
    let fail = true
    const client = createTdnClient(async () => {
      calls++
      if (fail)
        return { ok: false, status: 503, json: async () => ({ error: 'not configured', code: 'not_configured' }) }
      return { ok: true, status: 200, json: async () => ({ data: [], meta: {} }) }
    })
    await expect(client.get('rankings')).rejects.toBeInstanceOf(TdnError)
    fail = false
    await client.get('rankings')
    await client.get('rankings')
    expect(calls).toBe(2)
  })
  it('reads API data times as UTC', () => {
    const date = parseDataTime('2026-11-01 12:18:03')
    expect(date?.toISOString()).toBe('2026-11-01T12:18:03.000Z')
    expect(formatDataTime(date as Date)).toBe('1 Nov 2026, 12:18 UTC')
    expect(parseDataTime('')).toBeNull()
    expect(parseDataTime('soon')).toBeNull()
  })
  it('unwraps { data } and leaves flat answers alone', () => {
    expect(unwrap({ data: [1] })).toEqual([1])
    expect(unwrap({ rankings: [] })).toEqual({ rankings: [] })
  })
})

describe('kind mappers', () => {
  it('headline: the #1 app, its days at #1 and the data time', () => {
    const top = sortedRankings(f(APPLE))[0]
    const out = mapNumberOne(f(APPLE), f(history(top?.appId ?? '')))
    expect(out.model.kind).toBe('headline')
    expect(out.model.answer).toBe('ChatGPT')
    expect(out.dataTime).toBe('1 Nov 2026, 12:18 UTC')
    const ranks = out.model.support.type === 'spark' ? out.model.support.values : []
    expect(ranks).toHaveLength(30)
    const days = ranks.filter((r) => r === 1).length
    expect(out.model.sentence).toContain(`#1 on ${days} of the last 30 days`)
    expect(out.model.others.map((o) => o.note)).toEqual(['#2', '#4', '#5', '#6'])
  })
  it('headline: asks a different question when #1 is not a tracked app', () => {
    const body = f(APPLE) as { data: Array<{ rank: number }> }
    body.data = body.data.slice(1)
    const out = mapNumberOne(body, { data: { series: [] } })
    expect(out.text.title).toBe('Which tracked app ranks highest on the US Top Free chart?')
    expect(out.model.sentence).toContain('at #2')
  })
  it('headline: counts countries with a rank and bands them', () => {
    const app = sortedRankings(f(APPLE)).find((r) => r.name === 'ChatGPT')
    if (!app) throw new Error('no ChatGPT')
    const raw = f(appRankings(app.appId)) as { rankings: Array<{ rank: number }> }
    const out = mapCountries(f(APPLE), raw, app)
    expect(out.model.answer).toBe(String(raw.rankings.length))
    const bars = out.model.support.type === 'bars' ? out.model.support.bars : []
    expect(bars.reduce((sum, b) => sum + b.value, 0)).toBe(raw.rankings.length)
    expect(bars[0]?.value).toBe(raw.rankings.filter((r) => r.rank === 1).length)
  })
  it('ranked list: climbers only, biggest first, with icons from rankings', () => {
    const out = mapMovers(f('movers?chart=top-free&country=us&limit=20'), f(APPLE), 10)
    const values = out.model.rows.map((r) => r.value)
    expect(values.every((v) => v > 0)).toBe(true)
    expect(values).toEqual([...values].sort((a, b) => b - a))
    expect(out.model.rows[0]).toMatchObject({ display: '+16', detail: '#29 to #13' })
    expect(out.model.rows[0]?.app.iconUrl).toMatch(/^https:\/\/is1-ssl\.mzstatic\.com\//)
    expect(mapMovers(f('movers?chart=top-free&country=us&limit=20'), f(APPLE), 5).model.rows).toHaveLength(5)
  })
  it('ranked list: most SDKs across both stores, with the analysis dates', () => {
    const out = mapMostSdks(f(TECH), f(APPLE), f(GOOGLE), 10)
    expect(out.model.rows[0]).toMatchObject({ value: 52, detail: 'Android' })
    expect(out.model.rows).toHaveLength(10)
    expect(out.text.footnote[1]).toMatch(/^Builds analyzed \d+ \w+ 2026 to \d+ \w+ 2026\./)
  })
  it('head to head: 3 to 5 measures both apps have', () => {
    const rows = sortedRankings(f(APPLE))
    const a = rows.find((r) => r.name === 'ChatGPT')
    const b = rows.find((r) => r.name === 'Google Gemini')
    if (!a || !b) throw new Error('missing apps')
    const out = mapHeadToHead(
      f(APPLE),
      f(`compare?apps=${a.appId},${b.appId}&country=us&days=30&store=apple`),
      f(TECH),
      [f(appRankings(a.appId)), f(appRankings(b.appId))],
      [a, b],
    )
    expect(out.model.metrics.length).toBeGreaterThanOrEqual(3)
    expect(out.model.metrics.length).toBeLessThanOrEqual(5)
    expect(out.model.metrics[0]).toMatchObject({ label: 'US Top Free rank', display: ['#1', '#2'], better: 'lower' })
    expect(out.model.metrics.find((m) => m.label === 'Star rating')?.display).toEqual(['4.8', '4.7'])
    expect(out.text.title).toBe('ChatGPT vs Google Gemini')
    expect(() => mapHeadToHead(f(APPLE), { data: [] }, { data: [] }, [{}, {}], [a, b])).toThrow(NoDataError)
  })
  it('rank over time: one rank per day, gaps where no rank was recorded', () => {
    const rows = sortedRankings(f(APPLE)).filter((r) => /ChatGPT|Gemini|Claude|Grok/.test(r.name))
    const out = mapBump(
      f(APPLE),
      rows.map((r) => f(history(r.appId))),
      rows,
      30,
    )
    expect(out.model.series).toHaveLength(4)
    expect(out.model.days).toHaveLength(30)
    expect(out.model.days.at(-1)).toBe('2026-11-01')
    const grok = out.model.series.find((x) => x.app.name === 'Grok')
    expect(grok?.ranks.some((r) => r === null)).toBe(true)
    expect(out.dataTime).toBe('1 Nov 2026, 12:18 UTC')
  })
  it('daily ranks take the last rank of each UTC day', () => {
    const daily = dailyRanks(
      {
        appId: '1',
        store: 'apple',
        chart: 'top-free',
        series: [
          {
            country: 'us',
            points: [
              { at: '2026-10-31 00:18:03', rank: 9 },
              { at: '2026-10-31 12:18:03', rank: 4 },
              { at: '2026-11-01 00:18:03', rank: 3 },
            ],
          },
        ],
      },
      3,
    )
    expect(daily).toEqual({ days: ['2026-10-30', '2026-10-31', '2026-11-01'], ranks: [null, 4, 3] })
  })
  it('iOS vs Android: apps on both charts matched by name', () => {
    const out = mapIosAndroid(f(APPLE), f(GOOGLE), 8)
    expect(out.model.rows).toHaveLength(8)
    expect(out.model.rows[0]).toMatchObject({ left: 1, right: 1 })
    expect(out.model.rows.find((r) => r.app.name === 'Threads')).toMatchObject({ left: 4, right: 12 })
    expect(out.text.footnote[1]).toContain('Google Play data from 1 Nov 2026, 12:20 UTC')
  })
})

describe('live templates', () => {
  it('has 7 live templates across the 5 kinds, each within 5 requests', () => {
    expect(liveTemplates).toHaveLength(7)
    expect(new Set(liveTemplates.map((t) => t.kind))).toEqual(
      new Set(['headline', 'leaderboard', 'head-to-head', 'bump', 'dumbbell']),
    )
    for (const t of liveTemplates) expect(t.requests).toBeLessThanOrEqual(5)
  })

  for (const template of liveTemplates) {
    describe(template.id, () => {
      const load = async () => {
        const client = createTdnClient(fixtureFetch())
        const chart = await template.load(client, {})
        return { chart, client }
      }
      it('loads from fixtures with the requests it says it makes', async () => {
        const { chart, client } = await load()
        expect(client.requested).toHaveLength(template.requests)
        for (const url of client.requested) expect(url.startsWith('/api/tdn/?endpoint=')).toBe(true)
        expect(client.requested.every((url) => fixtures[fixtureKey(url)] !== undefined)).toBe(true)
        expect(chart.templateId).toBe(template.id)
        expect(chart.model.kind).toBe(template.kind)
      })
      it('passes the data rules, with the data time on the chart', async () => {
        const { chart } = await load()
        expect(validateLive(chart)).toEqual([])
        const foot = liveFootnote(chart)
        expect(foot).toHaveLength(3)
        expect(foot[0]).toMatch(/^Source: .+\. Data from \d{1,2} \w{3} 2026, \d{2}:\d{2} UTC\.$/)
        for (const line of foot) expect(line.length).toBeLessThanOrEqual(110)
      })
      it('uses plain words: no long dashes, no site name, no blocked terms', async () => {
        const { chart } = await load()
        const words = [chart.text.title, chart.text.subtitle, ...liveFootnote(chart), template.name, template.about]
        if (chart.model.kind === 'headline') words.push(chart.model.sentence)
        const all = words.join('\n')
        expect(all).not.toMatch(/[\u2013\u2014]|\bI built\b/)
        expect(findBanned(all)).toEqual([])
      })
      it('shows only numbers from the data', async () => {
        const { chart } = await load()
        const visible = [chart.text.title, chart.text.subtitle, ...liveFootnote(chart)]
        if (chart.model.kind === 'headline') visible.push(chart.model.sentence, chart.model.answer)
        const allowed = new Set([...chart.numbers, ...numbersIn(chart.dataTime)])
        expect(visible.flatMap(numbersIn).filter((n) => !allowed.has(n))).toEqual([])
      })
      it('draws at every size', async () => {
        const { chart } = await load()
        for (const [width, height] of [
          [1800, 1390],
          [1920, 1080],
          [1200, 1200],
        ] as const) {
          const ctx = fakeCtx()
          drawLive(ctx, chart, chart.text, { width, height })
          expect(ctx.texts).toContain(chart.text.title)
          expect(ctx.texts.some((t) => t.includes(chart.dataTime))).toBe(true)
        }
      })
      it('shows no chart when the proxy fails', async () => {
        const client = createTdnClient(
          fixtureFetch({
            rankings: { status: 503, body: { error: 'x', code: 'not_configured' } },
            movers: { status: 503, body: { error: 'x', code: 'not_configured' } },
            'tech-stack': { status: 503, body: { error: 'x', code: 'not_configured' } },
          }),
        )
        await expect(template.load(client, {})).rejects.toBeInstanceOf(TdnError)
      })
    })
  }
})

describe('live data rules', () => {
  let chart: LiveChart
  const ready = async () => {
    chart ??= await (liveTemplates[0] as (typeof liveTemplates)[number]).load(createTdnClient(fixtureFetch()), {})
    return chart
  }
  it('refuses a number that is not in the data', async () => {
    const c = await ready()
    expect(validateLive(c, { ...c.text, title: 'Which app is #1 of 4321?' })).toContain(
      'These numbers are not in the data: 4321.',
    )
  })
  it('needs the data time, a Source line and short footnotes', async () => {
    const c = await ready()
    const foot = c.text.footnote
    expect(validateLive(c, { ...c.text, footnote: ['Source: {source}.', foot[1], foot[2]] })).toContain(
      'The footnote must show the data time, {time}.',
    )
    expect(validateLive(c, { ...c.text, footnote: ['From {source} at {time}.', foot[1], foot[2]] })).toContain(
      'The first footnote line must start with "Source:".',
    )
    expect(validateLive(c, { ...c.text, footnote: [foot[0], 'x'.repeat(111), foot[2]] })).toContain(
      'Footnote line 2 is 111 characters; the limit is 110.',
    )
    expect(validateLive({ ...c, dataTime: '' })).toContain('The data has no time, so it cannot be shown as live.')
  })
  it('stops drawLive before it draws', async () => {
    const c = await ready()
    const ctx = fakeCtx()
    expect(() => drawLive(ctx, c, { ...c.text, source: '' }, { width: 1800, height: 1390 })).toThrow(ChartRuleError)
    expect(ctx.calls).toEqual([])
  })
  it('throws NoDataError when the data cannot answer the question', async () => {
    const empty = createTdnClient(
      fixtureFetch({ rankings: { status: 200, body: { data: [], meta: { recordedAt: '2026-11-01 12:18:03' } } } }),
    )
    for (const t of liveTemplates.filter((x) => !['most-sdks', 'us-climbers'].includes(x.id))) {
      await expect(t.load(empty, {})).rejects.toBeInstanceOf(NoDataError)
    }
  })
  it('never shows numbers without a data time', async () => {
    const body = f(APPLE) as { meta: Record<string, unknown> }
    delete body.meta.recordedAt
    expect(() => mapIosAndroid(body, f(GOOGLE), 8)).toThrow(NoDataError)
  })
})

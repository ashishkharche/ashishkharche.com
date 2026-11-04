// The v4 chart builder: new templates on live-shaped answers (saved from the live API on 4 Nov 2026, 13:33 GMT),
// the audit fixes, the kept copy, the data-age line and the plain circle for a missing icon.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { drawLive } from '../../src/lib/charts/kinds.ts'
import {
  latestMovers,
  liveTemplates,
  mapBump,
  mapGrossingRuns,
  mapMostSdks,
  mapMostSdksHeadline,
  mapMovers,
  mapNumberOne,
  mapNumberOneCountries,
  mapThreeCountries,
  mapWidestGap,
  NoDataError,
  pickChoices,
  sortedRankings,
  validateLive,
  whereOf,
  type LiveChart,
} from '../../src/lib/charts/live.ts'
import type { Ctx } from '../../src/lib/charts/render.ts'
import {
  createTdnClient,
  dataFromLine,
  londonTime,
  oldestFetch,
  readCompare,
  readTechStack,
  snapshotLookup,
  tdnUrl,
  trackClient,
  type RankingRow,
} from '../../src/lib/charts/tdn.ts'
import { fetchedLine, galleryGroups, keptCopyNote } from '../../src/lib/charts/page.ts'

const f = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../fixtures/tdn-v4/${name}.json`, import.meta.url), 'utf8'))
const US = f('r_us')
const GP = f('r_gp')
const TS = f('ts')
const row = (body: unknown, re: RegExp) => sortedRankings(body).find((r) => re.test(r.name)) as RankingRow
const CHATGPT = row(US, /^ChatGPT$/)

/** A canvas stand-in that records arcs, fills and lines, and never fails. */
function ctx() {
  const calls: Array<{ op: string; args: unknown[] }> = []
  const target: Record<string, unknown> = {
    calls,
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
    get: (t, k) => (k in t ? Reflect.get(t, k) : (...args: unknown[]) => void calls.push({ op: String(k), args })),
    set: () => true,
  }) as unknown as Ctx & { calls: typeof calls }
}

const draws = (chart: Omit<LiveChart, 'templateId' | 'text'> & { text: Omit<LiveChart['text'], 'source'> }) => {
  const full = { ...chart, templateId: 't', text: { ...chart.text, source: 'public data' } } as LiveChart
  expect(validateLive(full)).toEqual([])
  expect(() => drawLive(ctx(), full, full.text, { width: 1800, height: 1390, icons: new Map() })).not.toThrow()
  return full
}

describe('ChatGPT #1 in N of the countries where it charts', () => {
  it('counts rank 1 rows among fresh country ranks, with a rank histogram', () => {
    const out = mapNumberOneCountries(f('ar_gpt'), CHATGPT)
    const rows = (f('ar_gpt') as { rankings: Array<{ rank: number }> }).rankings
    expect(out.model.answer).toBe(String(rows.filter((r) => r.rank === 1).length))
    expect(out.model.unit).toBe(`of ${rows.length} countries`)
    expect(out.model.support?.type).toBe('bars')
    draws(out)
  })
  it('leaves out stale rows', () => {
    const body = {
      rankings: [
        { country: 'us', rank: 1, recordedAt: '2026-11-04 12:06:34' },
        { country: 'gb', rank: 1, recordedAt: '2026-10-20 12:06:34' },
      ],
    }
    const out = mapNumberOneCountries(body, CHATGPT)
    expect(out.model.answer).toBe('1')
    expect(out.model.unit).toBe('of 1 countries')
    expect(out.coverage).toContain('1 older rows left out')
  })
  it('0 rows is NoDataError (a fallback chart is drawn)', () => {
    expect(() => mapNumberOneCountries({ rankings: [] }, CHATGPT)).toThrow(NoDataError)
  })
})

describe('ChatGPT #1 on US Top Grossing in N of M runs', () => {
  it('counts runs from the rank-history points', () => {
    const body = f('rh_gr') as { data: { series: Array<{ points: Array<{ rank: number }> }> } }
    const points = body.data.series[0]?.points ?? []
    const out = mapGrossingRuns(body, CHATGPT)
    expect(out.model.answer).toBe(String(points.filter((p) => p.rank === 1).length))
    expect(out.model.unit).toBe(`of ${points.length} runs`)
    expect(out.model.support?.type).toBe('spark')
    draws(out)
  })
  it('1 point: no sparkline', () => {
    const out = mapGrossingRuns(
      { data: { series: [{ country: 'us', points: [{ at: '2026-11-04 12:06:34', rank: 1 }] }] } },
      CHATGPT,
    )
    expect(out.model.answer).toBe('1')
    expect(out.model.support).toBeUndefined()
    draws(out)
  })
  it('a skipped run is not counted, and leaves an empty day', () => {
    const out = mapGrossingRuns(
      {
        data: {
          series: [
            {
              country: 'us',
              points: [
                { at: '2026-11-01 12:00:00', rank: 1 },
                { at: '2026-11-03 12:00:00', rank: 2 },
                { at: '2026-11-04 12:00:00', rank: 1 },
              ],
            },
          ],
        },
      },
      CHATGPT,
    )
    expect(out.model.unit).toBe('of 3 runs')
    const values = out.model.support?.type === 'spark' ? out.model.support.values : []
    expect(values.slice(-4)).toEqual([1, null, 2, 1])
  })
  it('0 rows is NoDataError', () => {
    expect(() => mapGrossingRuns({ data: { series: [] } }, CHATGPT)).toThrow(NoDataError)
  })
})

describe('ChatGPT vs Gemini vs Claude: countries each charts in', () => {
  const apps = [
    CHATGPT,
    row(US, /Gemini/) ?? { rank: 0, appId: '6477489729', store: 'apple', name: 'Google Gemini', iconUrl: null },
    row(US, /^Claude/) ?? { rank: 0, appId: '6473753684', store: 'apple', name: 'Claude', iconUrl: null },
  ]
  it('draws icon bars, most countries first, from the app-rankings answers', () => {
    const out = mapThreeCountries([f('ar_gpt'), f('ar_gem'), f('ar_cl')], apps)
    if (out.model.support?.type !== 'icon-bars') throw new Error('icon bars')
    const values = out.model.support.bars.map((b) => b.value)
    expect(values).toEqual([...values].sort((a, b) => b - a))
    expect(out.model.answer).toBe(out.model.support.bars[0]?.label)
    draws(out)
  })
  it('an app whose answer failed is left out; fewer than 2 is NoDataError', () => {
    const out = mapThreeCountries([f('ar_gpt'), null, f('ar_cl')], apps)
    expect(out.model.support?.type === 'icon-bars' && out.model.support.bars).toHaveLength(2)
    expect(() => mapThreeCountries([f('ar_gpt'), null, null], apps)).toThrow(NoDataError)
  })
  it('a tie says so', () => {
    const same = { rankings: [{ country: 'us', rank: 3, recordedAt: '2026-11-04 12:06:34' }] }
    const out = mapThreeCountries([same, same, null], apps)
    expect(out.model.sentence).toMatch(/tie: each charts in 1 App Store countries/)
  })
})

describe('the iOS app with the most SDKs', () => {
  it('"ships at least N SDKs, the most of M analysed iOS builds", with capturedAt', () => {
    const ios = readTechStack(TS).filter((r) => r.store === 'apple' && r.sdkCount > 0)
    const top = [...ios].sort((a, b) => b.sdkCount - a.sdkCount)[0]
    const out = mapMostSdksHeadline(TS, US, GP)
    expect(out.model.answer).toBe(String(top?.sdkCount))
    expect(out.model.unit).toBe('SDKs, at least')
    expect(out.model.sentence).toMatch(
      new RegExp(
        `ships at least ${top?.sdkCount} SDKs, the most of ${ios.length} analyzed iOS builds\\. Analyzed \\d+ \\w+ 2026\\.`,
      ),
    )
    draws(out)
  })
  it('0 rows is NoDataError', () => {
    expect(() => mapMostSdksHeadline({ data: [] }, US, GP)).toThrow(NoDataError)
  })
  it('a null developerSlug is fine: the developer field is read', () => {
    const rows = readTechStack(TS)
    const raw = (TS as { data: Array<{ developerSlug: string | null; developer: string }> }).data
    expect(raw.filter((r) => r.developerSlug === null).length).toBe(45)
    expect(rows.find((r) => r.appName.startsWith('Deliveroo'))?.developer).toBe('ROOFOODS LTD')
  })
  it('Android rows show each capture date; iOS rows say at least', () => {
    const android = mapMostSdks(TS, US, GP, 5, 'google')
    expect(android.model.rows.every((r) => /^Android, analyzed \d+ \w+ 2026$/.test(r.detail ?? ''))).toBe(true)
    const ios = mapMostSdks(TS, US, GP, 5, 'apple')
    expect(ios.model.rows.every((r) => r.display.endsWith('+') && r.detail?.includes('at least'))).toBe(true)
  })
})

describe('the widest iOS vs Android rank gap', () => {
  it('sorts the apps on both US charts by gap, widest first', () => {
    const out = mapWidestGap(US, GP)
    const gaps = out.model.rows.map((r) => Math.abs(r.left - r.right))
    expect(gaps).toEqual([...gaps].sort((a, b) => b - a))
    expect(out.text.title).toContain(`${gaps[0]} places apart`)
    draws(out)
  })
  it('0 rows is NoDataError', () => {
    const empty = { data: [], meta: { recordedAt: '2026-11-04 12:06:34' } }
    expect(() => mapWidestGap(empty, empty)).toThrow(NoDataError)
  })
})

describe('audit fixes', () => {
  it('(a) a US #1 with 1 rank-history point gets no sparkline', () => {
    const out = mapNumberOne(US, f('rh_6741796873'))
    expect(out.model.support).toBeUndefined()
    expect(out.model.sentence).toContain('It is new: one rank on record so far.')
    draws(out)
  })
  it('(b) movers keep only rows at the latest recordedAt (no stale Reddit or Uber Eats)', () => {
    const rows = latestMovers((f('mv_tf') as { data: Array<{ name: string; recordedAt: string }> }).data)
    expect(rows.some((r) => /^(Reddit|Uber Eats)/.test(r.name))).toBe(false)
    expect(new Set(rows.map((r) => r.recordedAt))).toEqual(new Set(['2026-11-04 12:06:34']))
    const out = mapMovers(f('mv_tf'), US, 10)
    expect(out.model.rows.some((r) => /^(Reddit|Uber Eats)/.test(r.app.name))).toBe(false)
  })
  it('(d) compare reads snake_case snapshots[] and rankings[]', () => {
    const rows = readCompare(f('cmp'))
    const gpt = rows.find((r) => r.appId === '6448311069')
    expect(gpt?.ratingCount).toBeGreaterThan(10_000_000)
    expect(gpt?.rankings?.[0]).toMatchObject({ chartType: 'top-free', rank: 3, recordedAt: '2026-10-06 00:09:09' })
    expect(
      readCompare({ data: [{ appId: '1', snapshots: [{ recordedAt: '2026-11-01 00:00:00', ratingCount: 5 }] }] })[0]
        ?.ratingCount,
    ).toBe(5)
  })
  it('(g) a new app is drawn from its first day, and gaps are empty, never drops', () => {
    const history = (points: Array<[string, number]>) => ({
      data: { series: [{ country: 'us', points: points.map(([at, rank]) => ({ at, rank })) }] },
    })
    const out = mapBump(
      US,
      [
        history([['2026-11-04 12:00:00', 1]]),
        history([
          ['2026-11-01 12:00:00', 4],
          ['2026-11-03 12:00:00', 5],
          ['2026-11-04 12:00:00', 6],
        ]),
      ],
      [row(US, /TikTok/), CHATGPT],
      5,
    )
    expect(out.model.series[0]?.ranks).toEqual([null, null, null, null, 1])
    expect(out.model.series[1]?.ranks).toEqual([null, 4, null, 5, 6])
    const c = ctx()
    drawLive(
      c,
      { ...out, templateId: 't', text: { ...out.text, source: 's' } } as LiveChart,
      { ...out.text, source: 's' },
      {
        width: 1800,
        height: 1390,
        icons: new Map(),
      },
    )
    expect(c.calls.filter((x) => x.op === 'setLineDash' && (x.args[0] as number[]).length > 0)).toHaveLength(0)
  })
  it('bump store and country: UK Google Play reads the gb series', () => {
    const where = whereOf('google-gb')
    expect(where).toMatchObject({ store: 'google', country: 'gb', place: 'UK', storeName: 'Google Play' })
    const out = mapBump(
      US,
      [
        {
          data: {
            series: [
              { country: 'us', points: [{ at: '2026-11-04 00:00:00', rank: 9 }] },
              {
                country: 'gb',
                points: [
                  { at: '2026-11-03 00:00:00', rank: 2 },
                  { at: '2026-11-04 00:00:00', rank: 1 },
                ],
              },
            ],
          },
        },
      ],
      [CHATGPT],
      2,
      0,
      'AI apps',
      where,
    )
    expect(out.model.series[0]?.ranks).toEqual([2, 1])
    expect(out.text.title).toBe('UK Google Play Top Free rank over 2 days')
  })
})

describe('head-to-head picker', () => {
  it('offers only named apps with a store icon, and always the current pair', () => {
    const rows = sortedRankings(US)
    const noIcon = { ...CHATGPT, iconUrl: null }
    const choices = pickChoices([...rows.filter((r) => r.appId !== CHATGPT.appId), noIcon], [noIcon])
    expect(choices.some((c) => c.appId === CHATGPT.appId)).toBe(true)
    expect(
      choices.every((c) => c.appId === CHATGPT.appId || /^https:\/\/is\d-ssl\.mzstatic\.com\//.test(c.iconUrl ?? '')),
    ).toBe(true)
    expect(choices.some((c) => /unknown/i.test(c.name))).toBe(false)
  })
  it('the template lists the ChatGPT and Gemini pair by default', () => {
    expect(liveTemplates.find((t) => t.id === 'chatgpt-vs-gemini')?.pickApps).toBe(true)
    expect(liveTemplates.find((t) => t.id === 'ai-rank-30-days')?.pickPlace).toBe(true)
  })
})

describe('kept copy and data age', () => {
  it('a failed request is answered from the snapshot, marked kept with its fetch time', async () => {
    const url = tdnUrl('rankings', { store: 'apple' })
    const client = createTdnClient(async () => ({ ok: false, status: 503, json: async () => ({ code: 'down' }) }), {
      lastGood: snapshotLookup(async () => ({
        savedAt: '2026-11-04T13:40:00Z',
        answers: { [url]: { body: US, fetchedAt: '2026-11-04T09:00:00Z' } },
      })),
    })
    const tracked = trackClient(client)
    await expect(tracked.client.get('rankings', { store: 'apple' })).resolves.toBe(US)
    const answers = tracked.answers()
    expect(answers).toEqual([{ fetchedAt: new Date('2026-11-04T09:00:00Z'), stale: true, kept: true }])
    const note = keptCopyNote(answers, Date.parse('2026-11-04T13:40:00Z'))
    expect(note).toBe(
      'Kept copy. Live data did not load, so the copy fetched at 09:00 GMT is shown. It is 4 hours old.',
    )
  })
  it('with no snapshot answer the error is passed on (the page asks again)', async () => {
    const client = createTdnClient(async () => ({ ok: false, status: 503, json: async () => ({}) }), {
      lastGood: snapshotLookup(async () => null),
    })
    await expect(client.get('rankings')).rejects.toThrow()
  })
  it('a timed-out request (a cold cache) falls back the same way', async () => {
    const url = tdnUrl('movers')
    const client = createTdnClient(async () => Promise.reject(new DOMException('timeout', 'TimeoutError')), {
      lastGood: async (u) => (u === url ? { body: { data: [] }, fetchedAt: '2026-11-04T13:00:00Z' } : null),
    })
    await expect(client.get('movers')).resolves.toEqual({ data: [] })
  })
  it('"Data from HH:MM GMT" uses x-tdn-fetched-at, the oldest of the chart’s answers', async () => {
    const headers = (at: string) => ({ get: (n: string) => (n === 'x-tdn-fetched-at' ? at : null) })
    const times: Record<string, string> = { a: '2026-11-04T13:33:04.511Z', b: '2026-11-04T12:10:00Z' }
    const client = createTdnClient(async (u) => ({
      ok: true,
      status: 200,
      headers: headers(u.includes('movers') ? (times.b as string) : (times.a as string)),
      json: async () => ({}),
    }))
    const tracked = trackClient(client)
    await Promise.all([tracked.client.get('rankings'), tracked.client.get('movers')])
    expect(oldestFetch(tracked.answers())?.toISOString()).toBe('2026-11-04T12:10:00.000Z')
    const now = new Date('2026-11-04T13:40:00Z')
    expect(fetchedLine(tracked.answers(), '4 Nov 2026, 12:06 UTC', now)).toBe('Data from 12:10 GMT')
    expect(fetchedLine([], '4 Nov 2026, 12:06 UTC', now)).toBe('Data from 12:06 GMT')
    expect(dataFromLine(new Date('2026-11-03T23:10:00Z'), now)).toBe('Data from 23:10 GMT, 3 Nov')
    expect(londonTime(new Date('2026-07-01T12:00:00Z'))).toBe('13:00 BST')
  })
  it('fresh answers need no flag', () => {
    expect(keptCopyNote([{ fetchedAt: new Date(), stale: false, kept: false }])).toBe('')
  })
})

describe('gallery and icons', () => {
  it('groups every live kind into Headlines, Leaderboards, Head-to-head or Over time', () => {
    const titles = galleryGroups.map((g) => g.title)
    expect(titles.slice(0, 4)).toEqual(['Headlines', 'Leaderboards', 'Head-to-head', 'Over time'])
    for (const t of liveTemplates) expect(galleryGroups.slice(0, 4).some((g) => g.kinds.includes(t.kind))).toBe(true)
  })
  it('a row whose icon did not load gets a plain circle: an arc and a fill, and no text in it', () => {
    const out = mapMostSdks(TS, US, GP, 5, 'apple')
    const c = ctx()
    const chart = { ...out, templateId: 't', text: { ...out.text, source: 's' } } as LiveChart
    // One icon loaded, so the icon column is there; the other four rows get the plain circle.
    const first = out.model.rows[0]?.app.appId ?? ''
    const icons = new Map([[first, { image: {} as CanvasImageSource, width: 64, height: 64 }]])
    drawLive(c, chart, chart.text, { width: 1800, height: 1390, icons })
    expect(c.calls.filter((x) => x.op === 'drawImage')).toHaveLength(1)
    expect(c.calls.filter((x) => x.op === 'stroke').length).toBeGreaterThanOrEqual(out.model.rows.length - 1)
    expect(c.calls.filter((x) => x.op === 'fillText').some((x) => /^[A-Za-z]$/.test(String(x.args[0])))).toBe(false)
  })
})

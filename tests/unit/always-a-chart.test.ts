// The chart builder always draws a chart from the latest live data. On 2 Nov 2026 the US App Store Top Free answer
// started at Muse from Meta (#3: the rankings list tracked apps only), and a phone showed "No chart: Muse from Meta
// has no verified icon" because a failed icon load stopped the whole chart. An icon is now optional: the app is
// drawn with its name only, and nothing about an icon, an empty field or a failed request leaves the page blank.
import { describe, expect, it } from 'vitest'
import { fixtureFetch } from '../fixtures/tdn/index.ts'
import { drawLive, trace, type Icon } from '~/lib/charts/kinds'
import {
  FALLBACKS,
  liveFootnote,
  liveTemplates,
  loadWithFallback,
  mapNumberOne,
  NAME_NOTE,
  NoDataError,
  retryDelay,
  validateLive,
  type LiveChart,
} from '~/lib/charts/live'
import type { Ctx } from '~/lib/charts/render'
import {
  createTdnClient,
  iconAllowed,
  parseDataTime,
  readRankHistory,
  readRankings,
  recordedAt,
  TdnError,
} from '~/lib/charts/tdn'

const MUSE_ICON =
  'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/5e/50/aa/5e50aa6f-edf9-9ef4-6519-e7515f562369/HatchAppIconPublic-0-0-1x_U007epad-0-1-0-sRGB-0-85-220.png/512x512bb.jpg'
const CHATGPT_ICON =
  'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/72/2d/27/722d272a-9d6f-d186-8a92-6a884107df8f/AppIcon-0-0-1x_U007epad-0-0-0-1-0-85-220.png/512x512bb.jpg'

/** The US Top Free answer as the live proxy gave it at 12:10 UTC on 2 Nov 2026 (first rows). */
const rankings = (top: Partial<Record<string, unknown>> = {}) => ({
  data: [
    {
      rank: 3,
      appId: '6760173601',
      store: 'apple',
      name: 'Muse from Meta',
      developer: 'Meta Platforms, Inc.',
      iconUrl: MUSE_ICON,
      ...top,
    },
    {
      rank: 4,
      appId: '6448311069',
      store: 'apple',
      name: 'ChatGPT',
      developer: 'OpenAI OpCo, LLC',
      iconUrl: CHATGPT_ICON,
    },
    { rank: 5, appId: '632064380', store: 'apple', name: 'Vinted: Pre-loved marketplace', iconUrl: CHATGPT_ICON },
    { rank: 6, appId: '368677368', store: 'apple', name: 'Uber - Rides, Eats, Hotels', iconUrl: CHATGPT_ICON },
    { rank: 9, appId: '529379082', store: 'apple', name: 'Lyft', iconUrl: CHATGPT_ICON },
  ],
  meta: { store: 'apple', country: 'us', chart: 'top-free', recordedAt: '2026-11-02 00:18:08', count: 40, total: 40 },
})
/** Muse is new: a few days of rank, with a gap (a missed run). */
const history = {
  data: {
    appId: '6760173601',
    store: 'apple',
    chart: 'top-free',
    series: [
      {
        country: 'us',
        points: [
          { at: '2026-10-29 00:17:00', rank: 40 },
          { at: '2026-10-30 00:17:00', rank: null },
          { at: '2026-10-31 00:17:00', rank: 12 },
          { at: '2026-11-02 00:18:08', rank: 3 },
        ],
      },
    ],
  },
}

const RANKINGS = 'rankings?chart=top-free&country=us&limit=200&store=apple'
const HISTORY = 'rank-history?chart=top-free&countries=us&days=30&id=6760173601&store=apple'

type Answer = { status: number; body: unknown } | (() => Promise<never>)
function client(answers: Record<string, Answer>) {
  const fallback = fixtureFetch()
  return createTdnClient(async (url: string) => {
    const key = Object.keys(answers).find((k) => url.includes(`endpoint=${k.split('?')[0]}`) && match(url, k))
    const answer = key ? answers[key] : undefined
    if (typeof answer === 'function') return answer()
    if (answer)
      return { ok: answer.status < 400, status: answer.status, json: async () => structuredClone(answer.body) }
    return fallback(url)
  })
}
/** True when every parameter of a fixture key is in the URL. */
function match(url: string, key: string) {
  const want = new URLSearchParams(key.split('?')[1] ?? '')
  const got = new URL(url, 'http://x').searchParams
  return [...want].every(([k, v]) => got.get(k) === v)
}

const usNumberOne = liveTemplates.find((t) => t.id === 'us-number-one')
if (!usNumberOne) throw new Error('us-number-one')

/** A 2D context stand-in that records text and images drawn. */
function recordingCtx() {
  const texts: string[] = []
  const images: unknown[] = []
  const dashes: number[][] = []
  let font = '10px x'
  const target = {
    texts,
    images,
    dashes,
    get font() {
      return font
    },
    set font(v: string) {
      font = v
    },
    measureText(t: string) {
      const size = Number(/(\d+(\.\d+)?)px/.exec(font)?.[1] ?? 10)
      return {
        width: t.length * size * 0.5,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: t.length * size * 0.5,
        actualBoundingBoxAscent: size * 0.7,
        actualBoundingBoxDescent: size * 0.2,
      }
    },
    fillText(t: string) {
      texts.push(t)
    },
    drawImage(image: unknown) {
      images.push(image)
    },
    setLineDash(d: number[]) {
      dashes.push(d)
    },
  }
  return new Proxy(target, {
    get(t, k) {
      return k in t ? Reflect.get(t, k) : () => ({ addColorStop() {} })
    },
    set(t, k, v) {
      Reflect.set(t, k, v)
      return true
    },
  }) as unknown as Ctx & { texts: string[]; images: unknown[]; dashes: number[][] }
}

const draw = (chart: LiveChart, icons = new Map<string, Icon>()) => {
  const ctx = recordingCtx()
  drawLive(ctx, chart, chart.text, { width: 1800, height: 1390, icons })
  return ctx
}
const noLetters = (ctx: { texts: string[] }) => ctx.texts.filter((t) => /^\p{L}$/u.test(t.trim()))

describe('Muse from Meta, the top US app on 2 Nov 2026', () => {
  it('its icon URL is on an allowed host', () => {
    expect(iconAllowed(MUSE_ICON)).toBe(true)
  })

  it('is the answer, drawn with its name, when its icon did not load', async () => {
    const c = client({ [RANKINGS]: { status: 200, body: rankings() }, [HISTORY]: { status: 200, body: history } })
    const { chart, note } = await loadWithFallback(usNumberOne, c)
    expect(note).toBe('')
    if (chart.model.kind !== 'headline') throw new Error('kind')
    expect(chart.model.answer).toBe('Muse from Meta')
    expect(validateLive(chart)).toEqual([])
    // No icon loaded (a 404, a timeout, a decode failure in the browser): no image, no letter, the name is drawn.
    const ctx = draw(chart)
    expect(ctx.images).toEqual([])
    expect(noLetters(ctx)).toEqual([])
    expect(ctx.texts).toContain('Muse from Meta')
  })

  it('is drawn with its icon when it loads', async () => {
    const c = client({ [RANKINGS]: { status: 200, body: rankings() }, [HISTORY]: { status: 200, body: history } })
    const { chart } = await loadWithFallback(usNumberOne, c)
    const image = { width: 512, height: 512 }
    const ctx = draw(chart, new Map([['6760173601', { image: image as never, width: 512, height: 512 }]]))
    expect(ctx.images).toContain(image)
  })

  it('says "highest tracked app" at #3, never "#1", because the rankings list tracked apps only', () => {
    const out = mapNumberOne(rankings(), history)
    expect(out.text.title).toBe('Which tracked app ranks highest on the US Top Free chart?')
    expect(out.model.sentence).toBe('Muse from Meta is the highest tracked app on the US Top Free chart, at #3.')
    expect(`${out.text.title} ${out.model.sentence}`).not.toMatch(/#1\b/)
  })

  it('draws its rank history across the missed run', () => {
    const out = mapNumberOne(rankings(), history)
    if (out.model.support?.type !== 'spark') throw new Error('support')
    expect(out.model.support.values.filter((v) => v !== null)).toEqual([40, 12, 3])
    const ctx = recordingCtx()
    trace(
      ctx,
      [40, null, 12, null, 3],
      (i) => i,
      (v) => v,
      '#fff',
      4,
    )
    // Gaps are left empty (never a dashed bridge or a drop): no dashed line at all.
    expect(ctx.dashes.filter((d) => d.length > 0)).toHaveLength(0)
  })
})

describe('icons never stop a chart', () => {
  const cases: Array<[string, Partial<Record<string, unknown>>]> = [
    ['has no icon URL', { iconUrl: null }],
    ['has an empty icon URL', { iconUrl: '' }],
    ['has an icon on a host that is not allowed', { iconUrl: 'https://example.com/icon.png' }],
    ['has an icon over plain http', { iconUrl: MUSE_ICON.replace('https:', 'http:') }],
  ]
  for (const [what, top] of cases) {
    it(`the top app still answers the question when it ${what}`, async () => {
      const c = client({ [RANKINGS]: { status: 200, body: rankings(top) }, [HISTORY]: { status: 200, body: history } })
      const { chart } = await loadWithFallback(usNumberOne, c)
      if (chart.model.kind !== 'headline') throw new Error('kind')
      expect(chart.model.answer).toBe('Muse from Meta')
      expect(iconAllowed(chart.model.app.iconUrl)).toBe(false)
      expect(noLetters(draw(chart))).toEqual([])
      expect(liveFootnote(chart).join(' ')).not.toContain('left out')
    })
  }

  it.each(liveTemplates.map((t) => t.id))('%s draws with no icons at all', async (id) => {
    const t = liveTemplates.find((x) => x.id === id)
    if (!t) throw new Error(id)
    const { chart } = await loadWithFallback(t, createTdnClient(fixtureFetch()))
    expect(validateLive(chart)).toEqual([])
    const ctx = draw(chart)
    expect(ctx.images).toEqual([])
  })
})

describe('empty and stand-in fields', () => {
  it('leaves out rows with no rank, id or real name, and says so when the top one was left out', () => {
    const body = rankings()
    body.data.unshift(
      { rank: 1, appId: 'x1', store: 'apple', name: 'Unknown', iconUrl: MUSE_ICON } as never,
      { rank: 2, appId: '', store: 'apple', name: 'No id', iconUrl: MUSE_ICON } as never,
      { appId: 'x3', store: 'apple', name: 'No rank' } as never,
      { rank: 2, appId: 'x4', store: 'apple', name: '   ' } as never,
    )
    expect(readRankings(body).map((r) => r.name)).toEqual([
      'Unknown',
      'Muse from Meta',
      'ChatGPT',
      'Vinted: Pre-loved marketplace',
      'Uber - Rides, Eats, Hotels',
      'Lyft',
    ])
    const out = mapNumberOne(body, history)
    expect(out.model.answer).toBe('Muse from Meta')
    expect(out.text.footnote[2]).toContain(NAME_NOTE)
  })

  it('reads a malformed rank history as no history, and still draws', async () => {
    for (const body of [
      null,
      {},
      { data: { series: 'x' } },
      { data: { series: [{ points: [{ at: 'not a date' }] }] } },
    ]) {
      expect(readRankHistory(body)?.series.flatMap((s) => s.points) ?? []).toEqual([])
      const out = mapNumberOne(rankings(), body)
      expect(out.text.footnote[1]).toContain('0 of 30 days have one')
    }
  })

  it('reads recordedAt, UTC with no zone, as UTC', () => {
    expect(parseDataTime('2026-11-02 00:18:08')?.toISOString()).toBe('2026-11-02T00:18:08.000Z')
    expect(recordedAt(rankings())?.toISOString()).toBe('2026-11-02T00:18:08.000Z')
    expect(mapNumberOne(rankings(), history).dataTime).toBe('2 Nov 2026, 00:18 UTC')
  })
})

describe('failed requests', () => {
  it('a failed rank history (5xx) still draws the chart', async () => {
    const c = client({
      [RANKINGS]: { status: 200, body: rankings() },
      [HISTORY]: { status: 502, body: { error: 'The data service returned an error', code: 'upstream_error' } },
    })
    const { chart } = await loadWithFallback(usNumberOne, c)
    expect(chart.model.kind === 'headline' && chart.model.answer).toBe('Muse from Meta')
  })

  it('a failed rankings request (5xx or a timeout) is passed on, so the page waits and asks again', async () => {
    const down = client({ [RANKINGS]: { status: 504, body: { error: 'timeout', code: 'upstream_timeout' } } })
    await expect(loadWithFallback(usNumberOne, down)).rejects.toBeInstanceOf(TdnError)
    const offline = client({ [RANKINGS]: () => Promise.reject(new TypeError('Failed to fetch')) })
    await expect(loadWithFallback(usNumberOne, offline)).rejects.toBeInstanceOf(TypeError)
    // Soon at first, then once a minute, forever: never an error on the page.
    expect([0, 1, 2, 3, 4, 5, 50].map(retryDelay)).toEqual([2, 5, 10, 20, 30, 60, 60])
  })

  it('asks again after a failure: a failed answer is not kept', async () => {
    let n = 0
    const c = createTdnClient(async () =>
      n++ === 0
        ? { ok: false, status: 502, json: async () => ({ error: 'x', code: 'upstream_error' }) }
        : { ok: true, status: 200, json: async () => rankings() },
    )
    await expect(c.get('rankings', {})).rejects.toBeInstanceOf(TdnError)
    await expect(c.get('rankings', {})).resolves.toMatchObject({ meta: { recordedAt: '2026-11-02 00:18:08' } })
  })

  it("labels the proxy's kept copy with its fetch time", async () => {
    const headers = (h: Record<string, string>) => ({ get: (k: string) => h[k.toLowerCase()] ?? null })
    const c = createTdnClient(async () => ({
      ok: true,
      status: 200,
      json: async () => rankings(),
      headers: headers({ 'x-tdn-fetched-at': '2026-11-02T06:01:00.000Z', 'x-tdn-stale': '1' }),
    }))
    await c.get('rankings', {})
    expect([...c.fetched.values()]).toEqual([
      { fetchedAt: new Date('2026-11-02T06:01:00.000Z'), stale: true, kept: true },
    ])
  })
})

describe('fetch times', () => {
  it('marks a fresh answer as fresh, and one fetched hours ago (a CDN copy) as old but not a failure', async () => {
    const at = (iso: string) => ({ get: (k: string) => (k.toLowerCase() === 'x-tdn-fetched-at' ? iso : null) })
    const answers = [new Date().toISOString(), new Date(Date.now() - 3 * 3_600_000).toISOString()]
    let n = 0
    const c = createTdnClient(async () => ({
      ok: true,
      status: 200,
      json: async () => rankings(),
      headers: at(answers[n++] ?? ''),
    }))
    await c.get('rankings', { store: 'apple' })
    await c.get('rankings', { store: 'google' })
    expect([...c.fetched.values()].map((f) => [f.stale, f.kept])).toEqual([
      [false, false],
      [true, false],
    ])
  })
})

describe('a template with no data draws a fallback chart', () => {
  it('climbers with no climbs draws the US Top Free chart, with a note', async () => {
    const climbers = liveTemplates.find((t) => t.id === 'us-climbers')
    if (!climbers) throw new Error('us-climbers')
    const c = client({
      movers: { status: 200, body: { data: [] } },
      [RANKINGS]: { status: 200, body: rankings() },
      [HISTORY]: { status: 200, body: history },
    })
    const { chart, note } = await loadWithFallback(climbers, c)
    expect(chart.templateId).toBe(FALLBACKS[0])
    expect(note).toMatch(
      /^No tracked app climbed on the US Top Free chart in the latest update\. The chart ".+" is shown instead\.$/,
    )
    expect(validateLive(chart)).toEqual([])
  })

  it('every template ends in a chart or a request error, never NoDataError, with the saved answers', async () => {
    for (const t of liveTemplates) {
      const result = await loadWithFallback(t, createTdnClient(fixtureFetch())).catch((e: unknown) => e)
      expect(result).not.toBeInstanceOf(NoDataError)
    }
  })
})

// The gallery's templates against the rules in the TechDevNotes reliability report (chart fields, 2 Nov 2026):
// enough templates, each on a field the API reliably serves, none comparing SDK counts across platforms, caveats
// in the footnote, and data-file templates that are not verified held back from the default gallery.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import saved from '../fixtures/tdn/live-2026-11-01.json' with { type: 'json' }
import { fixtureFetch, fixtureKey, fixtures } from '../fixtures/tdn/index'
import { drawLive } from '~/lib/charts/kinds'
import type { Ctx } from '~/lib/charts/render'
import { chartSizes } from '~/lib/charts/spec'
import { createTdnClient } from '~/lib/charts/tdn'
import {
  FRESH_HOURS,
  liveFootnote,
  liveTemplates,
  mapCountries,
  mapSdkKinds,
  scatterNotes,
  sortedRankings,
  validateLive,
  type LiveChart,
} from '~/lib/charts/live'

const dataIds = JSON.parse(readFileSync('public/lab/charts/data/index.json', 'utf8')) as string[]
const answers = saved as Record<string, unknown>
const savedFetch = async (url: string) => {
  const key = fixtureKey(url)
  const body = answers[key] ?? fixtures[key]
  return body === undefined
    ? { ok: false, status: 404, json: async () => ({ error: 'not saved', code: 'not_found' }) }
    : { ok: true, status: 200, json: async () => structuredClone(body) }
}
const byId = (id: string) => {
  const t = liveTemplates.find((x) => x.id === id)
  if (!t) throw new Error(id)
  return t
}
/** A canvas stand-in that keeps the text drawn on it. */
function textCtx(): Ctx & { texts: string[] } {
  const texts: string[] = []
  let font = '10px x'
  const target = {
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
      texts.push(text)
    },
  }
  return new Proxy(target, {
    get: (t, key) => (key in t ? Reflect.get(t, key) : () => ({ addColorStop() {} })),
    set: (t, key, value) => Reflect.set(t, key, value),
  }) as unknown as Ctx & { texts: string[] }
}

const words = (chart: LiveChart) => [chart.text.title, chart.text.subtitle, ...liveFootnote(chart)].join(' ')

describe('gallery templates', () => {
  it('has at least 15 templates in the default gallery, with no duplicate ids', () => {
    const shown = [...liveTemplates.map((t) => t.id), ...dataIds.filter((id) => !scatterNotes[id]?.pending)]
    expect(shown.length).toBeGreaterThanOrEqual(15)
    expect(new Set(shown).size).toBe(shown.length)
  })

  it('offers 4 sizes', () => {
    expect(chartSizes.map((s) => `${s.width}x${s.height}`)).toEqual([
      '1800x1390',
      '1920x1080',
      '1200x1200',
      '1080x1350',
    ])
  })

  it.each(liveTemplates.map((t) => t.id))('%s draws at every size with its title, source and data time', async (id) => {
    const chart = await byId(id).load(createTdnClient(savedFetch as never), {})
    for (const size of chartSizes) {
      const ctx = textCtx()
      drawLive(ctx, chart, chart.text, { width: size.width, height: size.height, icons: new Map() })
      const drawn = ctx.texts.join(' ')
      expect(drawn).toContain(chart.dataTime)
      expect(drawn).toContain('Source:')
      expect(drawn).not.toMatch(/unknown/i)
    }
  })

  it('names the field of every template, and has a note for every data file', () => {
    for (const t of liveTemplates) expect(t.field.trim().length).toBeGreaterThan(5)
    for (const id of dataIds) expect(scatterNotes[id]?.field).toBeTruthy()
  })

  it('holds back the data files whose fields are not verified', () => {
    expect(dataIds.filter((id) => scatterNotes[id]?.pending).sort()).toEqual([
      'android-native-libs',
      'android-permissions',
    ])
  })

  it('drops the iOS vs Android SDK comparison', () => {
    expect(dataIds).not.toContain('ai-apps-ios-android-sdks')
  })

  it.each(liveTemplates.map((t) => t.id))('%s loads from real answers with a measured coverage', async (id) => {
    const client = createTdnClient(savedFetch as never)
    const chart = await byId(id).load(client, {})
    expect(validateLive(chart)).toEqual([])
    expect(chart.coverage).toMatch(/\d/)
    expect(client.requested).toHaveLength(byId(id).requests)
    expect(words(chart)).not.toMatch(/unknown/i)
  })

  it('SDK charts compare one platform and say iOS counts are a floor', async () => {
    for (const id of ['most-sdks', 'most-sdks-android', 'chatgpt-sdk-kinds']) {
      const chart = await byId(id).load(createTdnClient(fixtureFetch()), {})
      if (chart.model.kind === 'leaderboard') {
        const stores = new Set(chart.model.rows.map((r) => r.app.store))
        expect(stores.size).toBe(1)
      }
      if (/iOS/.test(chart.text.title)) expect(liveFootnote(chart).join(' ')).toContain('at least')
    }
    const h2h = await byId('chatgpt-vs-gemini').load(createTdnClient(fixtureFetch()), {})
    if (h2h.model.kind !== 'head-to-head') throw new Error('kind')
    expect(h2h.model.metrics.find((m) => /SDK/.test(m.label))?.label).toBe('SDKs in the latest iOS build, at least')
  })

  it('rank charts state the top-100 limit and that a gap can be a failed run', async () => {
    for (const id of [
      'us-number-one',
      'google-number-one',
      'grossing-number-one',
      'uk-number-one',
      'ai-rank-30-days',
    ]) {
      const chart = await byId(id).load(createTdnClient(fixtureFetch()), {})
      expect(liveFootnote(chart).join(' ')).toContain('A gap: a failed run or below #100.')
    }
  })

  it('movers say a failed run skews the change', async () => {
    for (const id of ['us-climbers', 'google-climbers']) {
      const chart = await byId(id).load(createTdnClient(fixtureFetch()), {})
      expect(liveFootnote(chart).join(' ')).toContain('After a failed run it spans a longer gap.')
    }
  })

  it('ranked lists and headlines say tracked apps, not the whole chart', async () => {
    for (const id of ['us-climbers', 'google-climbers', 'ios-vs-android']) {
      const chart = await byId(id).load(createTdnClient(fixtureFetch()), {})
      expect(chart.text.subtitle).toContain('tracked')
    }
  })

  it('Google climbers are Google Play apps whose rank matches the Google answer', async () => {
    const chart = await byId('google-climbers').load(createTdnClient(savedFetch as never), {})
    if (chart.model.kind !== 'leaderboard') throw new Error('kind')
    expect(chart.model.rows.length).toBeGreaterThan(0)
    expect(chart.model.rows.every((r) => r.app.store === 'google')).toBe(true)
  })

  it('a grossing chart says rank is not revenue', async () => {
    const chart = await byId('grossing-number-one').load(createTdnClient(fixtureFetch()), {})
    expect(liveFootnote(chart).join(' ')).toContain('not revenue')
  })
})

describe('country counts leave out stale rows', () => {
  const rankings = fixtures['rankings?chart=top-free&country=us&limit=200&store=apple']
  const app = sortedRankings(rankings).find((r) => r.appId === '6473753684')
  if (!app) throw new Error('Claude fixture')
  const body = fixtures['app-rankings?chart_type=top-free&id=6473753684&store=apple'] as {
    rankings: Array<{ recordedAt: string; rank: number }>
  }

  it(`counts only ranks recorded within ${FRESH_HOURS} hours of the newest`, () => {
    const chart = mapCountries(rankings, body, app)
    const all = body.rankings.filter((r) => r.rank > 0).length
    if (chart.model.kind !== 'headline') throw new Error('kind')
    expect(Number(chart.model.answer)).toBe(all - 2)
    expect(chart.coverage).toContain('2 older rows left out')
  })

  it('in the real answer, Claude has stale rows that are left out', async () => {
    const chart = await byId('claude-countries').load(createTdnClient(savedFetch as never), {})
    expect(chart.coverage).toMatch(/[1-9]\d* older rows left out/)
  })
})

describe('SDK kinds', () => {
  const rankings = answers['rankings?chart=top-free&country=us&limit=200&store=apple']
  const app = sortedRankings(rankings).find((r) => r.name === 'ChatGPT')
  const detail = answers['tech-stack-app?id=6448311069&store=apple']

  it('draws at most 5 bars that add up to the listed SDKs, with "at least"', () => {
    if (!app) throw new Error('ChatGPT')
    const chart = mapSdkKinds(rankings, detail, app)
    if (chart.model.kind !== 'headline' || chart.model.support.type !== 'bars') throw new Error('kind')
    expect(chart.model.support.bars.length).toBeLessThanOrEqual(5)
    expect(chart.model.support.bars.reduce((n, b) => n + b.value, 0)).toBe(28)
    expect(chart.model.unit).toBe('SDKs, at least')
    expect(validateLive({ ...chart, templateId: 'x', text: { ...chart.text, source: 'x' } })).toEqual([])
  })

  it('is not shown when the answer has no SDK list', () => {
    if (!app) throw new Error('ChatGPT')
    expect(() => mapSdkKinds(rankings, { data: { techStack: { sdks: [] } } }, app)).toThrow('no analyzed SDK list')
  })
})

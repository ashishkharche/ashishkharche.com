// Apps reach a chart with a real name: no letter stand-ins, no "Unknown". An icon is drawn when it loads; an app
// without one is drawn with its name only, and a missing icon never stops a chart.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import saved from '../fixtures/tdn/live-2026-11-01.json' with { type: 'json' }
import { fixtureKey } from '../fixtures/tdn/index'
import { filterRows, type ChartConfig } from '~/lib/charts/config'
import { parseCsv } from '~/lib/charts/csv'
import { drawLive } from '~/lib/charts/kinds'
import { liveTemplates, NoDataError, realValue, type LiveChart } from '~/lib/charts/live'
import { drawChart, type Ctx } from '~/lib/charts/render'
import { createTdnClient } from '~/lib/charts/tdn'

const answers = saved as Record<string, unknown>
const APPLE = 'rankings?chart=top-free&country=us&limit=200&store=apple'

function client(change?: (key: string, body: unknown) => unknown) {
  const fetcher = async (url: string) => {
    const key = fixtureKey(url)
    let body = answers[key] === undefined ? undefined : structuredClone(answers[key])
    if (body !== undefined && change) body = change(key, body)
    return body === undefined
      ? { ok: false, status: 404, json: async () => ({ error: 'not saved', code: 'not_found' }) }
      : { ok: true, status: 200, json: async () => body }
  }
  return createTdnClient(fetcher as never)
}
const load = (id: string, options = {}, c = client()) => {
  const template = liveTemplates.find((t) => t.id === id)
  if (!template) throw new Error(id)
  return template.load(c, options)
}

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
    get(t, key) {
      if (key in t) return Reflect.get(t, key)
      return () => ({ addColorStop() {} })
    },
    set(t, key, value) {
      Reflect.set(t, key, value)
      return true
    },
  }) as unknown as Ctx & { texts: string[] }
}

const appNames = (chart: LiveChart): string[] => {
  const m = chart.model
  switch (m.kind) {
    case 'headline':
      return [m.app.name, ...m.others.map((o) => o.app.name)]
    case 'leaderboard':
      return m.rows.map((r) => r.app.name)
    case 'head-to-head':
      return m.apps.map((a) => a.name)
    case 'bump':
      return m.series.map((s) => s.app.name)
    case 'dumbbell':
      return m.rows.map((r) => r.app.name)
  }
}

describe('no letter stand-ins for app icons', () => {
  it('the chart code has no initials path left', () => {
    const files = ['src/lib/charts/kinds.ts', 'src/lib/charts/render.ts', 'src/components/ChartBuilder.tsx']
    for (const file of files) {
      const code = readFileSync(file, 'utf8')
      expect(code).not.toMatch(/initialSize|palette\.initials|'initials'|pointStyle/)
    }
  })

  it.each(liveTemplates.map((t) => t.id))('%s draws no app initial when icons are missing', async (id) => {
    const chart = await load(id)
    const ctx = textCtx()
    drawLive(ctx, chart, chart.text, { width: 1800, height: 1390, icons: new Map() })
    const names = appNames(chart).map((n) => n.trim())
    // An app whose whole name is one letter (X) is its name, not a stand-in.
    const whole = new Set(names.filter((n) => n.length === 1).map((n) => n.toUpperCase()))
    const initials = new Set(names.filter((n) => n.length > 1).map((n) => n[0]?.toUpperCase()))
    expect(
      ctx.texts.filter((t) => t.length === 1 && initials.has(t.toUpperCase()) && !whole.has(t.toUpperCase())),
    ).toEqual([])
  })

  it('scatter charts draw no initial without the icon sprite', () => {
    const dir = 'public/lab/charts/data/'
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.csv'))) {
      const config = JSON.parse(readFileSync(dir + file.replace('.csv', '.json'), 'utf8')) as ChartConfig
      const rows = parseCsv(readFileSync(dir + file, 'utf8')).rows
      const ctx = textCtx()
      drawChart(ctx, config, rows, { width: 1800, height: 1390, source: config.source_default ?? '' })
      expect(ctx.texts.filter((t) => /^\p{Lu}$/u.test(t))).toEqual([])
    }
  })
})

describe('no "Unknown" anywhere', () => {
  it('realValue rejects stand-ins', () => {
    for (const v of ['', ' ', 'Unknown', 'unknown', 'N/A', 'null', '-', '?', null, undefined]) {
      expect(realValue(v)).toBe(false)
    }
    expect(realValue('Meta Platforms, Inc.')).toBe(true)
  })

  it.each(liveTemplates.map((t) => t.id))('%s renders no "Unknown", even when an answer has one', async (id) => {
    // Rename the 2nd US app and the top tech-stack build to "Unknown".
    const c = client((key, body) => {
      const data = (body as { data?: Array<Record<string, unknown>> }).data
      if (key === APPLE && Array.isArray(data)) {
        // The highest-ranked app after #1 that is not an AI app (the saved answers hold no history for a 5th one).
        const sorted = [...data].sort((a, b) => Number(a.rank) - Number(b.rank))
        const next = sorted.slice(1).find((r) => !/chatgpt|gemini|claude|grok|perplexity|copilot/i.test(String(r.name)))
        if (next) next.name = 'Unknown'
      }
      if (key.startsWith('tech-stack') && Array.isArray(data)) {
        const top = [...data].sort((a, b) => Number(b.sdkCount) - Number(a.sdkCount))[0]
        if (top) top.appName = 'Unknown'
      }
      return body
    })
    // A chart about the renamed app is not shown at all; any other chart leaves the app out.
    const chart = await load(id, {}, c).catch((error: unknown) => {
      expect(error).toBeInstanceOf(NoDataError)
      return null
    })
    if (!chart) return
    const ctx = textCtx()
    drawLive(ctx, chart, chart.text, { width: 1800, height: 1390 })
    expect(ctx.texts.filter((t) => /^\s*unknown\s*$/i.test(t))).toEqual([])
    expect(appNames(chart).filter((n) => !realValue(n))).toEqual([])
  })

  it('scatter rows without a real name or an icon cell are dropped', () => {
    const config = { name_column: 'app', icon_column: 'icon' } as ChartConfig
    const rows = [
      { app: 'ChatGPT', icon: '0' },
      { app: 'Unknown', icon: '1' },
      { app: '', icon: '2' },
      { app: 'Claude', icon: '' },
    ]
    expect(filterRows(rows, config).map((r) => r.app)).toEqual(['ChatGPT'])
  })
})

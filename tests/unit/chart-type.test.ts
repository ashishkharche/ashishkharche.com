import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ChartConfig } from '~/lib/charts/config'
import { parseCsv } from '~/lib/charts/csv'
import { drawLive } from '~/lib/charts/kinds'
import { liveTemplates } from '~/lib/charts/live'
import { drawChart, type Ctx } from '~/lib/charts/render'
import { createTdnClient } from '~/lib/charts/tdn'
import { CHART_FAMILIES, CHART_SIZES, CHART_WEIGHTS } from '~/lib/charts/type'
import { fixtureFetch } from '../fixtures/tdn/index.ts'

/**
 * Every renderer may only use the chart type scale: four sizes (scaled with the chart), weights 400 and 500, and
 * Geist or Geist Serif. The context records the font of every fillText call.
 */
function recordingCtx(): Ctx & { fonts: string[] } {
  const fonts: string[] = []
  let font = '10px x'
  const target = {
    fonts,
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
        fontBoundingBoxAscent: size * 0.97,
        fontBoundingBoxDescent: size * 0.24,
      }
    },
    fillText() {
      fonts.push(font)
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
  }) as unknown as Ctx & { fonts: string[] }
}

const SIZES = [
  [1800, 1390],
  [1920, 1080],
  [1200, 1200],
] as const
const scale = (w: number, h: number) => Math.min(w / 1800, h / 1390)

type Font = { weight: number; size: number; family: string }
function parse(font: string, s: number): Font {
  const m = /^(?:(\d{3}) )?(\d+(?:\.\d+)?)px "?([^",]+)"?/.exec(font)
  if (!m) throw new Error(`unreadable font ${font}`)
  return { weight: Number(m[1] ?? 400), size: Math.round((Number(m[2]) / s) * 100) / 100, family: m[3] as string }
}

const dir = new URL('../../public/lab/charts/data/', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, dir), 'utf8')
const scatterIds = JSON.parse(read('index.json')) as string[]

async function allFonts(): Promise<Map<string, Font[]>> {
  const out = new Map<string, Font[]>()
  const client = createTdnClient(fixtureFetch())
  for (const template of liveTemplates) {
    const chart = await template.load(client, {})
    const fonts: Font[] = []
    for (const [width, height] of SIZES) {
      const ctx = recordingCtx()
      drawLive(ctx, chart, chart.text, { width, height })
      fonts.push(...ctx.fonts.map((f) => parse(f, scale(width, height))))
    }
    out.set(template.id, fonts)
  }
  for (const id of scatterIds) {
    const config = JSON.parse(read(`${id}.json`)) as ChartConfig
    const rows = parseCsv(read(`${id}.csv`)).rows
    const fonts: Font[] = []
    for (const [width, height] of SIZES) {
      const ctx = recordingCtx()
      drawChart(ctx, config, rows, { width, height, source: config.source_default ?? '' })
      fonts.push(...ctx.fonts.map((f) => parse(f, scale(width, height))))
    }
    out.set(id, fonts)
  }
  return out
}

describe('chart type scale', () => {
  it('has four sizes and two weights', () => {
    expect(Object.keys(CHART_SIZES)).toHaveLength(4)
    expect(Object.values(CHART_WEIGHTS).sort()).toEqual([400, 500])
  })
  it('every renderer uses only the scale', async () => {
    const sizes = new Set<number>(Object.values(CHART_SIZES))
    const weights = new Set<number>(Object.values(CHART_WEIGHTS))
    const families = new Set<string>(Object.values(CHART_FAMILIES))
    const all = await allFonts()
    const seen = { sizes: new Set<number>(), weights: new Set<number>(), families: new Set<string>() }
    for (const [id, fonts] of all) {
      expect(fonts.length, id).toBeGreaterThan(0)
      for (const font of fonts) {
        expect(sizes.has(font.size), `${id} size ${font.size}`).toBe(true)
        expect(weights.has(font.weight), `${id} weight ${font.weight}`).toBe(true)
        expect(families.has(font.family), `${id} family ${font.family}`).toBe(true)
        seen.sizes.add(font.size)
        seen.weights.add(font.weight)
        seen.families.add(font.family)
      }
      expect(new Set(fonts.map((f) => f.size)).size, id).toBeLessThanOrEqual(4)
    }
    const report = process.env.TYPE_REPORT
    if (report)
      writeFileSync(
        report,
        JSON.stringify({
          sizes: [...seen.sizes].sort((a, b) => a - b),
          weights: [...seen.weights],
          families: [...seen.families],
        }),
      )
  })
})

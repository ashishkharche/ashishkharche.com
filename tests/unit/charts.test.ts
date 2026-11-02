import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  type ChartConfig,
  type Row,
  composeLabel,
  fill,
  filterRows,
  footnoteLines,
  labelRows,
  labelValues,
  monthYear,
  shortName,
  staleRows,
  toNumber,
  validate,
} from '~/lib/charts/config'
import { parseCsv, toCsv } from '~/lib/charts/csv'
import { createLocalSource } from '~/lib/charts/data'
import { ChartRuleError, type Ctx, autoAxis, drawChart, drawOrder, layout, niceTicks, snap } from '~/lib/charts/render'
import { chartSizes, fileName, fitsX } from '~/lib/charts/spec'

const dir = new URL('../../public/lab/charts/data/', import.meta.url)
const read = (name: string) => readFileSync(new URL(name, dir), 'utf8')
const ids = JSON.parse(read('index.json')) as string[]
const load = (id: string) => ({
  config: JSON.parse(read(`${id}.json`)) as ChartConfig,
  rows: parseCsv(read(`${id}.csv`)).rows,
})
const source = (config: ChartConfig) => config.source_default ?? ''

/** A context that records calls and measures text as 0.5 em per character. */
function fakeCtx(): Ctx & { calls: string[] } {
  const calls: string[] = []
  let font = '10px x'
  const target = {
    calls,
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
  }
  return new Proxy(target, {
    get(t, key) {
      if (key in t) return Reflect.get(t, key)
      return (...args: unknown[]) => {
        calls.push(String(key))
        return args.length ? undefined : undefined
      }
    },
    set(t, key, value) {
      if (key === 'font') font = value as string
      return true
    },
  }) as unknown as Ctx & { calls: string[] }
}

describe('csv', () => {
  it('reads quoted cells with commas, quotes and new lines', () => {
    const table = parseCsv('name,note\n"A, Inc.","He said ""hi""\nthen left"\nB,plain\n')
    expect(table.columns).toEqual(['name', 'note'])
    expect(table.rows).toEqual([
      { name: 'A, Inc.', note: 'He said "hi"\nthen left' },
      { name: 'B', note: 'plain' },
    ])
  })
  it('round-trips through toCsv', () => {
    const rows = [{ a: 'x,y', b: 2 }]
    expect(parseCsv(toCsv(['a', 'b'], rows)).rows).toEqual([{ a: 'x,y', b: '2' }])
  })
})

describe('config helpers', () => {
  it('reads numbers strictly', () => {
    expect(toNumber('4.0')).toBe(4)
    expect(toNumber('')).toBeNaN()
    expect(toNumber('12 apps')).toBeNaN()
  })
  it('fills templates like Python format', () => {
    expect(fill('{app}: #{rank}', { app: 'Uber', rank: '3.0' })).toBe('Uber: #3')
    expect(fill('built {date:%b %Y}', { date: '2026-06-19' })).toBe('built Jun 2026')
    expect(fill('{missing}', {})).toBe('{missing}')
    expect(monthYear('2026-11-01')).toBe('Nov 2026')
  })
  it('picks labelled rows by match or by the top values', () => {
    const rows: Row[] = [
      { app: 'A', n: '3' },
      { app: 'B', n: '9' },
      { app: 'C', n: '5' },
    ]
    expect(labelRows(rows, { match: { app: 'C' }, text: '' }).map((r) => r.app)).toEqual(['C'])
    expect(labelRows(rows, { top_by: 'n', n: 2, text: '' }).map((r) => r.app)).toEqual(['B', 'C'])
    expect(labelRows(rows, { top_by: 'n', skip: 1, n: 1, text: '' }).map((r) => r.app)).toEqual(['C'])
  })
  it('finds stale rows from the dates and the allowed age', () => {
    const config = {
      staleness: { as_of: '2026-11-01', max_age_days: 30, date_fields: { built: '{name}: built {date:%b %Y}' } },
    } as unknown as ChartConfig
    const notes = staleRows(
      [
        { app: 'Old', built: '2026-06-19' },
        { app: 'New', built: '2026-10-20' },
      ],
      config,
    )
    expect(notes.map((n) => n.text)).toEqual(['Old: built Jun 2026'])
  })
})

describe('point labels', () => {
  const fields = {
    us_rank: { name: 'US rank', format: 'US #{us_rank}' },
    countries_charted: { name: 'Countries', format: '{countries_charted} countries' },
  }
  it('builds the label from the columns it shows', () => {
    const label = { show: ['us_rank', 'countries_charted'] }
    expect(composeLabel(label, { label_fields: fields })).toBe(
      '{short_name}: US #{us_rank}, {countries_charted} countries',
    )
    expect(composeLabel({ ...label, stack: true }, { label_fields: fields })).toBe(
      '{short_name}\nUS #{us_rank}, {countries_charted} countries',
    )
    expect(composeLabel({ ...label, hide_name: true }, { label_fields: fields })).toBe(
      'US #{us_rank}, {countries_charted} countries',
    )
    expect(composeLabel({ show: ['nope'] }, { label_fields: fields })).toBe('{short_name}')
  })
  it('shortens app names to the part before the store subtitle', () => {
    expect(shortName('Kimi - Your Personal AI Agent')).toBe('Kimi')
    expect(shortName('Spotify: Music and Podcasts')).toBe('Spotify')
    expect(shortName('Muse from Meta')).toBe('Muse from Meta')
  })
  it('reads like the data: "ChatGPT: US #3, 169 countries"', () => {
    const { config, rows } = load('us-rank-countries')
    const row = rows.find((r) => r.app === 'ChatGPT') as Row
    const text = composeLabel({ show: ['us_rank', 'countries_charted'] }, config)
    expect(fill(text, labelValues(row, config))).toBe('ChatGPT: US #3, 169 countries')
  })
})

describe('template words', () => {
  const all = ids.map((id) => ({ id, ...load(id) }))
  // Every number on a chart has to be in the data files: a cell, the snapshot date, or the
  // definitions that ship with the data (selection, method and the stale-build age).
  const known = new Set<string>()
  const numbers = (text: string) => text.match(/\d+(?:\.\d+)?/g) ?? []
  for (const { config, rows } of all) {
    for (const row of rows) for (const cell of Object.values(row)) numbers(cell).forEach((n) => known.add(n))
    for (const text of [
      config.selection,
      config.method,
      config.template?.date ?? '',
      String(config.staleness?.max_age_days ?? ''),
    ])
      numbers(text).forEach((n) => known.add(n))
  }
  known.add('1') // "1 Nov 2026", the snapshot date

  for (const { id, config, rows } of all) {
    const shown = filterRows(rows, config)
    const foot = footnoteLines(shown, config, source(config))
    const labels = (config.labels ?? []).flatMap((l) =>
      labelRows(shown, l).map((r) => fill(l.text, labelValues(r, config))),
    )
    const visible = [
      config.title,
      config.subtitle ?? '',
      ...foot,
      ...labels,
      config.template?.name ?? '',
      config.template?.sample ?? '',
    ]

    it(`${id} lists the number of points it draws`, () => {
      expect(Number.parseInt(config.template?.sample ?? '', 10)).toBe(shown.length)
      expect(config.template?.source_short).toBeTruthy()
    })
    it(`${id} has only numbers from the data`, () => {
      const unknown = visible.flatMap(numbers).filter((n) => !known.has(n))
      expect(unknown).toEqual([])
    })
    it(`${id} states what is measured, with short footnotes`, () => {
      expect(config.title).not.toMatch(/[?!]/)
      expect(config.title).toMatch(/ vs /)
      for (const line of foot) expect(line.length).toBeLessThanOrEqual(110)
      expect(visible.join(' ')).not.toMatch(/[\u2013\u2014]|\bI built\b/)
    })
    it(`${id} labels follow what they show`, () => {
      for (const label of config.labels ?? []) {
        if (label.show) expect(label.text).toBe(composeLabel(label, config))
      }
    })
  }
  it('says how few countries Muse from Meta is on sale in, from the data', () => {
    const muse = load('us-rank-countries').rows.find((r) => r.app === 'Muse from Meta')
    expect(muse?.storefronts_available).toBe('5')
    for (const id of ['us-rank-countries', 'us-rating-countries']) {
      expect(load(id).config.footnote.join(' ')).toContain('on sale in only 5 countries')
    }
  })
})

describe('templates', () => {
  it('has the data-file charts, without the iOS vs Android SDK comparison', () => {
    expect(ids).toEqual(['us-rank-countries', 'android-permissions', 'android-native-libs', 'us-rating-countries'])
  })
  for (const id of ids) {
    it(`${id} passes the data rules and states its date and source`, () => {
      const { config, rows } = load(id)
      expect(validate(config, rows, source(config))).toEqual([])
      expect(config.template?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(config.template?.source).toBeTruthy()
      const foot = footnoteLines(rows, config, source(config))
      expect(foot).toHaveLength(3)
      expect(foot[0]).toMatch(/^Source: /)
      expect(foot.join(' ')).not.toMatch(/[\u2013\u2014]/)
    })
    it(`${id} draws on a canvas`, () => {
      const { config, rows } = load(id)
      const ctx = fakeCtx()
      drawChart(ctx, config, rows, { width: 1800, height: 1390, source: source(config) })
      expect(ctx.calls).toContain('fillText')
    })
  }
})

describe('data rules', () => {
  const base = () => load('us-rank-countries')
  const errors = (change: (c: ChartConfig) => void, src?: string) => {
    const { config, rows } = base()
    change(config)
    return validate(config, rows, src ?? source(config)).join('\n')
  }
  it('needs exactly three footnote lines', () => {
    expect(errors((c) => c.footnote.pop())).toContain('exactly 3 lines')
    expect(errors((c) => c.footnote.push('More'))).toContain('exactly 3 lines')
  })
  it('needs the first footnote line to start with Source:', () => {
    expect(errors((c) => (c.footnote[0] = 'Data: somewhere'))).toContain('must start with "Source:"')
    expect(errors(() => undefined, ' ')).toContain('Say where the data comes from')
  })
  it('allows no brand mark, watermark, site name or web address', () => {
    expect(errors((c) => Object.assign(c, { watermark: 'x' }))).toContain('no brand or watermark')
    expect(errors((c) => (c.subtitle = 'More at example.com'))).toContain('No site name or web address')
    expect(errors((c) => (c.title = 'By Ashish Kharche'))).toContain('No site name')
  })
  it('shows coverage next to every rank', () => {
    const message = errors((c) => {
      c.y.field = 'storefronts_available'
      c.metrics.storefronts_available = {
        kind: 'count',
        meaning: 'Countries where it is on sale',
        biases: [{ text: 'Apple lookup' }],
      }
      for (const l of c.labels ?? []) l.text = '{app}: #{us_rank} in the US'
    })
    expect(message).toContain('Coverage (countries_charted) must be on an axis or in every label')
  })
  it('needs a rule for unranked countries and states any stand-in rank', () => {
    expect(errors((c) => delete (c.rank_rules as { unranked_policy?: string }).unranked_policy)).toContain(
      'rule for unranked countries',
    )
    expect(errors((c) => Object.assign(c.rank_rules ?? {}, { unranked_value: 101 }))).toContain(
      'counted as 101; the footnote must say so',
    )
  })
  it('never averages ranks over the charted countries only', () => {
    const message = errors((c) => {
      c.y.field = 'avg_rank'
      c.metrics.avg_rank = {
        kind: 'rank_aggregate',
        aggregate: 'mean',
        meaning: 'Average rank',
        biases: [{ text: 'x' }],
      }
    })
    expect(message).toContain('ranks cannot be averaged over only the countries where an app charts')
    expect(message).toContain('the footnote must explain how the ranks were combined')
  })
  it('refuses fields without a meaning and biases, and fields marked not to plot', () => {
    expect(errors((c) => (c.x.field = 'storefronts_available'))).toContain('has no description')
    expect(errors((c) => (c.x.field = 'x_DO_NOT_PLOT'))).toContain('not to be plotted')
  })
  it('keeps lower-bound and other on-chart caveats visible', () => {
    const { config, rows } = load('android-permissions')
    const shown = Object.values(config.metrics)
      .flatMap((m) => m.biases)
      .find((b) => b.show_on_chart && b.chart_text && b.shown_by !== 'staleness')
    const caveat = shown?.chart_text ?? ''
    expect(caveat).toBeTruthy()
    for (const l of config.labels ?? []) l.text = l.text.replaceAll(caveat, '')
    config.footnote = config.footnote.map((line) => line.replaceAll(caveat, ''))
    config.subtitle = (config.subtitle ?? '').replaceAll(caveat, '')
    expect(validate(config, rows, source(config)).join('\n')).toContain(`must say "${caveat}"`)
  })
  it('marks stale rows and dated fields', () => {
    const { config, rows } = load('android-native-libs')
    expect(staleRows(rows, config).length).toBeGreaterThan(0)
    const noMark = structuredClone(config)
    Object.assign(noMark.staleness ?? {}, { annotate: false })
    expect(validate(noMark, rows, source(config)).join('\n')).toContain('out of date and are not marked')
    const noStaleness = structuredClone(config)
    delete noStaleness.staleness
    expect(validate(noStaleness, rows, source(config)).join('\n')).toContain('so stale rows must be shown')
  })
  it('refuses label fields that are not in the data', () => {
    expect(errors((c) => Object.assign(c.labels?.[0] ?? {}, { text: '{app} {nope} {countries_charted}' }))).toContain(
      '{nope}',
    )
  })
  it('stops drawChart before it draws', () => {
    const { config, rows } = base()
    config.footnote = ['Only one line']
    const ctx = fakeCtx()
    expect(() => drawChart(ctx, config, rows, { width: 1800, height: 1390, source: 'x' })).toThrow(ChartRuleError)
    expect(ctx.calls).toEqual([])
  })
})

describe('layout and axes', () => {
  it('keeps the original positions at 1800 x 1390 and scales for other sizes', () => {
    const { config } = load('us-rank-countries')
    const L = layout(config, 1800, 1390)
    expect(L.s).toBe(1)
    expect(L.plot.left).toBeCloseTo(216)
    expect(L.plot.bottom).toBeCloseTo(1390 - 0.215 * 1390)
    const wide = layout(config, 1920, 1080)
    expect(wide.s).toBeCloseTo(1080 / 1390)
    expect(wide.footY.at(-1)).toBeCloseTo(1080 - 0.025 * 1390 * wide.s)
    expect(wide.plot.top).toBeLessThan(wide.plot.bottom)
  })
  it('picks round ticks', () => {
    expect(niceTicks(0, 100)).toEqual([0, 25, 50, 75, 100])
    expect(niceTicks(3.9, 5)).toEqual([4, 4.5, 5])
    const axis = autoAxis([29, 58])
    expect(axis.min).toBeLessThan(29)
    expect(axis.max).toBeGreaterThan(58)
  })
  it('snaps odd line widths to pixel centres', () => {
    expect(snap(10.2, 1)).toBe(10.5)
    expect(snap(10.7, 2)).toBe(11)
  })
  it('draws highlighted points last', () => {
    const { config, rows } = load('us-rank-countries')
    expect(
      drawOrder(
        rows.filter((r) => r.us_rank),
        config,
      ).at(-1)?.app,
    ).toBe('Muse from Meta')
  })
})

describe('sizes and file names', () => {
  it('only offers sizes X shows in full', () => {
    for (const size of chartSizes) expect(fitsX(size)).toBe(true)
    expect(fitsX({ width: 2100, height: 1000 })).toBe(false)
    expect(fitsX({ width: 900, height: 1300 })).toBe(false)
  })
  it('names files from the title, size and scale', () => {
    expect(fileName("A top US rank doesn't mean much", { width: 1800, height: 1390 }, 2, 'png')).toBe(
      'a-top-us-rank-doesn-t-mean-much-3600x2780.png',
    )
  })
})

describe('local data source', () => {
  it('lists the templates and loads one', async () => {
    const fetcher = async (url: string) => new Response(read(url.replace('/data/', '')))
    const src = createLocalSource('/data/', fetcher)
    const list = await src.listTemplates()
    expect(list.map((t) => t.id)).toEqual(ids)
    expect(list.every((t) => t.date && t.source && t.sample && t.sourceShort)).toBe(true)
    const template = await src.loadTemplate('android-permissions')
    expect(template.rows.length).toBeGreaterThan(10)
    expect(template.iconSprite).toBe('/data/android-permissions-icons.webp')
    await expect(src.loadTemplate('../secret')).rejects.toThrow('Unknown template')
  })
})

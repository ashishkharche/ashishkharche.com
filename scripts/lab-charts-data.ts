// Copies the chart builder's datasets into public/lab/charts/data/ from a local
// chart folder laid out as charts/<name>/{config.json,data.csv} plus icons/.
//
//   node scripts/lab-charts-data.ts <folder> <source name>
//
// <source name> is the data source's name as it appears in the configs. The
// site does not name the source, so the script rewrites text that does, and
// fails if the name is still there afterwards.
//
// For each chart it writes:
//   <id>.json        the chart config, with the data source's name taken out of
//                    the text (the footnote's Source line becomes "{source}", filled in on the page)
//   <id>.csv         the rows, without links or file paths; `icon` is the row's place in the sprite
//   <id>-icons.webp  the app icons, 128 px each, 10 to a row
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { findBanned } from '../src/content/rules.ts'
import { parseCsv, toCsv } from '../src/lib/charts/csv.ts'
import { ICON_CELL, ICON_COLUMNS } from '../src/lib/charts/data.ts'
import { applyCopy } from './lab-charts-copy.ts'

const [folder, source] = process.argv.slice(2)
if (!folder || !source) {
  console.error('Usage: node scripts/lab-charts-data.ts <folder> <source name>')
  process.exit(1)
}
const out = new URL('../public/lab/charts/data/', import.meta.url).pathname

/** Site ids for the chart folders. */
const ids: Record<string, string> = {
  g1_android_permissions: 'android-permissions',
  g2_us_rank_vs_countries: 'us-rank-countries',
  g3_ai_apps_ios_vs_android_sdks: 'ai-apps-ios-android-sdks',
}

/** Columns that hold links, file paths or provenance, which the page does not need. */
const dropColumns = new Set(['url', 'app_page', 'source', 'ios_source', 'android_source', 'app_id', 'fetched', 'icon'])

// Rewrites for text that names the data source. NAME stands for the source name.
const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const sourceName = new RegExp(escaped.replace(/\s+/g, '\\s*'), 'i')
const rule = (pattern: string, replacement: string, flags = 'g'): [RegExp, string] => [
  new RegExp(pattern.replaceAll('NAME', escaped), flags),
  replacement,
]
const rewrites: Array<[RegExp, string]> = [
  rule('^Source: NAME data,', 'Source: {source},', ''),
  rule(' with NAME data\\)', ' with data)'),
  rule('in every Android build NAME has analyzed', 'in every analyzed Android build'),
  rule('SDKs NAME detected', 'SDKs detected'),
  rule("NAME' (set|analyzed set|latest collection|collected data)", "the source's $1"),
  rule('NAME marks', 'The source marks'),
  rule("\\bTDN's\\b", "the source's"),
  rule('NAME-tracked', 'tracked'),
  rule('an analyzed NAME tech stack', 'an analyzed tech stack'),
  rule(' on NAME', ''),
  rule("NAME'", "the source's"),
  rule('NAME', 'the source'),
  rule('\\s*\\((?:sitemaps/tech-stacks\\.xml|/app-store-rankings|/tech-stack)\\)', ''),
  [/[\u2013\u2014]/g, '-'],
]
function clean(text: string): string {
  let result = text
  for (const [pattern, replacement] of rewrites) result = result.replace(pattern, replacement)
  return result
}
function cleanAll<T>(value: T): T {
  if (typeof value === 'string') return clean(value) as T
  if (Array.isArray(value)) return value.map(cleanAll) as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanAll(v)])) as T
  }
  return value
}

interface Label {
  match?: Record<string, string>
  [key: string]: unknown
}

await mkdir(out, { recursive: true })
const problems: string[] = []
for (const name of (await readdir(join(folder, 'charts'))).sort()) {
  const id = ids[name]
  const dir = join(folder, 'charts', name)
  if (!id || !existsSync(join(dir, 'config.json'))) continue
  const config = JSON.parse(await readFile(join(dir, 'config.json'), 'utf8')) as Record<string, unknown>
  const table = parseCsv(await readFile(join(dir, String(config.data ?? 'data.csv')), 'utf8'))
  const nameColumn = String(config.name_column ?? 'app')

  // Labels that pick a row by a dropped column pick it by name instead.
  for (const label of (config.labels as Label[] | undefined) ?? []) {
    if (!label.match) continue
    const dropped = Object.keys(label.match).some((key) => dropColumns.has(key))
    if (!dropped) continue
    const hits = table.rows.filter((row) => Object.entries(label.match ?? {}).every(([k, v]) => row[k] === String(v)))
    if (hits.length !== 1)
      problems.push(`${name}: label match ${JSON.stringify(label.match)} finds ${hits.length} rows`)
    label.match = { [nameColumn]: hits[0]?.[nameColumn] ?? '' }
  }

  // Titles, footnotes, labels and the list entry come from scripts/lab-charts-copy.ts.
  const site = applyCopy(
    id,
    cleanAll({ ...config, id, name: undefined, output: undefined, data: undefined, template: { date: '2026-11-01' } }),
  )
  const json = `${JSON.stringify(site, null, 2)}\n`

  const iconRows = table.rows.map((row) => (row.icon && existsSync(join(folder, row.icon)) ? row.icon : ''))
  let next = 0
  const iconIndex = iconRows.map((file) => (file ? next++ : -1))
  const columns = table.columns.filter((c) => !dropColumns.has(c))
  const rows = table.rows.map((row, i) => ({
    ...Object.fromEntries(columns.map((c) => [c, clean(row[c] ?? '')])),
    icon: iconIndex[i] === -1 ? '' : String(iconIndex[i]),
  }))
  const csv = toCsv([...columns, 'icon'], rows)

  for (const [file, text] of [
    [`${id}.json`, json],
    [`${id}.csv`, csv],
  ] as const) {
    for (const hit of findBanned(text)) problems.push(`${file}: ${hit}`)
    if (sourceName.test(text)) problems.push(`${file}: still names the data source`)
    await writeFile(join(out, file), text)
  }

  const files = iconRows.filter(Boolean)
  const cells = await Promise.all(
    files.map(async (file, i) => ({
      input: await sharp(join(folder, file)).resize(ICON_CELL, ICON_CELL, { kernel: 'lanczos3' }).png().toBuffer(),
      left: (i % ICON_COLUMNS) * ICON_CELL,
      top: Math.floor(i / ICON_COLUMNS) * ICON_CELL,
    })),
  )
  if (cells.length) {
    await sharp({
      create: {
        width: Math.min(cells.length, ICON_COLUMNS) * ICON_CELL,
        height: Math.ceil(cells.length / ICON_COLUMNS) * ICON_CELL,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(cells)
      .webp({ quality: 90, alphaQuality: 100, effort: 6 })
      .toFile(join(out, `${id}-icons.webp`))
  }
  console.log(`${id}: ${rows.length} rows, ${cells.length} icons`)
}

// ---------------------------------------------------------------- extra templates
// Built only from the CSV files in <folder>/data (the first build of the X charts).
const MONTH: Record<string, string> = {
  Jan: '01',
  Feb: '02',
  Mar: '03',
  Apr: '04',
  May: '05',
  Jun: '06',
  Jul: '07',
  Aug: '08',
  Sep: '09',
  Oct: '10',
  Nov: '11',
  Dec: '12',
}
const isoDate = (text: string) => {
  const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4})$/.exec(text)
  return m ? `${m[3]}-${MONTH[m[1] ?? ''] ?? '01'}-${(m[2] ?? '').padStart(2, '0')}` : text
}
const iconPath = (url: string, suffix = /\/tech-stack$/) =>
  `raw/icons/${new URL(url).pathname
    .replace(suffix, '')
    .replace(/^\/|\/$/g, '')
    .replaceAll('/', '_')}.png`

interface Extra {
  id: string
  file: string
  columns: Record<string, (row: Row) => string>
  icon: (row: Row) => string
  config: Record<string, unknown>
}
type Row = Record<string, string>

const extras: Extra[] = [
  {
    id: 'android-native-libs',
    file: 'g1_android_sdks_vs_permissions.csv',
    columns: {
      name: (r) => r.name ?? '',
      sdks: (r) => r.sdks ?? '',
      native_libs: (r) => r.native_libs ?? '',
      permissions: (r) => r.permissions ?? '',
      analyzed: (r) => isoDate(r.analyzed ?? ''),
    },
    icon: (r) => iconPath(r.url ?? ''),
    config: {
      selection:
        'The 80 Android builds with the most third-party SDKs (31 or more) in the analyzed set, latest build each, as listed on 1 Nov 2026.',
      method:
        'native_libs = native libraries (.so files) listed for the build. sdks = third-party SDKs detected in the same build. One point per app.',
      name_column: 'name',
      icon_column: 'icon',
      icon_px: 52,
      highlight_icon_px: 80,
      x: {
        field: 'sdks',
        label: 'Third-party SDKs detected in the build',
        min: 29,
        max: 58,
        ticks: [30, 35, 40, 45, 50, 55],
      },
      y: { field: 'native_libs', label: 'Native libraries in the build', min: -8, max: 180, ticks: [0, 50, 100, 150] },
      metrics: {
        native_libs: {
          kind: 'count',
          date_field: 'analyzed',
          meaning: 'Native libraries (.so files) bundled in the analyzed Android build.',
          biases: [
            {
              text: 'A count of files, not their size or what they do.',
              show_on_chart: true,
              chart_text: 'not their size',
            },
            {
              text: 'Most builds were analyzed in Jun 2026; current versions may differ.',
              show_on_chart: true,
              shown_by: 'staleness',
            },
          ],
        },
        sdks: {
          kind: 'count',
          date_field: 'analyzed',
          meaning: 'Third-party SDKs detected in the same build.',
          biases: [
            {
              text: 'Detection can be a lower bound, and this list only has the 80 builds with the most SDKs.',
              show_on_chart: true,
              chart_text: 'lower bound',
            },
          ],
        },
      },
      staleness: {
        as_of: '2026-11-01',
        max_age_days: 60,
        annotate: 'footnote',
        key: 'name',
        date_fields: { analyzed: '{name}: build {date:%b %Y}' },
      },
      labels: [
        {
          top_by: 'native_libs',
          n: 1,
          highlight: true,
          ha: 'left',
          // Up a little, clear of the second label (CapCut is 4 below).
          offset: [44, 14],
        },
        {
          top_by: 'native_libs',
          skip: 1,
          n: 2,
          ha: 'left',
          offset: [32, -16],
          size: 22,
          weight: 'Medium',
        },
      ],
      layout: { axes: [0.12, 0.215, 0.82, 0.61], foot_y: 0.025, foot_step: 0.0225 },
    },
  },
  {
    id: 'us-rating-countries',
    file: 'g2_us_rank_vs_countries.csv',
    columns: {
      app: (r) => r.app ?? '',
      rating: (r) => r.rating ?? '',
      countries_charted: (r) => r.countries_ranked ?? '',
      us_rank: (r) => r.us_rank ?? '',
      reviews: (r) => r.reviews ?? '',
    },
    icon: (r) => iconPath(r.app_page ?? '', /$^/),
    config: {
      selection: 'The 30 tracked iOS apps in the US App Store Top Free 100 on 1 Nov 2026. Not the full chart.',
      method:
        "rating = the app's US App Store rating. countries_charted = App Store countries where the app is in the Top Free 100. No ranks are averaged.",
      name_column: 'app',
      icon_column: 'icon',
      icon_px: 60,
      highlight_icon_px: 86,
      x: { field: 'rating', label: 'US App Store rating', min: 3.9, max: 5.0, ticks: [4.0, 4.2, 4.4, 4.6, 4.8, 5.0] },
      y: {
        field: 'countries_charted',
        label: 'Countries in the Top Free 100',
        min: -10,
        max: 190,
        ticks: [0, 50, 100, 150],
      },
      metrics: {
        rating: {
          kind: 'rating',
          meaning: 'Average star rating on the US App Store.',
          biases: [
            {
              text: 'US ratings only; other countries can differ.',
              show_on_chart: true,
              chart_text: 'US ratings only',
            },
            {
              text: 'A rating says nothing about how many people use the app.',
              show_on_chart: true,
              chart_text: 'not how many people',
            },
          ],
        },
        countries_charted: {
          kind: 'coverage',
          meaning: 'App Store countries where the app is in the Top Free 100.',
          biases: [
            {
              text: 'An app can only chart where it is sold: Muse from Meta is on sale in a few countries only.',
              show_on_chart: true,
              chart_text: 'limited launch',
            },
            {
              text: 'Single snapshot (1 Nov 2026); ranks move daily.',
              show_on_chart: true,
              chart_text: 'single snapshot',
            },
          ],
        },
      },
      labels: [
        {
          match: { app: 'Telegram Messenger' },
          highlight: true,
          ha: 'left',
          offset: [46, 0],
        },
        {
          match: { app: 'Muse from Meta' },
          highlight: true,
          ha: 'right',
          offset: [-48, 4],
        },
      ],
      layout: { axes: [0.12, 0.215, 0.82, 0.61], foot_y: 0.025, foot_step: 0.0225 },
    },
  },
]

for (const extra of extras) {
  const table = parseCsv(await readFile(join(folder, 'data', extra.file), 'utf8'))
  const iconFiles = table.rows.map((row) => {
    const file = extra.icon(row)
    return existsSync(join(folder, file)) ? file : ''
  })
  let next = 0
  const iconIndex = iconFiles.map((file) => (file ? next++ : -1))
  const names = [...Object.keys(extra.columns), 'icon']
  const rows = table.rows.map((row, i) => ({
    ...Object.fromEntries(Object.entries(extra.columns).map(([k, get]) => [k, clean(get(row))])),
    icon: iconIndex[i] === -1 ? '' : String(iconIndex[i]),
  }))
  const config = applyCopy(extra.id, {
    id: extra.id,
    size: [1800, 1390],
    ...extra.config,
    template: { date: '2026-11-01', extra: true },
  })
  const json = `${JSON.stringify(config, null, 2)}\n`
  const csv = toCsv(names, rows)
  for (const [file, text] of [
    [`${extra.id}.json`, json],
    [`${extra.id}.csv`, csv],
  ] as const) {
    for (const hit of findBanned(text)) problems.push(`${file}: ${hit}`)
    if (sourceName.test(text)) problems.push(`${file}: still names the data source`)
    await writeFile(join(out, file), text)
  }
  const files = iconFiles.filter(Boolean)
  await sharp({
    create: {
      width: Math.min(files.length, ICON_COLUMNS) * ICON_CELL,
      height: Math.ceil(files.length / ICON_COLUMNS) * ICON_CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      await Promise.all(
        files.map(async (file, i) => ({
          input: await sharp(join(folder, file)).resize(ICON_CELL, ICON_CELL, { kernel: 'lanczos3' }).png().toBuffer(),
          left: (i % ICON_COLUMNS) * ICON_CELL,
          top: Math.floor(i / ICON_COLUMNS) * ICON_CELL,
        })),
      ),
    )
    .webp({ quality: 90, alphaQuality: 100, effort: 6 })
    .toFile(join(out, `${extra.id}-icons.webp`))
  console.log(`${extra.id}: ${rows.length} rows, ${files.length} icons`)
}

// The list of templates, in the order the page shows them.
const order = [
  'us-rank-countries',
  'android-permissions',
  'ai-apps-ios-android-sdks',
  'android-native-libs',
  'us-rating-countries',
]
await writeFile(join(out, 'index.json'), `${JSON.stringify(order, null, 2)}\n`)

if (problems.length > 0) {
  console.error(`Problems:\n- ${problems.join('\n- ')}`)
  process.exit(1)
}

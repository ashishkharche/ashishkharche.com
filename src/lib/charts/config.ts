/**
 * Chart configs and the data rules every chart has to follow.
 *
 * The config format is the one used to draw the dark X charts
 * (charts/<name>/config.json next to data.csv), and the rules are the same
 * "hard rules": they are checked before anything is drawn, here and on the
 * page, and a chart that breaks one cannot be downloaded.
 */

export type Row = Record<string, string>

export interface AxisConfig {
  field: string
  label: string
  min: number
  max: number
  ticks: number[]
  /** Highest value on the left (ranks, where #1 is best). */
  invert?: boolean
  /** Tick label template, "{}" is the tick value, such as "#{}". */
  tick_format?: string
}

export interface Bias {
  text: string
  show_on_chart?: boolean
  /** Words that must be visible on the chart when show_on_chart is set. */
  chart_text?: string
  shown_by?: 'staleness'
}

export interface Metric {
  kind: 'count' | 'rank' | 'coverage' | 'rank_aggregate' | 'rating' | string
  meaning: string
  biases: Bias[]
  date_field?: string
  aggregate?: string
  method_text?: string
}

export interface LabelConfig {
  /** Pick rows whose columns equal these values... */
  match?: Record<string, string>
  /** ...or the top rows by a column, after skipping some. */
  top_by?: string
  skip?: number
  n?: number
  highlight?: boolean
  /** The label as a template, filled from the row. Written by `composeLabel` when `show` is set. */
  text: string
  /** The columns the label shows, in order (see `label_fields`), after the app's short name. */
  show?: string[]
  /** Leave out the app's name. */
  hide_name?: boolean
  /** Put the name on its own line, above the values. */
  stack?: boolean
  ha?: 'left' | 'center' | 'right'
  va?: 'top' | 'center' | 'bottom'
  /** In points, y up. */
  offset?: [number, number]
  size?: number
  weight?: 'Regular' | 'Medium' | 'SemiBold' | 'Bold'
}

export interface Staleness {
  as_of: string
  max_age_days: number
  /** true: a note under each stale point. "footnote": counted in the footnote. */
  annotate: boolean | 'footnote'
  key?: string
  date_fields: Record<string, string>
  offsets?: Record<string, [number, number]>
  names?: Record<string, string>
}

export interface RankRules {
  unranked_policy: string
  coverage_field: string
  unranked_value: number | null
}

export interface ReferenceLineConfig {
  from: [number, number]
  to: [number, number]
  text?: string
  text_at?: [number, number]
  ha?: 'left' | 'center' | 'right'
}

export interface ChartConfig {
  id: string
  title: string
  subtitle?: string
  selection: string
  method: string
  name_column?: string
  icon_column?: string
  icon_px?: number
  highlight_icon_px?: number
  size?: [number, number]
  x: AxisConfig
  y: AxisConfig
  metrics: Record<string, Metric>
  staleness?: Staleness
  rank_rules?: RankRules
  reference_lines?: ReferenceLineConfig[]
  labels?: LabelConfig[]
  layout?: {
    axes?: [number, number, number, number]
    foot_y?: number
    foot_step?: number
    title_y?: number
    subtitle_y?: number
    rule_y?: number
    labelpad?: number
  }
  /** Three lines; the first starts with "Source:". "{source}" is filled from `source`. */
  footnote: string[]
  footnote_counts?: Record<string, { column: string; equals: string }>
  filter?: Array<{ column: string; not_empty?: boolean; min?: number; max?: number }>
  /** What fills {source} in the footnote. */
  source_default?: string
  /** Columns a point label can show, each with how it reads on the chart ("US #{us_rank}"). */
  label_fields?: Record<string, LabelField>
  /** How the template is listed on the page. */
  template?: {
    name: string
    /** What one point is, with the count: "30 iOS apps". The count is checked against the rows. */
    sample: string
    /** The source in a few words, for the list. */
    source_short: string
    date: string
    source: string
    extra?: boolean
  }
  brand?: unknown
  watermark?: unknown
}

export interface LabelField {
  /** The chip's name on the page. */
  name: string
  /** How the value reads on the chart, such as "{countries_charted} countries". */
  format: string
}

export const FOOTNOTE_LINES = 3
/** A column every label can use: the app's name up to " - " or ": " ("Kimi - Your Personal AI Agent" is "Kimi"). */
export const SHORT_NAME = 'short_name'

const ALLOWED_RANK_AGGREGATES = new Set(['median_unranked_as_worse', 'share_top10', 'points_score'])
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** A cell as a number when it is one ("12" to 12, "4.0" to 4), otherwise NaN. */
export function toNumber(value: string | undefined): number {
  if (value === undefined) return Number.NaN
  const text = value.trim()
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : Number.NaN
}

/** "2026-06-19" as "Jun 2026" (the %b %Y the configs use), or the text unchanged. */
export function monthYear(iso: string): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(iso)
  return match ? `${MONTHS[Number(match[2]) - 1] ?? ''} ${match[1]}` : iso
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000)
}

/** Fields named in a template ("{app}: #{us_rank}" gives app and us_rank). */
export function templateFields(template: string): string[] {
  return [...template.matchAll(/\{(\w+)(?::[^}]*)?\}/g)].map((m) => m[1] ?? '')
}

/**
 * Fills a template like Python's str.format over a row: {field}, and
 * {date:%b %Y} for dates, {rating:.1f} for a fixed number of decimals. Numbers lose a trailing ".0". Unknown fields stay
 * as they are (the rules report them).
 */
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w*)(?::([^}]*))?\}/g, (whole, key: string, format?: string) => {
    if (!(key in values)) return whole
    const value = values[key]
    if (format === '%b %Y') return monthYear(String(value))
    const number = typeof value === 'number' ? value : toNumber(value)
    const digits = /^\.(\d)f$/.exec(format ?? '')
    if (digits && Number.isFinite(number)) return number.toFixed(Number(digits[1]))
    return Number.isFinite(number) ? String(number) : String(value)
  })
}

const STAND_IN = /^(unknown|n\/a|na|none|null|undefined|-+|\?+)$/i

/** Rows a chart may show: a real app name (not empty, not "Unknown") and a cell in the icon sprite. */
export function hasIconAndName(row: Row, config: Pick<ChartConfig, 'name_column' | 'icon_column'>): boolean {
  const name = (row[config.name_column ?? 'app'] ?? row.name ?? row.app ?? '').trim()
  const icon = (row[config.icon_column ?? 'icon'] ?? '').trim()
  return name !== '' && !STAND_IN.test(name) && /^\d+$/.test(icon)
}

export function filterRows(rows: Row[], config: ChartConfig): Row[] {
  let out = rows.filter((r) => hasIconAndName(r, config))
  for (const f of config.filter ?? []) {
    if (f.not_empty) out = out.filter((r) => (r[f.column] ?? '') !== '')
    if (f.max !== undefined) out = out.filter((r) => toNumber(r[f.column]) <= (f.max as number))
    if (f.min !== undefined) out = out.filter((r) => toNumber(r[f.column]) >= (f.min as number))
  }
  return out
}

export function nameOf(row: Row, config: ChartConfig): string {
  return row[config.name_column ?? 'app'] ?? row.name ?? row.app ?? ''
}

/** An app's name without the store subtitle: "Spotify: Music and Podcasts" is "Spotify". */
export function shortName(name: string): string {
  const cut = name.split(/ - |: /)[0]?.trim()
  return cut || name
}

/** The values a label is filled from: the row and the app's short name. */
export function labelValues(row: Row, config: Pick<ChartConfig, 'name_column'>): Row {
  return { ...row, [SHORT_NAME]: shortName(row[config.name_column ?? 'app'] ?? row.name ?? row.app ?? '') }
}

/**
 * The label template for the columns a label shows: "{short_name}: US #{us_rank}, {countries_charted} countries".
 * Columns without a format are left out.
 */
export function composeLabel(
  label: Pick<LabelConfig, 'show' | 'hide_name' | 'stack'>,
  config: Pick<ChartConfig, 'label_fields'>,
): string {
  const parts = (label.show ?? []).flatMap((field) => {
    const format = config.label_fields?.[field]?.format
    return format ? [format] : []
  })
  const values = parts.join(', ')
  if (label.hide_name) return values
  const name = `{${SHORT_NAME}}`
  if (!values) return name
  return label.stack ? `${name}\n${values}` : `${name}: ${values}`
}

/** Rows a label points at: an exact match, or the top n by a column. */
export function labelRows(rows: Row[], label: LabelConfig): Row[] {
  if (label.top_by) {
    const field = label.top_by
    const skip = label.skip ?? 0
    return [...rows]
      .sort(
        (a, b) =>
          toNumber(b[field]) - toNumber(a[field]) || (a.name ?? a.app ?? '').localeCompare(b.name ?? b.app ?? ''),
      )
      .slice(skip, skip + (label.n ?? 1))
  }
  return rows.filter((r) => Object.entries(label.match ?? {}).every(([k, v]) => String(r[k]) === String(v)))
}

export interface StaleNote {
  row: Row
  field: string
  text: string
  date: string
}

/** Rows whose date is older than the config allows, each with its note ("Grok: Android build Jun 2026"). */
export function staleRows(rows: Row[], config: ChartConfig): StaleNote[] {
  const st = config.staleness
  if (!st) return []
  const out: StaleNote[] = []
  for (const row of rows) {
    for (const [field, template] of Object.entries(st.date_fields)) {
      const date = row[field] ?? ''
      if (!date || daysBetween(date, st.as_of) <= st.max_age_days) continue
      const name = row[st.key ?? 'app'] ?? ''
      out.push({ row, field, date, text: fill(template, { name: st.names?.[name] ?? name, date }) })
    }
  }
  return out
}

export function footnoteVars(rows: Row[], config: ChartConfig, source: string): Record<string, string | number> {
  const stale = staleRows(rows, config)
  const dates = stale.map((s) => s.date).sort()
  const vars: Record<string, string | number> = {
    n_rows: rows.length,
    stale_count: new Set(stale.map((s) => s.row)).size,
    oldest: dates[0] ? monthYear(dates[0]) : '',
    source,
  }
  for (const [key, count] of Object.entries(config.footnote_counts ?? {})) {
    vars[key] = rows.filter((r) => String(r[count.column]) === String(count.equals)).length
  }
  return vars
}

export function footnoteLines(rows: Row[], config: ChartConfig, source: string): string[] {
  const vars = footnoteVars(rows, config, source)
  return config.footnote.map((line) => fill(line, vars))
}

/** Something that looks like a web address or this site's name; charts carry no brand or site mark. */
const siteMark = /\b(?:https?:\/\/|www\.)|\b[a-z0-9-]+\.(?:com|net|org|io|app|dev|co|uk)\b|ashish\s*kharche/i

/**
 * Checks a config and its rows against the chart rules. Returns the problems
 * in plain words; an empty list means the chart can be drawn and downloaded.
 */
export function validate(config: ChartConfig, allRows: Row[], source: string): string[] {
  const errors: string[] = []
  const rows = filterRows(allRows, config)
  const columns = new Set([...allRows.flatMap((r) => Object.keys(r)), SHORT_NAME])
  if (config.brand !== undefined || config.watermark !== undefined) errors.push('Charts carry no brand or watermark.')

  const foot = footnoteLines(rows, config, source)
  if (foot.length !== FOOTNOTE_LINES) errors.push(`The footnote needs exactly ${FOOTNOTE_LINES} lines.`)
  if (!foot[0]?.startsWith('Source:')) errors.push('The first footnote line must start with "Source:".')
  if (!source.trim()) errors.push('Say where the data comes from (the Source line).')
  if (foot.some((line) => !line.trim())) errors.push('Footnote lines cannot be empty.')
  if (!config.selection) errors.push('Say which rows are in the chart (selection).')
  if (!config.method) errors.push('Say how the values were worked out (method).')

  const labels = config.labels ?? []
  const visible = [config.title, config.subtitle ?? '', ...foot, ...labels.map((l) => l.text)]
  if (visible.some((text) => siteMark.test(text))) errors.push('No site name or web address on the chart.')
  const chartText = visible.join(' ')

  for (const label of labels) {
    if (!label.text.trim()) errors.push('A point label cannot be empty.')
    for (const field of templateFields(label.text)) {
      if (!columns.has(field)) errors.push(`The label "${label.text}" uses {${field}}, which is not in the data.`)
    }
  }

  const plotted = [config.x.field, config.y.field]
  for (const field of plotted) {
    if (field.includes('DO_NOT_PLOT')) {
      errors.push(`${field} is marked as not to be plotted.`)
      continue
    }
    const metric = config.metrics[field]
    if (!metric) {
      errors.push(`${field} has no description of what it means and how it is biased, so it cannot be plotted.`)
      continue
    }
    if (!metric.meaning || metric.biases.length === 0) errors.push(`${field} needs a meaning and its biases.`)
    for (const bias of metric.biases) {
      if (
        bias.show_on_chart &&
        bias.chart_text &&
        bias.shown_by !== 'staleness' &&
        !chartText.includes(bias.chart_text)
      ) {
        errors.push(`The chart must say "${bias.chart_text}" (${field}: ${bias.text})`)
      }
    }
    if (metric.kind === 'rank') {
      const rules = config.rank_rules
      if (!rules?.unranked_policy) errors.push('A rank is plotted, so the chart needs a rule for unranked countries.')
      const coverage = rules?.coverage_field
      if (!coverage)
        errors.push('A rank is plotted, so coverage (how many countries it charts in) must be shown with it.')
      else if (!plotted.includes(coverage) && !labels.every((l) => l.text.includes(`{${coverage}}`))) {
        errors.push(`Coverage (${coverage}) must be on an axis or in every label next to the rank.`)
      }
      if (rules && rules.unranked_value !== null && rules.unranked_value !== undefined) {
        if (!foot.join(' ').includes(String(rules.unranked_value))) {
          errors.push(`Unranked countries are counted as ${rules.unranked_value}; the footnote must say so.`)
        }
      }
    }
    if (metric.kind === 'rank_aggregate') {
      if (!metric.aggregate || !ALLOWED_RANK_AGGREGATES.has(metric.aggregate)) {
        errors.push(`${field}: ranks cannot be averaged over only the countries where an app charts.`)
      }
      if (!metric.method_text || !foot.join(' ').includes(metric.method_text)) {
        errors.push(`${field}: the footnote must explain how the ranks were combined.`)
      }
    }
    if (metric.date_field && !config.staleness) errors.push(`${field} has dates, so stale rows must be shown.`)
  }

  const stale = staleRows(rows, config)
  const mode = config.staleness?.annotate ?? false
  if (stale.length && mode === 'footnote' && !config.footnote.some((line) => line.includes('{stale_count}'))) {
    errors.push('Stale rows are counted in the footnote, so a footnote line must use {stale_count}.')
  }
  if (stale.length && !mode) errors.push(`${stale.length} rows are out of date and are not marked.`)
  return [...new Set(errors)]
}

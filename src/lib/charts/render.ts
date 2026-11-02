/**
 * Draws a chart config and its rows onto a 2D canvas (or the SVG context in
 * svg.ts) in the style of the dark X charts.
 *
 * The layout follows the matplotlib renderer the X charts come from: a
 * 1800 × 1390 figure at 100 dpi, the same colours and the same text alignment
 * rules (text boxes from the font's ascender and descender, ink edges for
 * horizontal alignment). Type comes from type.ts: Geist and Geist Serif, four
 * sizes, two weights. Other sizes keep the same layout scaled to fit.
 */
import type { ChartConfig, LabelConfig, Row } from './config.ts'
import {
  fill,
  filterRows,
  footnoteLines,
  labelRows,
  labelValues,
  nameOf,
  staleRows,
  toNumber,
  validate,
} from './config.ts'
import { ICON_CELL, ICON_COLUMNS } from './data.ts'
import {
  ASCENT,
  CHART_WEIGHTS,
  DESCENT,
  fitRole,
  fontString,
  sizeOf,
  type ChartFamily,
  type ChartWeight,
  type TypeRole,
} from './type.ts'

export const BASE_WIDTH = 1800
export const BASE_HEIGHT = 1390
/** Pixels per point at 100 dpi. */
export const PT = 100 / 72
/** No extra letter spacing: Geist is set as designed. */
export const TRACKING = 0

export const palette = {
  bg: '#151515',
  grid: '#2e2e2e',
  text: '#f2f2f2',
  muted: '#9a9a9a',
  tick: '#b5b5b5',
  rule: '#3a3a3a',
  foot: '#7d7d7d',
  note: '#a8a8a8',
  diag: '#555555',
  refText: '#8a8a8a',
} as const

/** Label weights in the data files map onto the two chart weights. */
const labelWeight = (w: LabelConfig['weight']): ChartWeight =>
  w === undefined || w === 'Regular' ? CHART_WEIGHTS.regular : CHART_WEIGHTS.medium

/** The part of CanvasRenderingContext2D the renderer uses, so an SVG writer can stand in for it. */
export type Ctx = Pick<
  CanvasRenderingContext2D,
  | 'save'
  | 'restore'
  | 'translate'
  | 'rotate'
  | 'beginPath'
  | 'moveTo'
  | 'lineTo'
  | 'arc'
  | 'rect'
  | 'clip'
  | 'fill'
  | 'stroke'
  | 'fillRect'
  | 'fillText'
  | 'measureText'
  | 'setLineDash'
  | 'drawImage'
> & {
  font: string
  fillStyle: string | CanvasGradient | CanvasPattern
  strokeStyle: string | CanvasGradient | CanvasPattern
  lineWidth: number
  lineCap: CanvasLineCap
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  letterSpacing: string
  fontKerning: CanvasFontKerning
  imageSmoothingQuality: ImageSmoothingQuality
}

export interface Layout {
  width: number
  height: number
  /** Scale against the 1800 × 1390 original. */
  s: number
  padX: number
  titleY: number
  subtitleY: number
  ruleY: number
  footY: number[]
  plot: { left: number; top: number; right: number; bottom: number }
}

/**
 * Where everything goes. Positions are the config's figure fractions at the
 * original size; the header keeps its distance from the top, the footnote
 * from the bottom, and the plot fills the space between.
 */
export function layout(config: Pick<ChartConfig, 'layout' | 'footnote'>, width: number, height: number): Layout {
  const L = config.layout ?? {}
  const s = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT)
  const fromTop = (fraction: number) => (1 - fraction) * BASE_HEIGHT * s
  const fromBottom = (fraction: number) => height - fraction * BASE_HEIGHT * s
  const [axLeft, axBottom, axWidth, axHeight] = L.axes ?? [0.12, 0.215, 0.82, 0.61]
  const footY = L.foot_y ?? 0.025
  const step = L.foot_step ?? 0.0225
  const lines = config.footnote.length
  return {
    width,
    height,
    s,
    padX: 0.045 * BASE_WIDTH * s,
    titleY: fromTop(L.title_y ?? 0.94),
    subtitleY: fromTop(L.subtitle_y ?? 0.897),
    ruleY: fromTop(L.rule_y ?? 0.862),
    // Line i from the top; the last line sits lowest.
    footY: Array.from({ length: lines }, (_, i) => fromBottom(footY + (lines - 1 - i) * step)),
    plot: {
      left: axLeft * BASE_WIDTH * s,
      right: width - (1 - axLeft - axWidth) * BASE_WIDTH * s,
      top: fromTop(axBottom + axHeight),
      bottom: fromBottom(axBottom),
    },
  }
}

/** Round tick steps (1, 2, 2.5, 5 times a power of ten) giving about `count` ticks. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (min === max) return [min]
  const [lo, hi] = min < max ? [min, max] : [max, min]
  const raw = (hi - lo) / Math.max(1, count - 1)
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * power >= raw) ?? 10) * power
  const ticks: number[] = []
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step)
    ticks.push(Math.round(v / step) * step)
  return ticks.map((v) => Number(v.toPrecision(12)))
}

/** Limits and ticks that fit the values, with a margin, starting at zero for counts that start near it. */
export function autoAxis(values: number[]): { min: number; max: number; ticks: number[] } {
  const finite = values.filter(Number.isFinite)
  const lo = finite.length ? Math.min(...finite) : 0
  const hi = finite.length ? Math.max(...finite) : 1
  const span = hi - lo || Math.abs(hi) || 1
  let min = lo - span * 0.08
  const max = hi + span * 0.08
  if (lo >= 0 && min < 0) min = lo === 0 ? -span * 0.04 : 0
  return { min, max, ticks: niceTicks(Math.max(min, lo >= 0 ? 0 : min), max) }
}

/** Matplotlib-style pixel snapping for straight lines: odd widths sit on pixel centres. */
export function snap(value: number, lineWidth: number): number {
  return Math.floor(value + 0.5) + (Math.round(lineWidth) % 2 === 1 ? 0.5 : 0)
}

type HAlign = 'left' | 'center' | 'right'
type VAlign = 'top' | 'center' | 'bottom' | 'center_baseline'

export interface TextStyle {
  /** A size from type.ts (sizeOf / fitRole), in px. */
  size: number
  weight: ChartWeight
  family?: ChartFamily
  color: string
  ha: HAlign
  va: VAlign
  /** Fixed line spacing for multi-line text, as a multiple of the font's line height. */
  linespacing?: number
  /** Extra space after each letter, in px. */
  tracking?: number
  /** Turned 90° anticlockwise, anchored at the bottom centre of the text box (like a y-axis label). */
  vertical?: boolean
}

/** Same box rules as matplotlib's Text._get_layout. Returns the text box size. */
export function drawText(ctx: Ctx, text: string, x: number, y: number, style: TextStyle) {
  ctx.font = fontString(style.size, style.weight, style.family)
  ctx.letterSpacing = `${style.tracking ?? 0}px`
  const lines = text.split('\n')
  const A = ASCENT * style.size
  const D = DESCENT * style.size
  let thisy = 0
  let firstA = 0
  const placed = lines.map((line, i) => {
    const m = ctx.measureText(line)
    const inkA = line ? m.actualBoundingBoxAscent : 0
    const inkD = line ? m.actualBoundingBoxDescent : 0
    let a: number
    let d: number
    if (style.linespacing === undefined || lines.length === 1) {
      a = Math.max(inkA, A)
      d = Math.max(inkD, D)
    } else {
      const leading = style.linespacing * (A + D) - (inkA + inkD)
      a = inkA + leading / 2
      d = inkD + leading / 2
    }
    if (i === 0) firstA = a
    thisy -= a
    const baseline = thisy
    thisy -= d
    // Like FreeType's string box in matplotlib: from the pen start (or the ink, if it starts further left) to the ink's right edge.
    const left = Math.max(0, m.actualBoundingBoxLeft)
    const width = line ? left + m.actualBoundingBoxRight : 0
    return { line, baseline, left, width }
  })
  const width = Math.max(0, ...placed.map((p) => p.width))
  const height = -thisy
  const offX = style.ha === 'left' ? 0 : style.ha === 'right' ? width : width / 2
  const offY =
    style.va === 'top' ? 0 : style.va === 'bottom' ? -height : style.va === 'center' ? -height / 2 : -firstA / 2
  ctx.save()
  ctx.translate(x, y)
  if (style.vertical) ctx.rotate(-Math.PI / 2)
  ctx.fillStyle = style.color
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  for (const p of placed) {
    if (!p.line) continue
    const lineX = style.ha === 'left' ? 0 : style.ha === 'right' ? width - p.width : (width - p.width) / 2
    ctx.fillText(p.line, lineX - offX + p.left, -(p.baseline - offY))
  }
  ctx.restore()
  return { width, height }
}

export function inkWidth(
  ctx: Ctx,
  text: string,
  size: number,
  weight: ChartWeight,
  tracking: number,
  family: ChartFamily = 'sans',
): number {
  ctx.font = fontString(size, weight, family)
  ctx.letterSpacing = `${tracking}px`
  const m = ctx.measureText(text)
  return m.actualBoundingBoxLeft + m.actualBoundingBoxRight
}

/**
 * The parts every chart shares: the background, the title and subtitle (shrunk to fit the width), the rule under
 * them and the three footnote lines.
 */
export function drawFrame(ctx: Ctx, L: Layout, title: string, subtitle: string, foot: string[]): void {
  const { s } = L
  const px = (pt: number) => pt * PT * s
  const tracking = TRACKING * s
  const text = (value: string, x: number, y: number, style: TextStyle) =>
    drawText(ctx, value, x, y, { tracking, ...style })
  ctx.fontKerning = 'none'
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, L.width, L.height)

  const maxWidth = L.width - 2 * L.padX
  const set = (value: string, role: TypeRole, weight: ChartWeight, family: ChartFamily = 'sans') => {
    const size = fitRole(role, s, maxWidth, (z) => inkWidth(ctx, value, z, weight, tracking, family))
    return { value: shorten(ctx, value, size, weight, family, maxWidth), size }
  }
  const t = set(title, 'title', 400, 'serif')
  text(t.value, L.padX, L.titleY, {
    size: t.size,
    weight: 400,
    family: 'serif',
    color: palette.text,
    ha: 'left',
    va: 'center',
  })
  if (subtitle) {
    const sub = set(subtitle, 'body', 400)
    text(sub.value, L.padX, L.subtitleY, {
      size: sub.size,
      weight: 400,
      color: palette.muted,
      ha: 'left',
      va: 'center',
    })
  }
  const ruleWidth = px(1.5)
  const ruleY = L.height - snap(L.height - L.ruleY, ruleWidth)
  ctx.strokeStyle = palette.rule
  ctx.lineWidth = ruleWidth
  ctx.lineCap = 'square'
  ctx.beginPath()
  ctx.moveTo(L.padX, ruleY)
  ctx.lineTo(L.width - L.padX, ruleY)
  ctx.stroke()

  foot.forEach((line, i) => {
    const f = set(line, 'meta', 400)
    text(f.value, L.padX, L.footY[i] ?? L.height, {
      size: f.size,
      weight: 400,
      color: palette.foot,
      ha: 'left',
      va: 'center',
    })
  })
}

/**
 * The loading state of a chart: the frame every chart shares (background, rule) with a bar where the title, the
 * subtitle and each footnote line will be, at the same places drawChart and drawLive put them. No text and no
 * motion, so nothing moves while the data is on its way and the chart lands where its outline was.
 */
export function drawPlaceholder(ctx: Ctx, width: number, height: number): void {
  const L = layout({ footnote: ['', '', ''] }, width, height)
  const { s } = L
  const maxWidth = L.width - 2 * L.padX
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, L.width, L.height)
  const bar = (y: number, h: number, w: number) => {
    const r = h / 2
    ctx.beginPath()
    ctx.arc(L.padX + r, y, r, Math.PI / 2, (3 * Math.PI) / 2)
    ctx.arc(L.padX + w - r, y, r, -Math.PI / 2, Math.PI / 2)
    ctx.fill()
  }
  ctx.fillStyle = palette.grid
  // Bars as tall as the letters of each line (cap height, about 0.7 of the size).
  bar(L.titleY, sizeOf('title', s) * 0.7, maxWidth * 0.62)
  bar(L.subtitleY, sizeOf('body', s) * 0.7, maxWidth * 0.4)
  const ruleWidth = PT * 1.5 * s
  ctx.strokeStyle = palette.rule
  ctx.lineWidth = ruleWidth
  ctx.lineCap = 'square'
  ctx.beginPath()
  ctx.moveTo(L.padX, L.ruleY)
  ctx.lineTo(L.width - L.padX, L.ruleY)
  ctx.stroke()
  const footWidths = [0.56, 0.48, 0.34]
  L.footY.forEach((y, i) => bar(y, sizeOf('meta', s) * 0.7, maxWidth * (footWidths[i] ?? 0.4)))
}

/** Cuts text that is too wide even at meta, ending it with an ellipsis. */
export function shorten(
  ctx: Ctx,
  value: string,
  size: number,
  weight: ChartWeight,
  family: ChartFamily,
  maxWidth: number,
): string {
  if (inkWidth(ctx, value, size, weight, 0, family) <= maxWidth) return value
  let cut = value
  while (cut.length > 1 && inkWidth(ctx, `${cut}…`, size, weight, 0, family) > maxWidth) cut = cut.slice(0, -1)
  return `${cut.trimEnd()}…`
}

export interface DrawOptions {
  width: number
  height: number
  /** Fills {source} in the footnote. */
  source: string
  /** The icon sprite. Without it no point is drawn, so the page does not show the chart. */
  sprite?: CanvasImageSource | null
}

/** Rows targeted by highlight labels; they are drawn larger and on top. */
export function highlightRows(rows: Row[], config: ChartConfig): Set<Row> {
  return new Set((config.labels ?? []).filter((l) => l.highlight).flatMap((l) => labelRows(rows, l)))
}

/** Plottable rows in drawing order: by y, then x, then name, with highlighted rows last. */
export function drawOrder(rows: Row[], config: ChartConfig): Row[] {
  const hl = highlightRows(rows, config)
  const { x, y } = config
  return rows
    .filter((r) => Number.isFinite(toNumber(r[x.field])) && Number.isFinite(toNumber(r[y.field])))
    .sort(
      (a, b) =>
        Number(hl.has(a)) - Number(hl.has(b)) ||
        toNumber(a[y.field]) - toNumber(b[y.field]) ||
        toNumber(a[x.field]) - toNumber(b[x.field]) ||
        nameOf(a, config).localeCompare(nameOf(b, config)),
    )
}

export class ChartRuleError extends Error {
  constructor(readonly problems: string[]) {
    super(`The chart breaks the data rules:\n- ${problems.join('\n- ')}`)
  }
}

/**
 * Draws the chart. Throws ChartRuleError, before drawing anything, if the
 * config breaks a data rule.
 */
export function drawChart(ctx: Ctx, config: ChartConfig, allRows: Row[], options: DrawOptions): void {
  const problems = validate(config, allRows, options.source)
  if (problems.length) throw new ChartRuleError(problems)
  const rows = filterRows(allRows, config)
  const L = layout(config, options.width, options.height)
  const { s, plot } = L
  const px = (pt: number) => pt * PT * s
  const tracking = TRACKING * s
  const text = (value: string, x: number, y: number, style: TextStyle) =>
    drawText(ctx, value, x, y, { tracking, ...style })

  ctx.save()
  drawFrame(ctx, L, config.title, config.subtitle ?? '', footnoteLines(rows, config, options.source))

  const order = drawOrder(rows, config)
  const { x: xa, y: ya } = config
  const [x0, x1] = xa.invert ? [xa.max, xa.min] : [xa.min, xa.max]
  const [y0, y1] = ya.invert ? [ya.max, ya.min] : [ya.min, ya.max]
  const toX = (v: number) => plot.left + ((v - x0) / (x1 - x0)) * (plot.right - plot.left)
  const toY = (v: number) => plot.bottom - ((v - y0) / (y1 - y0)) * (plot.bottom - plot.top)
  const inRange = (v: number, a: AxisLike) => v >= Math.min(a.min, a.max) - 1e-9 && v <= Math.max(a.min, a.max) + 1e-9
  const xTicks = xa.ticks.filter((t) => inRange(t, xa))
  const yTicks = ya.ticks.filter((t) => inRange(t, ya))

  // Grid at the ticks.
  const gridWidth = px(1.3)
  ctx.strokeStyle = palette.grid
  ctx.lineWidth = gridWidth
  ctx.lineCap = 'square'
  ctx.beginPath()
  for (const t of xTicks) {
    const gx = snap(toX(t), gridWidth)
    ctx.moveTo(gx, L.height - snap(L.height - plot.top, gridWidth))
    ctx.lineTo(gx, L.height - snap(L.height - plot.bottom, gridWidth))
  }
  for (const t of yTicks) {
    const gy = L.height - snap(L.height - toY(t), gridWidth)
    ctx.moveTo(snap(plot.left, gridWidth), gy)
    ctx.lineTo(snap(plot.right, gridWidth), gy)
  }
  ctx.stroke()

  // Tick labels and axis labels.
  const tickSize = sizeOf('meta', s)
  const pad = px(14)
  const tickLabel = (axis: AxisLike, t: number) =>
    axis.tick_format ? axis.tick_format.replace('{}', fill('{v}', { v: t })) : fill('{v}', { v: t })
  for (const t of xTicks) {
    text(tickLabel(xa, t), toX(t), plot.bottom + pad, {
      size: tickSize,
      weight: 400,
      color: palette.tick,
      ha: 'center',
      va: 'top',
    })
  }
  let widest = 0
  for (const t of yTicks) {
    const box = text(tickLabel(ya, t), plot.left - pad, toY(t), {
      size: tickSize,
      weight: 400,
      color: palette.tick,
      ha: 'right',
      va: 'center_baseline',
    })
    widest = Math.max(widest, box.width)
  }
  const axisSize = sizeOf('meta', s)
  const labelPad = px(config.layout?.labelpad ?? 22)
  const tickBox = (ASCENT + DESCENT) * tickSize
  text(xa.label, (plot.left + plot.right) / 2, plot.bottom + pad + tickBox + labelPad, {
    size: axisSize,
    weight: 400,
    color: palette.muted,
    ha: 'center',
    va: 'top',
  })
  text(ya.label, plot.left - pad - widest - labelPad, (plot.top + plot.bottom) / 2, {
    size: axisSize,
    weight: 400,
    color: palette.muted,
    ha: 'center',
    va: 'bottom',
    vertical: true,
  })

  // Reference lines, clipped to the plot.
  for (const ref of config.reference_lines ?? []) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(plot.left, plot.top, plot.right - plot.left, plot.bottom - plot.top)
    ctx.clip()
    ctx.strokeStyle = palette.diag
    ctx.lineWidth = px(2)
    ctx.lineCap = 'butt'
    ctx.setLineDash([px(12), px(12)])
    ctx.beginPath()
    ctx.moveTo(toX(ref.from[0]), toY(ref.from[1]))
    ctx.lineTo(toX(ref.to[0]), toY(ref.to[1]))
    ctx.stroke()
    ctx.restore()
    if (ref.text && ref.text_at) {
      text(ref.text, toX(ref.text_at[0]), toY(ref.text_at[1]), {
        size: sizeOf('meta', s),
        weight: 400,
        color: palette.refText,
        ha: ref.ha ?? 'right',
        va: 'center',
      })
    }
  }

  // Points.
  const hl = highlightRows(rows, config)
  const iconPx = config.icon_px ?? 56
  const highlightPx = config.highlight_icon_px ?? 84
  for (const row of order) {
    const size = (hl.has(row) ? highlightPx : iconPx) * s
    drawPoint(ctx, row, config, toX(toNumber(row[xa.field])), toY(toNumber(row[ya.field])), size, options)
  }

  // Labels, then the notes under stale points.
  const at = (row: Row) => [toX(toNumber(row[xa.field])), toY(toNumber(row[ya.field]))] as const
  for (const label of config.labels ?? []) {
    for (const row of labelRows(rows, label)) {
      if (!order.includes(row)) continue
      drawLabel(text, label, labelValues(row, config), at(row), px, s)
    }
  }
  const st = config.staleness
  if (st?.annotate === true) {
    for (const note of staleRows(rows, config)) {
      if (!order.includes(note.row)) continue
      const [dx, dy] = st.offsets?.[note.row[st.key ?? 'app'] ?? ''] ?? [0, -42]
      const [cx, cy] = at(note.row)
      text(note.text, cx + px(dx), cy - px(dy), {
        size: sizeOf('meta', s),
        weight: 500,
        color: palette.note,
        ha: 'center',
        va: 'top',
      })
    }
  }
  ctx.restore()
}

type AxisLike = Pick<ChartConfig['x'], 'min' | 'max' | 'tick_format'>

function drawLabel(
  text: (value: string, x: number, y: number, style: TextStyle) => unknown,
  label: LabelConfig,
  row: Row,
  [cx, cy]: readonly [number, number],
  px: (pt: number) => number,
  s: number,
) {
  const [dx, dy] = label.offset ?? [40, 0]
  // Data files give label sizes in points: the larger labels are body, the smaller ones meta.
  const role: TypeRole = (label.size ?? 27) >= 24 ? 'body' : 'meta'
  text(fill(label.text, row), cx + px(dx), cy - px(dy), {
    size: sizeOf(role, s),
    weight: labelWeight(label.weight ?? 'Medium'),
    color: palette.text,
    ha: label.ha ?? 'left',
    va: label.va ?? 'center',
    linespacing: 1.35,
  })
}

/** An app icon in a circle with a thin ring of the background colour. Every row has a sprite cell. */
function drawPoint(
  ctx: Ctx,
  row: Row,
  config: ChartConfig,
  cx: number,
  cy: number,
  size: number,
  options: DrawOptions,
) {
  const index = toNumber(row[config.icon_column ?? 'icon'])
  if (!options.sprite || !Number.isInteger(index)) return
  const r = size / 2
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.clip()
  ctx.imageSmoothingQuality = 'high'
  const sx = (index % ICON_COLUMNS) * ICON_CELL
  const sy = Math.floor(index / ICON_COLUMNS) * ICON_CELL
  ctx.drawImage(options.sprite, sx, sy, ICON_CELL, ICON_CELL, cx - r, cy - r, size, size)
  const ring = (4 / ICON_CELL) * size
  ctx.strokeStyle = palette.bg
  ctx.lineWidth = ring
  ctx.beginPath()
  ctx.arc(cx, cy, r - ring / 2, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

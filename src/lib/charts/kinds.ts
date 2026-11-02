/**
 * Draws the live chart kinds (headline number, ranked list, head to head, rank over time, iOS vs Android) on a
 * canvas or the SVG context, in the same dark style, header and footnote as the scatter charts.
 */
import { niceTicks, shorten } from './render.ts'
import {
  drawFrame,
  drawText,
  initialSize,
  inkWidth,
  layout,
  palette,
  TRACKING,
  type Ctx,
  type TextStyle,
} from './render.ts'
import { fitRole, fontString, sizeOf, type ChartFamily, type ChartWeight, type TypeRole } from './type.ts'
import { liveFootnote, validateLive, type AppRef, type ChartText, type LiveChart, type Model } from './live.ts'
import { ChartRuleError } from './render.ts'

/** An icon ready to draw: the image and its size in pixels. */
export interface Icon {
  image: CanvasImageSource
  width: number
  height: number
}

export interface LiveDrawOptions {
  width: number
  height: number
  /** Icons by app id. Apps without one get their initial. */
  icons?: Map<string, Icon>
  pointStyle?: 'icons' | 'initials'
}

/** Colours for up to six lines, picked to stay apart on the dark background. */
export const SERIES = ['#f2f2f2', '#6ea8fe', '#f4a261', '#7bd389', '#e07a9f', '#c7a2ff'] as const
const ANDROID = '#7bd389'
const BAR = '#d6d6d6'
const BAR_SOFT = '#4a4a4a'

interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

interface Kit {
  ctx: Ctx
  s: number
  text: (value: string, x: number, y: number, style: TextStyle) => { width: number; height: number }
  width: (value: string, size: number, weight: ChartWeight, family?: ChartFamily) => number
  icon: (app: AppRef, cx: number, cy: number, size: number) => void
  /** A size from the chart type scale (type.ts). */
  size: (role: TypeRole) => number
  /** The largest size from `role` down that fits, and the text shortened if even meta is too wide. */
  fit: (
    value: string,
    role: TypeRole,
    weight: ChartWeight,
    maxWidth: number,
    family?: ChartFamily,
  ) => { value: string; size: number }
}

/** Draws a live chart. Throws ChartRuleError, before drawing anything, if it breaks a data rule. */
export function drawLive(ctx: Ctx, chart: LiveChart, text: ChartText, options: LiveDrawOptions): void {
  const problems = validateLive(chart, text)
  if (problems.length) throw new ChartRuleError(problems)
  const foot = liveFootnote(chart, text)
  const L = layout({ footnote: foot }, options.width, options.height)
  const { s } = L
  const tracking = TRACKING * s
  const kit: Kit = {
    ctx,
    s,
    text: (value, x, y, style) => drawText(ctx, value, x, y, { tracking, ...style }),
    width: (value, size, weight, family) => inkWidth(ctx, value, size, weight, tracking, family),
    icon: (app, cx, cy, size) => drawIcon(ctx, app, cx, cy, size, options, s),
    size: (role) => sizeOf(role, s),
    fit: (value, role, weight, maxWidth, family = 'sans') => {
      const size = fitRole(role, s, maxWidth, (z) => inkWidth(ctx, value, z, weight, tracking, family))
      return { value: shorten(ctx, value, size, weight, family, maxWidth), size }
    },
  }
  ctx.save()
  drawFrame(ctx, L, text.title, text.subtitle, foot)
  const body: Box = {
    left: L.padX,
    right: L.width - L.padX,
    top: L.ruleY + 56 * s,
    bottom: (L.footY[0] ?? L.height) - 64 * s,
  }
  drawModel(kit, chart.model, body)
  ctx.restore()
}

function drawModel(kit: Kit, model: Model, box: Box) {
  switch (model.kind) {
    case 'headline':
      return headline(kit, model, box)
    case 'leaderboard':
      return leaderboard(kit, model, box)
    case 'head-to-head':
      return headToHead(kit, model, box)
    case 'bump':
      return bump(kit, model, box)
    case 'dumbbell':
      return dumbbell(kit, model, box)
  }
}

/** An app icon in a circle, or its initial on a grey disc. */
function drawIcon(ctx: Ctx, app: AppRef, cx: number, cy: number, size: number, options: LiveDrawOptions, s: number) {
  const r = size / 2
  const icon = (options.pointStyle ?? 'icons') === 'icons' ? options.icons?.get(app.appId) : undefined
  ctx.save()
  if (icon) {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(icon.image, 0, 0, icon.width, icon.height, cx - r, cy - r, size, size)
  } else {
    ctx.fillStyle = palette.initials
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    const letter = (app.name.trim()[0] ?? '?').toUpperCase()
    ctx.font = fontString(initialSize(size, s), 500)
    ctx.letterSpacing = '0px'
    const m = ctx.measureText(letter)
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(
      letter,
      cx - (m.actualBoundingBoxRight - m.actualBoundingBoxLeft) / 2,
      cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2,
    )
  }
  ctx.restore()
}

/** Splits text into lines no wider than maxWidth. */
export function wrap(
  kit: Pick<Kit, 'width'>,
  value: string,
  size: number,
  weight: ChartWeight,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of value.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word
    if (line && kit.width(next, size, weight) > maxWidth) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

function line(
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
  width: number,
  dash: number[] = [],
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.setLineDash(dash)
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.stroke()
  ctx.restore()
}

function dot(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

/** A bar with round ends, drawn as a thick line. */
function bar(ctx: Ctx, x0: number, x1: number, y: number, height: number, color: string) {
  if (x1 - x0 < height) {
    dot(ctx, (x0 + x1) / 2, y, height / 2, color)
    return
  }
  line(ctx, x0 + height / 2, y, x1 - height / 2, y, color, height)
}

// Headline number ---------------------------------------------------------------------------------------------------

function headline(kit: Kit, m: Extract<Model, { kind: 'headline' }>, box: Box) {
  const { s } = kit
  const width = box.right - box.left
  const height = box.bottom - box.top
  const iconSize = Math.min(150 * s, height * 0.2)
  kit.icon(m.app, box.left + iconSize / 2, box.top + iconSize / 2, iconSize)
  // The answer, as large as fits beside the icon.
  const answerX = box.left + iconSize + 36 * s
  const unitSize = kit.size('title')
  const unitWidth = m.unit ? kit.width(m.unit, unitSize, 400) + 24 * s : 0
  const fitted = kit.fit(m.answer, 'display', 400, box.right - answerX - unitWidth, 'serif')
  const answer = kit.text(fitted.value, answerX, box.top + iconSize / 2, {
    size: fitted.size,
    weight: 400,
    family: 'serif',
    color: palette.text,
    ha: 'left',
    va: 'center_baseline',
  })
  if (m.unit) {
    kit.text(m.unit, answerX + answer.width + 24 * s, box.top + iconSize / 2, {
      size: unitSize,
      weight: 400,
      color: palette.muted,
      ha: 'left',
      va: 'center_baseline',
    })
  }
  // The answer in a sentence.
  const sentenceSize = kit.size('body')
  const lines = wrap(kit, m.sentence, sentenceSize, 400, width).slice(0, 2)
  let y = box.top + iconSize + 40 * s
  for (const l of lines) {
    kit.text(l, box.left, y, { size: sentenceSize, weight: 400, color: palette.text, ha: 'left', va: 'top' })
    y += sentenceSize * 1.35
  }
  // Other apps, as a row of icons with a note each.
  if (m.others.length) {
    y += 24 * s
    const size = 56 * s
    let x = box.left
    for (const o of m.others) {
      kit.icon(o.app, x + size / 2, y + size / 2, size)
      const t = kit.text(`${o.note} ${o.app.name}`, x + size + 14 * s, y + size / 2, {
        size: kit.size('meta'),
        weight: 500,
        color: palette.muted,
        ha: 'left',
        va: 'center',
      })
      x += size + 14 * s + t.width + 40 * s
      if (x > box.right - 200 * s) break
    }
    y += size
  }
  // The supporting chart fills what is left.
  const top = Math.max(y + 48 * s, box.top + height * 0.5)
  const support: Box = { left: box.left, right: box.right, top, bottom: box.bottom }
  if (support.bottom - support.top < 80 * s) return
  kit.text(m.support.label, support.left, support.top, {
    size: kit.size('meta'),
    weight: 500,
    color: palette.muted,
    ha: 'left',
    va: 'top',
  })
  const plot: Box = { ...support, top: support.top + kit.size('meta') * 1.6 + 16 * s }
  if (m.support.type === 'spark') spark(kit, m.support, plot)
  else bars(kit, m.support.bars, plot)
}

function spark(kit: Kit, sp: Extract<Extract<Model, { kind: 'headline' }>['support'], { type: 'spark' }>, box: Box) {
  const { ctx, s } = kit
  const values = sp.values.filter((v): v is number => v !== null)
  if (values.length === 0) return
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const labelW = 90 * s
  const plot = { ...box, left: box.left + labelW, bottom: box.bottom - kit.size('meta') * 1.8 }
  const toX = (i: number) =>
    plot.left + (sp.values.length <= 1 ? 0 : (i / (sp.values.length - 1)) * (plot.right - plot.left))
  const span = hi - lo || 1
  const toY = (v: number) => {
    const t = (v - lo) / span
    return sp.invert ? plot.top + t * (plot.bottom - plot.top) : plot.bottom - t * (plot.bottom - plot.top)
  }
  for (const v of hi === lo ? [lo] : [lo, hi]) {
    line(ctx, plot.left, toY(v), plot.right, toY(v), palette.grid, 1.3 * s)
    kit.text(`#${v}`, plot.left - 16 * s, toY(v), {
      size: kit.size('meta'),
      weight: 400,
      color: palette.tick,
      ha: 'right',
      va: 'center',
    })
  }
  ctx.save()
  ctx.strokeStyle = SERIES[0]
  ctx.lineWidth = 4 * s
  ctx.lineCap = 'round'
  ctx.beginPath()
  let pen = false
  sp.values.forEach((v, i) => {
    if (v === null) {
      pen = false
      return
    }
    if (pen) ctx.lineTo(toX(i), toY(v))
    else ctx.moveTo(toX(i), toY(v))
    pen = true
  })
  ctx.stroke()
  ctx.restore()
  const lastIndex = sp.values.findLastIndex((v) => v !== null)
  const last = sp.values[lastIndex]
  if (typeof last === 'number') dot(ctx, toX(lastIndex), toY(last), 7 * s, SERIES[0])
  const first = sp.days[0]
  const end = sp.days.at(-1)
  const day = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  if (first)
    kit.text(day(first), plot.left, box.bottom, {
      size: kit.size('meta'),
      weight: 400,
      color: palette.tick,
      ha: 'left',
      va: 'bottom',
    })
  if (end)
    kit.text(day(end), plot.right, box.bottom, {
      size: kit.size('meta'),
      weight: 400,
      color: palette.tick,
      ha: 'right',
      va: 'bottom',
    })
}

function bars(kit: Kit, list: Array<{ label: string; value: number }>, box: Box) {
  const { ctx, s } = kit
  const max = Math.max(1, ...list.map((b) => b.value))
  const gap = 32 * s
  const w = (box.right - box.left - gap * (list.length - 1)) / list.length
  const labelH = kit.size('meta') * 1.8
  const valueH = kit.size('body') * 1.6
  const plotTop = box.top + valueH
  const plotBottom = box.bottom - labelH
  list.forEach((b, i) => {
    const x = box.left + i * (w + gap)
    const h = (b.value / max) * (plotBottom - plotTop)
    ctx.fillStyle = i === 0 ? BAR : BAR_SOFT
    ctx.fillRect(x, plotBottom - h, w, Math.max(h, 2 * s))
    kit.text(String(b.value), x + w / 2, plotBottom - h - 10 * s, {
      size: kit.size('body'),
      weight: 500,
      color: palette.text,
      ha: 'center',
      va: 'bottom',
    })
    kit.text(b.label, x + w / 2, box.bottom, {
      size: kit.size('meta'),
      weight: 400,
      color: palette.tick,
      ha: 'center',
      va: 'bottom',
    })
  })
}

// Ranked list ---------------------------------------------------------------------------------------------------------

function leaderboard(kit: Kit, m: Extract<Model, { kind: 'leaderboard' }>, box: Box) {
  const { ctx, s } = kit
  const n = m.rows.length
  const rowH = Math.min((box.bottom - box.top) / Math.max(n, 5), 110 * s)
  const max = Math.max(...m.rows.map((r) => r.value), 1)
  const nameSize = kit.size('body')
  const iconSize = rowH * 0.66
  const rankW = 56 * s
  const nameW = (box.right - box.left) * 0.4
  const valueW = 120 * s
  const barLeft = box.left + rankW + iconSize + 20 * s + nameW
  const barRight = box.right - valueW
  m.rows.forEach((r, i) => {
    const cy = box.top + rowH * (i + 0.5)
    kit.text(String(i + 1), box.left + rankW - 20 * s, cy, {
      size: nameSize,
      weight: 500,
      color: palette.muted,
      ha: 'right',
      va: 'center_baseline',
    })
    kit.icon(r.app, box.left + rankW + iconSize / 2, cy, iconSize)
    const nameX = box.left + rankW + iconSize + 20 * s
    const name = kit.fit(r.app.name, 'body', 500, nameW - 24 * s)
    kit.text(name.value, nameX, r.detail ? cy - nameSize * 0.55 : cy, {
      size: name.size,
      weight: 500,
      color: palette.text,
      ha: 'left',
      va: 'center',
    })
    if (r.detail) {
      kit.text(r.detail, nameX, cy + nameSize * 0.75, {
        size: kit.size('meta'),
        weight: 400,
        color: palette.muted,
        ha: 'left',
        va: 'center',
      })
    }
    const len = (r.value / max) * (barRight - barLeft - 24 * s)
    bar(ctx, barLeft, barLeft + len, cy, Math.max(10 * s, rowH * 0.28), i === 0 ? BAR : '#8a8a8a')
    kit.text(r.display, box.right, cy, {
      size: nameSize,
      weight: 500,
      color: palette.text,
      ha: 'right',
      va: 'center_baseline',
    })
  })
}

// Head to head ----------------------------------------------------------------------------------------------------------

function headToHead(kit: Kit, m: Extract<Model, { kind: 'head-to-head' }>, box: Box) {
  const { ctx, s } = kit
  const mid = (box.left + box.right) / 2
  const half = (box.right - box.left) / 2
  const iconSize = Math.min(96 * s, (box.bottom - box.top) * 0.16)
  const headY = box.top + iconSize / 2
  m.apps.forEach((app, i) => {
    const side = i === 0 ? -1 : 1
    const cx = mid + side * half * 0.5
    const name = kit.fit(app.name, 'title', 400, half * 0.7, 'serif')
    kit.icon(app, cx - kit.width(name.value, name.size, 400, 'serif') / 2 - iconSize / 2 - 12 * s, headY, iconSize)
    kit.text(name.value, cx, headY, {
      size: name.size,
      weight: 400,
      family: 'serif',
      color: SERIES[i === 0 ? 0 : 1],
      ha: 'center',
      va: 'center',
    })
  })
  const top = box.top + iconSize + 40 * s
  const rowH = (box.bottom - top) / m.metrics.length
  const valueSize = rowH >= kit.size('title') * 2.2 ? kit.size('title') : kit.size('body')
  const labelSize = kit.size('meta')
  m.metrics.forEach((metric, i) => {
    const y = top + rowH * i
    line(ctx, box.left, y, box.right, y, palette.grid, 1.3 * s)
    kit.text(metric.label, mid, y + rowH * 0.28, {
      size: labelSize,
      weight: 500,
      color: palette.muted,
      ha: 'center',
      va: 'center',
    })
    const winner =
      metric.better === 'none' || metric.a === metric.b
        ? -1
        : (metric.better === 'higher') === metric.a > metric.b
          ? 0
          : 1
    const valueY = y + rowH * 0.66
    metric.display.forEach((value, side) => {
      const x = side === 0 ? mid - 40 * s : mid + 40 * s
      kit.text(value, x, valueY, {
        size: valueSize,
        weight: 500,
        color: winner === -1 || winner === side ? palette.text : palette.muted,
        ha: side === 0 ? 'right' : 'left',
        va: 'center_baseline',
      })
    })
    // Bars for amounts (not ranks): each side grows out from the middle, scaled to the larger value.
    if (metric.better !== 'lower') {
      const max = Math.max(metric.a, metric.b, 1e-9)
      const room = half - 220 * s
      const h = Math.max(8 * s, rowH * 0.1)
      bar(ctx, mid - 200 * s - (metric.a / max) * room, mid - 200 * s, valueY, h, SERIES[0])
      bar(ctx, mid + 200 * s, mid + 200 * s + (metric.b / max) * room, valueY, h, SERIES[1])
    }
  })
}

// Rank over time --------------------------------------------------------------------------------------------------------

function bump(kit: Kit, m: Extract<Model, { kind: 'bump' }>, box: Box) {
  const { ctx, s } = kit
  const all = m.series.flatMap((x) => x.ranks.filter((r): r is number => r !== null))
  const worst = Math.max(...all, 2)
  const ticks = [1, ...niceTicks(0, worst, 5).filter((t) => t > 1 && t <= worst)]
  const tickSize = kit.size('meta')
  const plot: Box = {
    left: box.left + 80 * s,
    right: box.right - 340 * s,
    top: box.top + 12 * s,
    bottom: box.bottom - tickSize * 2,
  }
  const toX = (i: number) => plot.left + (i / Math.max(1, m.days.length - 1)) * (plot.right - plot.left)
  const toY = (rank: number) => plot.top + ((rank - 1) / Math.max(1, worst - 1)) * (plot.bottom - plot.top)
  for (const t of ticks) {
    line(ctx, plot.left, toY(t), plot.right, toY(t), palette.grid, 1.3 * s)
    kit.text(`#${t}`, plot.left - 16 * s, toY(t), {
      size: tickSize,
      weight: 400,
      color: palette.tick,
      ha: 'right',
      va: 'center',
    })
  }
  const day = (iso: string) =>
    new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  for (const i of [0, Math.floor((m.days.length - 1) / 2), m.days.length - 1]) {
    const d = m.days[i]
    if (d)
      kit.text(day(d), toX(i), box.bottom, {
        size: tickSize,
        weight: 400,
        color: palette.tick,
        ha: i === 0 ? 'left' : i === m.days.length - 1 ? 'right' : 'center',
        va: 'bottom',
      })
  }
  // Lines, best-ranked last so it sits on top.
  const order = [...m.series.keys()].reverse()
  for (const index of order) {
    const series = m.series[index]
    if (!series) continue
    const color = SERIES[index % SERIES.length] ?? SERIES[0]
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 5 * s
    ctx.lineCap = 'round'
    ctx.beginPath()
    let pen = false
    series.ranks.forEach((r, i) => {
      if (r === null) {
        pen = false
        return
      }
      if (pen) ctx.lineTo(toX(i), toY(r))
      else ctx.moveTo(toX(i), toY(r))
      pen = true
    })
    ctx.stroke()
    ctx.restore()
    series.ranks.forEach((r, i) => {
      const alone = r !== null && series.ranks[i - 1] == null && series.ranks[i + 1] == null
      if (alone) dot(ctx, toX(i), toY(r), 5 * s, color)
    })
  }
  // End labels: icon, name and the last rank, pushed apart so they do not overlap.
  const gap = 52 * s
  const ends = m.series
    .map((x, index) => {
      const i = x.ranks.findLastIndex((r) => r !== null)
      const r = x.ranks[i] ?? worst
      return { x, index, i, r, y: toY(r) }
    })
    .sort((a, b) => a.y - b.y)
  for (let k = 1; k < ends.length; k++) {
    const prev = ends[k - 1]
    const cur = ends[k]
    if (prev && cur && cur.y - prev.y < gap) cur.y = prev.y + gap
  }
  for (const e of ends) {
    const color = SERIES[e.index % SERIES.length] ?? SERIES[0]
    dot(ctx, toX(e.i), toY(e.r), 8 * s, color)
    const size = 40 * s
    const x = plot.right + 36 * s
    kit.icon(e.x.app, x + size / 2, e.y, size)
    const label = kit.fit(`${e.x.app.name} #${e.r}`, 'body', 500, box.right - (x + size + 12 * s))
    kit.text(label.value, x + size + 12 * s, e.y, {
      size: label.size,
      weight: 500,
      color,
      ha: 'left',
      va: 'center',
    })
  }
}

// iOS vs Android ----------------------------------------------------------------------------------------------------------

function dumbbell(kit: Kit, m: Extract<Model, { kind: 'dumbbell' }>, box: Box) {
  const { ctx, s } = kit
  const legendSize = kit.size('meta')
  // Legend.
  let lx = box.left
  for (const [label, color] of [
    [m.left, SERIES[0]],
    [m.right, ANDROID],
  ] as const) {
    dot(ctx, lx + 10 * s, box.top + legendSize / 2, 10 * s, color)
    const t = kit.text(label, lx + 30 * s, box.top + legendSize / 2, {
      size: legendSize,
      weight: 500,
      color: palette.muted,
      ha: 'left',
      va: 'center',
    })
    lx += 30 * s + t.width + 48 * s
  }
  const worst = Math.max(...m.rows.flatMap((r) => [r.left, r.right]), 2)
  const ticks = [1, ...niceTicks(0, worst, 5).filter((t) => t > 1 && t <= worst * 1.05)]
  const tickSize = kit.size('meta')
  const nameW = (box.right - box.left) * 0.3
  const plot: Box = {
    left: box.left + nameW,
    right: box.right - 40 * s,
    top: box.top + legendSize * 2.4,
    bottom: box.bottom - tickSize * 1.8,
  }
  const top = Math.max(...ticks, worst)
  const toX = (rank: number) => plot.left + ((rank - 1) / Math.max(1, top - 1)) * (plot.right - plot.left)
  for (const t of ticks) {
    line(ctx, toX(t), plot.top, toX(t), plot.bottom, palette.grid, 1.3 * s)
    kit.text(`#${t}`, toX(t), box.bottom, {
      size: tickSize,
      weight: 400,
      color: palette.tick,
      ha: 'center',
      va: 'bottom',
    })
  }
  const rowH = (plot.bottom - plot.top) / m.rows.length
  const iconSize = Math.min(52 * s, rowH * 0.6)
  const labelSize = kit.size('meta')
  m.rows.forEach((r, i) => {
    const cy = plot.top + rowH * (i + 0.5)
    kit.icon(r.app, box.left + iconSize / 2, cy, iconSize)
    const name = kit.fit(r.app.name, 'body', 500, nameW - iconSize - 40 * s)
    kit.text(name.value, box.left + iconSize + 16 * s, cy, {
      size: name.size,
      weight: 500,
      color: palette.text,
      ha: 'left',
      va: 'center',
    })
    const [x0, x1] = [toX(r.left), toX(r.right)]
    line(ctx, x0, cy, x1, cy, '#5a5a5a', 6 * s)
    dot(ctx, x0, cy, 11 * s, SERIES[0])
    dot(ctx, x1, cy, 11 * s, ANDROID)
    const leftFirst = x0 <= x1
    const pad = 20 * s
    if (r.left === r.right) {
      kit.text(`#${r.left}`, x0 + pad, cy, {
        size: labelSize,
        weight: 500,
        color: palette.text,
        ha: 'left',
        va: 'center',
      })
    } else {
      kit.text(`#${r.left}`, leftFirst ? x0 - pad : x0 + pad, cy, {
        size: labelSize,
        weight: 500,
        color: SERIES[0],
        ha: leftFirst ? 'right' : 'left',
        va: 'center',
      })
      kit.text(`#${r.right}`, leftFirst ? x1 + pad : x1 - pad, cy, {
        size: labelSize,
        weight: 500,
        color: ANDROID,
        ha: leftFirst ? 'left' : 'right',
        va: 'center',
      })
    }
  })
}

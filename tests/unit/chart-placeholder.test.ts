// While live data loads, the chart frame and each gallery thumbnail show the outline every chart shares (title,
// subtitle, rule, three footnote lines) instead of a spinner per card. Drawn on the canvas: no style attribute, no
// <style> element, no text and no motion.
import { describe, expect, it } from 'vitest'
import { drawPlaceholder, layout, palette, type Ctx } from '~/lib/charts/render'

interface Call {
  name: string
  args: number[]
  fill: string
}

function recordingCtx(): Ctx & { calls: Call[] } {
  const calls: Call[] = []
  const state: Record<string, unknown> = { fillStyle: '' }
  return new Proxy(state, {
    get(t, key) {
      if (key === 'calls') return calls
      if (key in t) return t[key as string]
      return (...args: number[]) => {
        calls.push({ name: String(key), args, fill: String(t.fillStyle) })
      }
    },
    set(t, key, value) {
      t[key as string] = value
      return true
    },
  }) as unknown as Ctx & { calls: Call[] }
}

describe('chart placeholder', () => {
  for (const [width, height] of [
    [1800, 1390],
    [720, 556],
    [1600, 900],
    [1080, 1350],
  ] as const) {
    it(`draws the shared outline inside a ${width} × ${height} frame, with no text`, () => {
      const ctx = recordingCtx()
      drawPlaceholder(ctx, width, height)
      const names = ctx.calls.map((c) => c.name)
      expect(names).not.toContain('fillText')
      expect(names[0]).toBe('fillRect')
      expect(ctx.calls[0]?.args).toEqual([0, 0, width, height])
      expect(ctx.calls[0]?.fill).toBe(palette.bg)
      // Title, subtitle and three footnote lines, in the chart's grid colour.
      const bars = ctx.calls.filter((c) => c.name === 'fill')
      expect(bars).toHaveLength(5)
      for (const bar of bars) expect(bar.fill).toBe(palette.grid)
      expect(names.filter((n) => n === 'stroke')).toHaveLength(1)
      // Every arc stays inside the frame, between the side margins.
      const L = layout({ footnote: ['', '', ''] }, width, height)
      for (const arc of ctx.calls.filter((c) => c.name === 'arc')) {
        const [x = 0, y = 0, r = 0] = arc.args
        expect(x - r).toBeGreaterThanOrEqual(L.padX - 0.001)
        expect(x + r).toBeLessThanOrEqual(width - L.padX + 0.001)
        expect(y - r).toBeGreaterThan(0)
        expect(y + r).toBeLessThan(height)
      }
    })
  }
})

import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

const phones = ['pushup-balanced', 'slick-v5-minimal-clean', 'slick-v5-advanced-clean']

describe('push-up phone artwork', () => {
  for (const phone of phones) {
    for (const width of [240, 480, 800]) {
      it(`${phone}-${width} has transparent corners and an opaque body`, async () => {
        const { data, info } = await sharp(`public/assets/phones/${phone}-${width}.webp`)
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true })
        expect(info.width).toBe(width)
        expect(info.height).toBe(Math.round((2558 * width) / 1181))
        const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3]
        const last = { x: info.width - 1, y: info.height - 1 }
        const corners: [number, number][] = [
          [0, 0],
          [last.x, 0],
          [0, last.y],
          [last.x, last.y],
        ]
        for (const [x, y] of corners) {
          expect(alpha(x, y)).toBe(0)
        }
        expect(alpha(Math.floor(info.width / 2), 0)).toBeGreaterThan(200)
        expect(alpha(0, Math.floor(info.height / 2))).toBeGreaterThan(200)
        expect(alpha(Math.floor(info.width / 2), Math.floor(info.height / 2))).toBe(255)
      })
    }
  }
})

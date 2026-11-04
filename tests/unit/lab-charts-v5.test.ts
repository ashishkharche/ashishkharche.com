import { describe, expect, it } from 'vitest'
import { kindLabel, mapSdkKinds } from '~/lib/charts/live'
import { fileName, trimSlug } from '~/lib/charts/spec'
import { CHART_SIZES, META_MIN_PX, sizeOf } from '~/lib/charts/type'

describe('download file names', () => {
  it('keeps the whole most-sdks title', () => {
    expect(fileName('Most SDKs in one iOS app build', { width: 1800, height: 1390 }, 2, 'png')).toBe(
      'most-sdks-in-one-ios-app-build-3600x2780.png',
    )
  })
  it('cuts long titles at a word boundary, never mid-word', () => {
    const title = 'Which charts in more countries: ChatGPT, Google Gemini and Claude?'
    const name = fileName(title, { width: 1800, height: 1390 }, 1, 'svg')
    const slug = name.replace(/-1800x1390\.svg$/, '')
    expect(slug.length).toBeLessThanOrEqual(60)
    const words = title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
    for (const w of slug.split('-')) expect(words).toContain(w)
    expect(trimSlug('abc-defgh', 6)).toBe('abc')
  })
})

describe('meta size', () => {
  it('is at least 14 px on every export size', () => {
    const sizes: [number, number][] = [
      [1800, 1390],
      [1920, 1080],
      [1200, 1200],
      [1080, 1350],
    ]
    for (const [w, h] of sizes) {
      const s = Math.min(w / 1800, h / 1390)
      expect(sizeOf('meta', s)).toBeGreaterThanOrEqual(META_MIN_PX)
      expect(sizeOf('body', s)).toBeGreaterThanOrEqual(sizeOf('meta', s))
    }
    expect(sizeOf('meta', 1)).toBe(CHART_SIZES.meta)
  })
})

describe('Unknown kinds', () => {
  it('shows Unknown as Other', () => {
    expect(kindLabel('Unknown')).toBe('Other')
    expect(kindLabel('unknown ')).toBe('Other')
    expect(kindLabel('')).toBe('Other')
    expect(kindLabel('Analytics')).toBe('Analytics')
  })
  it('never puts Unknown into the ChatGPT SDK kinds chart', () => {
    const detail = {
      sdkCount: 3,
      sdkListIsFloor: true,
      capturedAt: '2026-10-23T15:27:00Z',
      techStack: {
        sdks: [
          { label: 'Unknown', items: [{ name: 'a' }] },
          { label: 'Analytics', items: [{ name: 'b' }, { name: 'c' }] },
        ],
        extensions: [{ name: 'FinanceKitBackgroundDeliveryExtension', kind: 'Unknown' }],
      },
    }
    const app = { appId: '6448311069', name: 'ChatGPT', rank: 5 } as never
    const out = mapSdkKinds({ data: [] }, detail, app)
    expect(JSON.stringify(out)).not.toMatch(/unknown/i)
  })
})

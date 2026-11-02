// The About the data panel's facts, worked out from answers only: the tracked-apps list, the collector's run
// times and missed runs from one rank history, and the depth of a rankings answer.
import { describe, expect, it } from 'vitest'
import saved from '../fixtures/tdn/live-2026-11-01.json' with { type: 'json' }
import { fixtures } from '../fixtures/tdn/index'
import { collectionRuns, deepestRank, trackedApps } from '~/lib/charts/about'

const answers = saved as Record<string, unknown>

describe('tracked apps', () => {
  it('counts the apps by platform, from the answer', () => {
    const t = trackedApps(fixtures['apps?limit=500'])
    expect(t.ios + t.android).toBe(t.apps.length)
    expect(t.ios).toBe(20)
    expect(t.total).toBe(t.apps.length)
  })

  it('leaves out rows with no real name, and never keeps "Unknown" as a developer', () => {
    const t = trackedApps({
      data: [
        { appId: '1', store: 'apple', name: 'Unknown', iconUrl: 'https://is1-ssl.mzstatic.com/a.png' },
        { appId: '2', store: 'apple', name: 'Notes', developer: 'Unknown', iconUrl: 'https://evil.test/a.png' },
        { appId: '3', store: 'amazon', name: 'Shop' },
        { appId: '2', store: 'apple', name: 'Notes again' },
      ],
      meta: { total: 2 },
    })
    expect(t.apps).toEqual([{ appId: '2', store: 'apple', name: 'Notes', developer: undefined, iconUrl: undefined }])
    expect(t.total).toBe(2)
  })

  it('takes the total from meta when the list is paged', () => {
    expect(trackedApps({ data: [{ appId: '1', store: 'google', name: 'A' }], meta: { total: 151 } }).total).toBe(151)
  })
})

describe('collection runs', () => {
  it('reads two run times a day and counts missed runs in a real history', () => {
    const r = collectionRuns(answers['rank-history?chart=top-free&countries=us&days=30&id=6448311069&store=apple'])
    expect(r.times.length).toBe(2)
    for (const t of r.times) expect(t).toMatch(/^(00|12):\d{2}$/)
    expect(r.points).toBeLessThanOrEqual(r.expected)
    expect(r.expected).toBe(r.days * 2)
  })

  it('has nothing to say about an empty history', () => {
    expect(collectionRuns({ data: { series: [] } })).toMatchObject({ times: [], points: 0, expected: 0 })
    expect(collectionRuns(null).points).toBe(0)
  })

  it('does not count a one-off rerun as a run time', () => {
    const at = (d: number, t: string) => ({ at: `2026-10-${String(d).padStart(2, '0')} ${t}:00`, rank: 3 })
    const points = [
      ...Array.from({ length: 20 }, (_, i) => [at(i + 1, '00:18'), at(i + 1, '12:18')]).flat(),
      at(5, '07:40'),
    ]
    expect(collectionRuns({ data: { series: [{ country: 'us', points }] } }).times).toEqual(['00:18', '12:18'])
  })
})

describe('depth', () => {
  it('is at most 100 in the real answers', () => {
    for (const key of Object.keys(answers).filter((k) => k.startsWith('rankings'))) {
      const d = deepestRank(answers[key])
      expect(d).not.toBeNull()
      expect(d).toBeLessThanOrEqual(100)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { mapSizePercentiles, mapChartReleaseDates, mapTop10Returns, NO_DATA_SENTENCE } from '~/lib/charts/feed'
import { readDailyFeed, readFeedMetrics } from '~/lib/charts/tdn'
import { validateLive, type LiveChart } from '~/lib/charts/live'

const feed = JSON.parse(readFileSync('reports/tdn-v20/daily-feed-2026-11-06.json', 'utf8'))
const size = JSON.parse(readFileSync('reports/tdn-v20/metrics-size-apple-2026-11-06.json', 'utf8'))
const rel = JSON.parse(readFileSync('reports/tdn-v20/metrics-release-apple-2026-11-06.json', 'utf8'))
const metrics = JSON.parse(readFileSync('reports/tdn-v20/daily-feed-metrics-2026-11-06.json', 'utf8'))

function asChart(id: string, mapped: ReturnType<typeof mapSizePercentiles>): LiveChart {
  return {
    templateId: id,
    model: mapped.model as LiveChart['model'],
    text: { ...mapped.text, source: mapped.source },
    dataTime: mapped.dataTime,
    numbers: mapped.numbers,
    coverage: mapped.coverage,
  }
}

describe('live 2026-11-06 payloads', () => {
  it('readers accept live envelopes with new fields', () => {
    expect(readDailyFeed(feed)?.items).toHaveLength(4)
    expect(readFeedMetrics(size)?.items[0]?.kind).toBe('size_percentiles')
    expect(readFeedMetrics(rel)?.items[0]?.kind).toBe('chart_release_dates')
    expect(readFeedMetrics(metrics)?.items).toHaveLength(6)
  })
  it('size_percentiles maps live numbers', () => {
    const m = mapSizePercentiles(size)
    expect(m.empty).toBe(false)
    if (m.model.kind !== 'headline') throw new Error('kind')
    expect(m.model.answer).toBe('1088.4')
    expect(m.model.unit).toBe('MB')
    expect(m.model.sentence).toContain('Tesla')
    expect(m.model.support?.type).toBe('bars')
    if (m.model.support?.type === 'bars') {
      expect(m.model.support.bars[0]?.display).toBe('1088.4')
      expect(m.model.support.bars.every((b) => b.display === b.value.toFixed(1))).toBe(true)
    }
    // Full API names collected from the size table (TDN summary truncated Uber/WayShot earlier).
    const apps = size.data.items[0].table.rows.map((r: { cells: { app: string } }) => r.cells.app)
    expect(apps).toContain('Uber - Rides, Eats, Hotels')
    expect(apps).toContain('WayShot:Aesthetic Photo Editor')
    expect(validateLive(asChart('feed-size-percentiles', m))).toEqual([])
  })
  it('chart_release_dates maps live numbers; table may be a page of total', () => {
    const m = mapChartReleaseDates(rel)
    expect(m.empty).toBe(false)
    if (m.model.kind !== 'leaderboard') throw new Error('kind')
    expect(m.model.rows[0]?.app.name).toBe('Muse from Meta')
    expect(m.model.rows[0]?.display).toBe('8 Sep 2026')
    expect(m.model.rows[0]?.value).toBe(59)
    expect(m.model.rows).toHaveLength(10)
    expect(m.model.barLabel).toBe('Days since release')
    expect(m.text.subtitle).toMatch(/Newest 10 of 64/)
    expect(m.coverage).toMatch(/Newest 10 of 64/)
    expect(validateLive(asChart('feed-release-dates', m))).toEqual([])
  })
  it('top10_returns absent on published day is honest empty, never invented', () => {
    const m = mapTop10Returns(feed)
    expect(m.empty).toBe(true)
    if (m.model.kind !== 'headline') throw new Error('kind')
    expect(m.model.sentence).toBe(NO_DATA_SENTENCE)
    expect(m.model.answer).toBe('None')
    expect(m.coverage).toMatch(/omits the kind when empty|No top10_returns/)
    expect(validateLive(asChart('feed-top10-returns', m))).toEqual([])
  })
})

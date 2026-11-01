// The live templates against answers saved from the deployed proxy on 1 Nov 2026 (12:18 UTC data): the real response
// shapes, including the parts the API reference leaves out (movers mixes stores, tech-stack counts can be over 300).
import { describe, expect, test } from 'vitest'
import saved from '../fixtures/tdn/live-2026-11-01.json' with { type: 'json' }
import { fixtureKey } from '../fixtures/tdn/index'
import { createTdnClient } from '~/lib/charts/tdn'
import { liveTemplates, validateLive, type LiveChart } from '~/lib/charts/live'

const answers = saved as Record<string, unknown>
const savedFetch = async (url: string) => {
  const body = answers[fixtureKey(url)]
  return body === undefined
    ? { ok: false, status: 404, json: async () => ({ error: 'not saved', code: 'not_found' }) }
    : { ok: true, status: 200, json: async () => structuredClone(body) }
}
const load = (id: string, options = {}) => {
  const template = liveTemplates.find((t) => t.id === id)
  if (!template) throw new Error(id)
  return template.load(createTdnClient(savedFetch as never), options)
}

describe('live templates with saved real answers', () => {
  test.each(liveTemplates.map((t) => t.id))('%s maps and passes the data rules', async (id) => {
    const chart: LiveChart = await load(id)
    expect(validateLive(chart)).toEqual([])
    expect(chart.dataTime).toMatch(/^\d{1,2} \w{3} 2026, \d{2}:\d{2} UTC$/)
  })

  test('the highest tracked US app is not #1, and the question says so', async () => {
    const chart = await load('us-number-one')
    expect(chart.text.title).toBe('Which tracked app ranks highest on the US Top Free chart?')
    expect(chart.model.kind === 'headline' && chart.model.answer).toBe('Muse from Meta')
  })

  test('climbers are App Store apps whose rank matches the US Top Free answer', async () => {
    const chart = await load('us-climbers')
    if (chart.model.kind !== 'leaderboard') throw new Error('kind')
    expect(chart.model.rows.every((r) => r.app.store === 'apple')).toBe(true)
    const names = chart.model.rows.map((r) => r.app.name)
    expect(names).not.toContain('Discord')
    expect(names).not.toContain('Microsoft Teams')
    expect(chart.model.rows[0]).toMatchObject({ display: '+33', detail: '#91 to #58' })
  })

  test('SDK counts are the tech-stack totals', async () => {
    const chart = await load('most-sdks')
    if (chart.model.kind !== 'leaderboard') throw new Error('kind')
    expect(chart.model.rows.slice(0, 2).map((r) => r.value)).toEqual([381, 340])
  })

  test('ChatGPT countries and the head to head use the flat app-rankings and compare answers', async () => {
    const countries = await load('chatgpt-countries')
    expect(countries.model.kind === 'headline' && countries.model.answer).toBe('169')
    const h2h = await load('chatgpt-vs-gemini')
    if (h2h.model.kind !== 'head-to-head') throw new Error('kind')
    expect(h2h.model.metrics.map((m) => m.display)).toEqual([
      ['#3', '#14'],
      ['169', '171'],
      ['4.8', '4.7'],
      ['28', '10'],
      ['26', '34'],
    ])
  })
})

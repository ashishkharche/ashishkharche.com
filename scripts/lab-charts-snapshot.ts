// Saves the last good live answers for the chart builder: every request each live template's default chart makes
// (and each store and country of the rank-over-time chart), read through the live data proxy.
//
//   node scripts/lab-charts-snapshot.ts [proxy origin]     (default https://ashishkharche.com)
//
// Writes public/lab/charts/snapshot.json: { savedAt, answers: { "<proxy url>": { body, fetchedAt } } }. The page
// reads it only when the proxy does not answer (a cold cache that times out, or the source down), and labels the
// chart as a kept copy with the time it was fetched. It also writes public/lab/charts/poster.json, the text of the
// default chart that the page shows before scripts run (the image itself comes from scripts/lab-charts-poster.ts).
// Fails, and writes nothing, if any template cannot draw its default chart.
import { writeFile } from 'node:fs/promises'
import { liveTemplates, loadWithFallback, PLACES, validateLive, type PlaceId } from '../src/lib/charts/live.ts'
import { createTdnClient, oldestFetch, trackClient, type KeptAnswer, type Snapshot } from '../src/lib/charts/tdn.ts'

const origin = (process.argv[2] ?? 'https://ashishkharche.com').replace(/\/$/, '')
const out = new URL('../public/lab/charts/', import.meta.url).pathname
const answers: Record<string, KeptAnswer> = {}

const client = createTdnClient(
  async (url) => {
    const response = await fetch(`${origin}${url}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
    })
    const text = await response.text()
    if (response.ok) {
      const fetchedAt = response.headers.get('x-tdn-fetched-at') ?? new Date().toISOString()
      answers[url] = { body: JSON.parse(text), fetchedAt }
    }
    return { ok: response.ok, status: response.status, headers: response.headers, json: async () => JSON.parse(text) }
  },
  { retry: [2, 5, 10], maxInFlight: 3 },
)

const problems: string[] = []
let poster: { templateId: string; title: string; subtitle: string; dataTime: string; fetchedAt: string } | undefined
for (const template of liveTemplates) {
  const places: Array<PlaceId | undefined> = template.pickPlace ? (Object.keys(PLACES) as PlaceId[]) : [undefined]
  for (const place of places) {
    try {
      const tracked = trackClient(client)
      const { chart, note } = await loadWithFallback(template, tracked.client, { place })
      const fetchedAt = oldestFetch(tracked.answers())?.toISOString() ?? ''
      const rules = validateLive(chart)
      if (rules.length) throw new Error(`breaks the chart rules: ${rules.join(' ')}`)
      if (note) throw new Error(`drew a fallback: ${note}`)
      if (!poster && !place) {
        const { title, subtitle } = chart.text
        poster = { templateId: chart.templateId, title, subtitle, dataTime: chart.dataTime, fetchedAt }
      }
      const m = chart.model
      const value =
        m.kind === 'headline'
          ? `${m.answer}${m.unit ? ` ${m.unit}` : ''}`
          : m.kind === 'leaderboard'
            ? `${m.rows[0]?.app.name} ${m.rows[0]?.display}`
            : m.kind === 'dumbbell'
              ? `${m.rows[0]?.app.name} iOS #${m.rows[0]?.left} / Android #${m.rows[0]?.right}`
              : m.kind === 'bump'
                ? m.series.map((x) => `${x.app.name} #${x.ranks.findLast((r) => r !== null)}`).join(', ')
                : m.metrics.map((x) => `${x.label} ${x.display.join(' vs ')}`).join('; ')
      console.log(
        `ok   ${template.id}${place ? ` (${place})` : ''}: ${chart.text.title} | ${value} | data ${chart.dataTime} | fetched ${fetchedAt}`,
      )
    } catch (error) {
      problems.push(`${template.id}${place ? ` (${place})` : ''}: ${(error as Error).message}`)
    }
  }
}
const missing = client.requested.filter((u) => !answers[u])
if (missing.length) console.warn(`Not kept (the proxy did not answer): ${missing.join(', ')}`)
if (problems.length || !poster) {
  console.error(`Not saved. These templates could not draw:\n${problems.join('\n')}`)
  process.exit(1)
}
const snapshot: Snapshot = { savedAt: new Date().toISOString(), answers }
await writeFile(`${out}snapshot.json`, `${JSON.stringify(snapshot)}\n`)
await writeFile(`${out}poster.json`, `${JSON.stringify({ ...poster, savedAt: snapshot.savedAt }, null, 2)}\n`)
console.log(`Saved ${Object.keys(answers).length} answers to public/lab/charts/snapshot.json`)

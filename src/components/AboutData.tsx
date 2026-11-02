import * as stylex from '@stylexjs/stylex'
import { useEffect, useRef, useState } from 'react'
import { collectionRuns, deepestRank, trackedApps, type TrackedApp } from '~/lib/charts/about'
import { getHistory, getRankings, plainName, retryDelay, sortedRankings } from '~/lib/charts/live'
import { formatDataTime, recordedAt, type TdnClient } from '~/lib/charts/tdn'
import { breakpoints, colors, fonts, type as text, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export interface AboutEntry {
  id: string
  name: string
  field: string
  pending?: string
}

type Facts = {
  tracked: ReturnType<typeof trackedApps>
  recordedAt: string
  fetchedAt: string
  deepest: number | null
  runs: ReturnType<typeof collectionRuns>
  runsApp: string
}

const HISTORY_DAYS = 30

/**
 * What the charts are drawn from, all read from the live answers: the tracked apps, when the collector runs and how
 * often it missed, how deep the charts go, and each template's field and measured coverage. It loads when it comes
 * near the screen, and its rankings and history requests are the same ones the templates make, so they are shared.
 * A failed load is asked again like the chart's (soon, then once a minute) while the panel says it is waiting: it
 * never shows an error.
 */
export function AboutData({
  id,
  client,
  entries,
  coverage,
}: {
  id: string
  client: TdnClient
  entries: AboutEntry[]
  coverage: Record<string, string>
}) {
  const ref = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(false)
  const [facts, setFacts] = useState<Facts | null>(null)
  /** Failed loads so far; each one is asked again after retryDelay. */
  const [failures, setFailures] = useState(0)
  const [broken, setBroken] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const box = ref.current
    if (!box || seen) return
    const observer = new IntersectionObserver((list) => list.some((e) => e.isIntersecting) && setSeen(true), {
      rootMargin: '200px',
    })
    observer.observe(box)
    return () => observer.disconnect()
  }, [seen])

  useEffect(() => {
    if (!seen || facts) return
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined
    ;(async () => {
      const [apps, rankings] = await Promise.all([client.get('apps', { limit: 500 }), getRankings(client)])
      const rows = sortedRankings(rankings)
      // The collector's runs, read from an app that is always in the top 100, so a missing point is a missed run.
      const steady = rows.find((r) => /^chatgpt$/i.test(plainName(r.name))) ?? rows[0]
      const history = steady ? await getHistory(client, steady.appId, HISTORY_DAYS) : null
      const recorded = recordedAt(rankings)
      return {
        tracked: trackedApps(apps),
        recordedAt: recorded ? formatDataTime(recorded) : '',
        fetchedAt: formatDataTime(new Date()),
        deepest: deepestRank(rankings),
        runs: collectionRuns(history),
        runsApp: steady ? plainName(steady.name) : '',
      }
    })().then(
      (f) => !cancelled && setFacts(f),
      () => {
        if (cancelled) return
        retry = setTimeout(() => setFailures((n) => n + 1), retryDelay(failures) * 1000)
      },
    )
    return () => {
      cancelled = true
      clearTimeout(retry)
    }
  }, [seen, client, facts, failures])

  const headingId = `${id}-about-data`
  const live = entries.filter((e) => !e.pending)
  const pending = entries.filter((e) => e.pending)
  const group = (store: TrackedApp['store']) => facts?.tracked.apps.filter((a) => a.store === store) ?? []

  return (
    <section ref={ref} aria-labelledby={headingId} data-testid="about-data" {...stylex.props(styles.about)}>
      <h2 id={headingId} {...stylex.props(styles.title)}>
        About the data
      </h2>
      {!facts ? (
        <p role="status" aria-busy="true" {...stylex.props(styles.text)}>
          {failures ? 'Waiting for live data. Asking again…' : 'Loading the data facts…'}
        </p>
      ) : (
        <dl {...stylex.props(styles.facts)}>
          <div {...stylex.props(styles.fact)}>
            <dt {...stylex.props(styles.term)}>Source</dt>
            <dd {...stylex.props(styles.text)}>
              Public App Store and Google Play chart data and app build analysis, read through this site’s data proxy
              when the page loads.
            </dd>
          </div>
          <div {...stylex.props(styles.fact)}>
            <dt {...stylex.props(styles.term)}>Tracked apps</dt>
            <dd {...stylex.props(styles.text)}>
              <span data-testid="tracked-count">
                {facts.tracked.total} apps: {facts.tracked.ios} iOS, {facts.tracked.android} Android.
              </span>{' '}
              Ranks and ratings are collected for these apps only, so ranked lists show tracked apps, not the whole
              chart.
              <details {...stylex.props(styles.details)}>
                <summary {...stylex.props(styles.summary, ui.focusRing)}>
                  Show the {facts.tracked.apps.length} tracked apps
                </summary>
                {(['apple', 'google'] as const).map((store) => (
                  <div key={store} {...stylex.props(styles.platform)}>
                    <h3 {...stylex.props(styles.term)}>
                      {store === 'apple' ? 'iOS' : 'Android'}, {group(store).length}
                    </h3>
                    <ul {...stylex.props(styles.apps)}>
                      {group(store).map((a) => (
                        <li key={`${a.store}:${a.appId}`} {...stylex.props(styles.app)}>
                          {a.iconUrl && !broken.has(a.iconUrl) ? (
                            <img
                              src={a.iconUrl}
                              alt=""
                              width={20}
                              height={20}
                              loading="lazy"
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={() => setBroken((b) => new Set(b).add(a.iconUrl ?? ''))}
                              {...stylex.props(styles.icon)}
                            />
                          ) : (
                            <span aria-hidden="true" {...stylex.props(styles.iconSpace)} />
                          )}
                          <span {...stylex.props(styles.appName)}>
                            {a.name}
                            {a.developer ? <span {...stylex.props(styles.developer)}> · {a.developer}</span> : null}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </details>
            </dd>
          </div>
          <div {...stylex.props(styles.fact)}>
            <dt {...stylex.props(styles.term)}>Collection</dt>
            <dd {...stylex.props(styles.text)} data-testid="collection">
              {facts.runs.times.length ? (
                <>
                  {facts.runs.times.length} runs a day, usually at {facts.runs.times.join(' and ')} UTC, read from{' '}
                  {facts.runsApp}’s US rank history. {facts.runs.points} of {facts.runs.expected} runs over{' '}
                  {facts.runs.days} days have a point; a missing run is a failed collection.
                </>
              ) : (
                'The rank history has no points to read the run times from.'
              )}
            </dd>
          </div>
          <div {...stylex.props(styles.fact)}>
            <dt {...stylex.props(styles.term)}>Depth and window</dt>
            <dd {...stylex.props(styles.text)} data-testid="depth">
              Only the top 100 of each chart is kept
              {facts.deepest ? `: the deepest rank in the latest US Top Free answer is #${facts.deepest}` : ''}. Rank
              history is kept for 45 days; these charts use the last {HISTORY_DAYS}.
            </dd>
          </div>
          <div {...stylex.props(styles.fact)}>
            <dt {...stylex.props(styles.term)}>Last fetched</dt>
            <dd {...stylex.props(styles.text)} data-testid="fetched">
              {facts.recordedAt ? `US Top Free recorded ${facts.recordedAt}. ` : ''}Read by this page at{' '}
              {facts.fetchedAt}; answers are cached for up to an hour. Requests made so far: {client.requested.length}.
            </dd>
          </div>
        </dl>
      )}
      <h3 id={`${headingId}-coverage`} {...stylex.props(styles.subhead)}>
        Coverage per template
      </h3>
      {/* Wider than a phone: it scrolls sideways, so it can take focus and be scrolled with the keyboard. */}
      <div
        role="region"
        aria-labelledby={`${headingId}-coverage`}
        // A scrolling region must be reachable by keyboard (axe scrollable-region-focusable).
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        {...stylex.props(styles.tableBox, ui.focusRing)}
      >
        <table {...stylex.props(styles.table)}>
          <thead>
            <tr>
              <th scope="col" {...stylex.props(styles.th)}>
                Template
              </th>
              <th scope="col" {...stylex.props(styles.th)}>
                Field
              </th>
              <th scope="col" {...stylex.props(styles.th)}>
                Coverage
              </th>
            </tr>
          </thead>
          <tbody>
            {live.map((e) => (
              <tr key={e.id} data-template={e.id}>
                <th scope="row" {...stylex.props(styles.td, styles.rowHead)}>
                  {e.name}
                </th>
                <td {...stylex.props(styles.td)}>{e.field}</td>
                <td {...stylex.props(styles.td)}>{coverage[e.id] ?? 'Measured when its preview loads.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pending.length ? (
        <>
          <h3 {...stylex.props(styles.subhead)}>Pending verification</h3>
          <p {...stylex.props(styles.text)}>
            Not in the default gallery until their fields are checked against the API.
          </p>
          <ul {...stylex.props(styles.list)}>
            {pending.map((e) => (
              <li key={e.id}>
                {e.name}: {e.pending}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

const styles = stylex.create({
  about: {
    order: { default: 0, [breakpoints.tablet]: 3 },
    minWidth: 0,
    paddingTop: { default: '32px', [breakpoints.tablet]: '24px' },
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
  },
  title: { fontFamily: fonts.serif, fontSize: text.lead, fontWeight: weights.regular, lineHeight: 1.3 },
  facts: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    columnGap: '40px',
    rowGap: '24px',
    marginTop: '16px',
  },
  fact: { minWidth: 0 },
  term: { fontSize: text.meta, fontWeight: weights.medium, lineHeight: 1.5 },
  text: { marginTop: '4px', fontSize: text.meta, fontWeight: weights.regular, color: colors.muted, lineHeight: 1.5 },
  details: { marginTop: '8px' },
  summary: { cursor: 'pointer', color: colors.text, fontWeight: weights.medium, width: 'fit-content' },
  platform: { marginTop: '12px' },
  apps: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [breakpoints.phone]: 'minmax(0, 1fr)' },
    columnGap: '16px',
    rowGap: '6px',
    marginTop: '8px',
    listStyle: 'none',
    padding: 0,
  },
  app: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
  icon: { flexShrink: 0, borderRadius: '5px' },
  iconSpace: { flexShrink: 0, width: '20px', height: '20px' },
  appName: { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: colors.text },
  developer: { color: colors.muted },
  subhead: { marginTop: '32px', fontSize: text.body, fontWeight: weights.medium, lineHeight: 1.5 },
  tableBox: { marginTop: '8px', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: text.meta, lineHeight: 1.5, minWidth: '560px' },
  th: {
    textAlign: 'left',
    fontWeight: weights.medium,
    paddingBlock: '8px',
    paddingRight: '16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.line,
  },
  td: {
    textAlign: 'left',
    verticalAlign: 'top',
    fontWeight: weights.regular,
    color: colors.muted,
    paddingBlock: '8px',
    paddingRight: '16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.line,
  },
  rowHead: { color: colors.text },
  list: {
    marginTop: '8px',
    paddingLeft: '16px',
    color: colors.muted,
    fontSize: text.meta,
    lineHeight: 1.5,
    display: 'grid',
    gap: '4px',
  },
})

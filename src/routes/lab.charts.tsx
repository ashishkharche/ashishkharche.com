import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { ChartBuilder } from '~/components/ChartBuilder'
import { Main } from '~/components/Main'
import { seo } from '~/lib/seo'
import { xImageSources } from '~/lib/charts/spec'
import { breakpoints, colors, fonts, type as text, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export const chartBuilderMeta = {
  path: '/lab/charts/',
  title: 'Chart builder',
  description:
    'Charts of App Store, Google Play and app build data, read live when the page loads. Download as PNG or SVG.',
} as const

export const Route = createFileRoute('/lab/charts')({
  head: () => seo(chartBuilderMeta),
  component: LabCharts,
})

function LabCharts() {
  // The builder draws on a canvas in the browser, so it is only shown once scripts run.
  const ready = useSyncExternalStore(noop, isClient, isServer)
  return (
    <Main>
      <div {...stylex.props(ui.wrap)}>
        <header>
          <h1 {...stylex.props(styles.title)}>Chart builder</h1>
          <p {...stylex.props(styles.lead)}>{chartBuilderMeta.description}</p>
        </header>
        <div {...stylex.props(styles.builder)}>
          {ready ? <ChartBuilder /> : null}
          <noscript>
            <p {...stylex.props(styles.noscript)}>The chart builder needs JavaScript.</p>
          </noscript>
        </div>
        <div {...stylex.props(styles.notes)}>
          <section aria-labelledby="rules">
            <h2 id="rules" {...stylex.props(styles.heading)}>
              Data rules
            </h2>
            <p {...stylex.props(styles.text)}>Downloads are off while a chart breaks one of these.</p>
            <ul {...stylex.props(styles.list)}>
              <li>Every number on a chart comes from the data loaded for it.</li>
              <li>Live charts show when the data was recorded. If it cannot be loaded, no chart is shown.</li>
              <li>Scatter charts use data files and show their date. They are not live.</li>
              <li>A rank is shown with its coverage: the number of countries where the app charts.</li>
              <li>Ranks are not averaged over only the countries where an app charts.</li>
              <li>If unranked countries get a stand-in rank, the footnote says so.</li>
              <li>Builds older than 60 days are labelled or counted in the footnote.</li>
              <li>Counts the source marks as a lower bound say so on the chart.</li>
              <li>
                Three footnote lines of up to 110 characters, the first starting with “Source:”. No logo or site name.
              </li>
            </ul>
          </section>
          <section aria-labelledby="sizes">
            <h2 id="sizes" {...stylex.props(styles.heading)}>
              Sizes
            </h2>
            <p {...stylex.props(styles.text)}>
              X shows a single image in full between 2:1 and 3:4, up to 5 MB (
              <a href={xImageSources.help} {...stylex.props(ui.link)}>
                X Help Center
              </a>
              ). All four sizes fit, 4:5 (1080 × 1350) included. 1200 × 1200 and 1920 × 1080 are the square and 16:9
              sizes in the X{' '}
              <a href={xImageSources.adSpecs} {...stylex.props(ui.link)}>
                ad specifications
              </a>
              . PNGs export at 2x unless 1x is picked.
            </p>
          </section>
        </div>
      </div>
    </Main>
  )
}

const noop = () => () => {}
const isClient = () => true
const isServer = () => false

const styles = stylex.create({
  title: {
    fontFamily: fonts.serif,
    fontSize: text.title,
    fontWeight: weights.regular,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  lead: { marginTop: '8px', fontSize: text.body, lineHeight: 1.5, color: colors.muted, maxWidth: '36em' },
  builder: { marginTop: '32px' },
  noscript: { color: colors.muted, fontSize: text.body },
  notes: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    gap: '40px',
    marginTop: '64px',
    paddingTop: '32px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
  },
  heading: { fontSize: text.body, fontWeight: weights.medium, lineHeight: 1.5 },
  text: { marginTop: '8px', color: colors.muted, fontSize: text.meta, lineHeight: 1.5 },
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

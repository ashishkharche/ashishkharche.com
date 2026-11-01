import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { ChartBuilder } from '~/components/ChartBuilder'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { seo } from '~/lib/seo'
import { xImageSources } from '~/lib/charts/spec'
import { colors } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export const chartBuilderMeta = {
  path: '/lab/charts/',
  title: 'Chart builder',
  description:
    'Make dark scatter charts of app store and app build data, check them against the data rules, and download a PNG or SVG sized for X.',
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
        <PageHead
          title="Chart builder"
          lead="Start from a template, change the title, axes and labelled points, and download a PNG or SVG sized for X."
        />
        <div {...stylex.props(ui.mt2)}>
          {ready ? <ChartBuilder /> : null}
          <noscript>
            <p {...stylex.props(styles.noscript)}>The chart builder runs in your browser, so it needs JavaScript.</p>
          </noscript>
        </div>
        <section aria-labelledby="rules" {...stylex.props(styles.about)}>
          <h2 id="rules" {...stylex.props(ui.h3)}>
            The data rules
          </h2>
          <p {...stylex.props(styles.text)}>
            Every chart is checked before it is drawn, and one that breaks a rule cannot be downloaded:
          </p>
          <ul {...stylex.props(styles.list)}>
            <li>A rank is always shown with its coverage, the number of countries it charts in.</li>
            <li>Ranks are never averaged over only the countries where an app charts.</li>
            <li>If unranked countries are given a stand-in rank, the footnote says so.</li>
            <li>Out-of-date builds are labelled or counted in the footnote, with the snapshot date.</li>
            <li>Counts the source calls a lower bound say so on the chart.</li>
            <li>Three grey footnote lines, the first starting with “Source:”, and no logo or site name.</li>
          </ul>
        </section>
        <section aria-labelledby="sizes" {...stylex.props(styles.about)}>
          <h2 id="sizes" {...stylex.props(ui.h3)}>
            About the sizes
          </h2>
          <p {...stylex.props(styles.text)}>
            X shows a single image in full when its shape is between 2:1 and 3:4, and photos can be up to 5 MB (
            <a href={xImageSources.help} {...stylex.props(ui.link)}>
              X Help Center
            </a>
            ). All three sizes here fit that range. X lists 1200 × 1200 for square image ads and 1920 × 1080 for 16:9
            video ads in its{' '}
            <a href={xImageSources.adSpecs} {...stylex.props(ui.link)}>
              ad specifications
            </a>
            . The first size keeps the layout of the original charts. PNGs download at twice the size for a sharper
            image unless you pick 1x.
          </p>
        </section>
      </div>
    </Main>
  )
}

const noop = () => () => {}
const isClient = () => true
const isServer = () => false

const styles = stylex.create({
  noscript: { color: colors.muted },
  about: { marginTop: '3rem', maxWidth: '40rem' },
  text: { marginTop: '0.6rem', color: colors.muted, fontSize: '1rem' },
  list: {
    marginTop: '0.6rem',
    paddingLeft: '1.2rem',
    color: colors.muted,
    fontSize: '1rem',
    display: 'grid',
    gap: '0.3rem',
  },
})

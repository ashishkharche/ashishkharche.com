import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { RailNumber } from '~/components/RailNumber'
import { NoteList, type NoteItem } from '~/components/NoteList'
import { comingNotes, noteListSummary, notes } from '~/content/notes'
import { formatShortDate } from '~/lib/dates'
import { feedPath } from '~/lib/feed'
import { seo } from '~/lib/seo'
import { space, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export const Route = createFileRoute('/notes/')({
  head: () =>
    seo({
      path: '/notes/',
      title: 'Notes',
      description: 'Technical notes by Ashish Kharche: Reflex, and a series on how Workout Director is built.',
    }),
  component: Notes,
})

/** A line under each series heading on the notes page. */
const seriesLeads: Record<string, string> = {
  Reflex: 'Testing iOS and Android app logic without a screen.',
  'How Workout Director is built': 'A series on the iPhone app and its backend.',
}

const wdSeries = 'How Workout Director is built'

function toItem(note: (typeof notes)[number]): NoteItem {
  return {
    title: note.title,
    href: note.path,
    meta: `${formatShortDate(note.date)}, ${note.listLabel}`,
    summary: noteListSummary(note),
  }
}

function Notes() {
  const reflex = notes.filter((note) => note.series === 'Reflex').map(toItem)
  const wd = notes.filter((note) => note.series === wdSeries)
  const coming: NoteItem[] = comingNotes.map((title, index) => ({
    title,
    meta: `Part ${wd.length + index + 1}`,
  }))
  return (
    <Main>
      <PageHead title="Notes" lead="Technical notes on things I've built." figure="curl" />
      <section aria-labelledby="reflex-title" {...stylex.props(ui.wrap, ui.rail, styles.first)}>
        <div {...stylex.props(ui.railText)}>
          <RailNumber n="01" />
        </div>
        <div {...stylex.props(styles.body)}>
          <h2 id="reflex-title" {...stylex.props(ui.h2)}>
            Reflex
          </h2>
          <p {...stylex.props(ui.muted, styles.sub)}>{seriesLeads.Reflex}</p>
          <NoteList items={reflex} columns={2} />
        </div>
      </section>
      <section aria-labelledby="series-title" {...stylex.props(ui.wrap, ui.penSection, ui.rail)}>
        <div {...stylex.props(ui.railText)}>
          <RailNumber n="02" />
        </div>
        <div {...stylex.props(styles.body)}>
          <h2 id="series-title" {...stylex.props(ui.h2)}>
            {wdSeries}
          </h2>
          <p {...stylex.props(ui.muted, styles.sub)}>{seriesLeads[wdSeries]}</p>
          <NoteList items={wd.map(toItem)} columns={2} />
          <div {...stylex.props(styles.coming)}>
            <p {...stylex.props(ui.muted, styles.comingTitle)}>Coming next</p>
            <NoteList items={coming} compact />
            <p {...stylex.props(ui.muted, styles.feed)}>
              New notes are also in the{' '}
              <a href={feedPath} type="application/atom+xml" {...stylex.props(ui.link)}>
                Atom feed
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </Main>
  )
}

const styles = stylex.create({
  first: { marginTop: space.s48 },
  body: { minWidth: 0 },
  sub: { marginTop: space.s8, marginBottom: space.s48 },
  coming: { marginTop: space.s96, maxWidth: '34rem' },
  comingTitle: { marginTop: 0, marginBottom: space.s16, fontSize: type.meta, fontWeight: weights.medium },
  feed: { marginTop: space.s48, fontSize: type.body },
})

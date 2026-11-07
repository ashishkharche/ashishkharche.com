import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { Figure, Leg, legSpace } from '~/components/Scene'
import { NoteList, type NoteItem } from '~/components/NoteList'
import { comingNotes, noteListSummary, notes } from '~/content/notes'
import { formatShortDate } from '~/lib/dates'
import { feedPath } from '~/lib/feed'
import { seo } from '~/lib/seo'
import { type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export const Route = createFileRoute('/notes/')({
  head: () =>
    seo({
      path: '/notes/',
      title: 'Notes',
      description: 'Technical notes by Ashish Kharche, starting with a series on how Workout Director is built.',
    }),
  component: Notes,
})

function Notes() {
  const published: NoteItem[] = notes.map((note) => ({
    title: note.title,
    href: note.path,
    meta: `${formatShortDate(note.date)} · ${note.listLabel}`,
    summary: noteListSummary(note),
  }))
  const coming: NoteItem[] = comingNotes.map((title, index) => ({
    title,
    meta: `Part ${notes.length + index + 1}`,
  }))
  return (
    <Main>
      <Leg from="edge" as="div" xstyle={legSpace.first}>
        <div {...stylex.props(legSpace.headScene)}>
          <div {...stylex.props(legSpace.headText)}>
            <PageHead title="Notes" lead="Technical notes on things I've built." />
          </div>
          <Figure name="curl" xstyle={legSpace.headFigure} />
        </div>
      </Leg>
      <section aria-labelledby="series-title">
        {/* Each note on a stake of its own, down the side the line comes from. */}
        <Leg from="right" as="div" stroke={2} xstyle={legSpace.text}>
          <div {...stylex.props(legSpace.column)}>
            <h2 id="series-title" {...stylex.props(ui.h2)}>
              How Workout Director is built
            </h2>
            <p {...stylex.props(ui.muted, styles.sub)}>A series on the iPhone app and its backend.</p>
            <NoteList items={published} posts="column" />
          </div>
        </Leg>
        <Leg from="left" to="edge" as="div" xstyle={legSpace.text}>
          <div {...stylex.props(legSpace.column)}>
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
        </Leg>
      </section>
    </Main>
  )
}

const styles = stylex.create({
  sub: { marginTop: '0.3rem', marginBottom: '2.25rem' },
  comingTitle: { marginTop: 0, marginBottom: '1.25rem', fontSize: type.meta, fontWeight: weights.medium },
  feed: { marginTop: '3rem', fontSize: type.body },
})

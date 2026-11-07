import { noteOgImage } from '~/content/ogImages'
import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Diagram } from '~/components/Diagram'
import { ThemedFigures } from '~/components/Figures'
import { Shots } from '~/components/Screens'
import { Main } from '~/components/Main'
import { SketchArrow } from '~/components/SketchArrow'
import { Muted, Prose, mdxComponents } from '~/components/Prose'
import { Figure, Leg, legSpace } from '~/components/Scene'
import { getNoteBody } from '~/content/noteBodies'
import { getNote } from '~/content/notes'
import { formatLongDate } from '~/lib/dates'
import { seo } from '~/lib/seo'
import { jsonLdScript, noteJsonLd } from '~/lib/structuredData'
import dates from 'virtual:content-dates'
import { colors, fonts, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export const Route = createFileRoute('/notes/$slug')({
  loader: ({ params }) => {
    const note = getNote(params.slug)
    if (!note) throw notFound()
    return note
  },
  head: ({ loaderData }) =>
    loaderData
      ? {
          ...seo({
            path: loaderData.path,
            title: loaderData.title,
            description: loaderData.description,
            type: 'article',
            image: noteOgImage(loaderData.slug),
          }),
          scripts: [jsonLdScript(noteJsonLd(loaderData, dates.notes[loaderData.slug]?.updated))],
        }
      : {},
  component: NotePage,
})

function NotePage() {
  const note = Route.useLoaderData()
  const Body = getNoteBody(note.slug)
  if (!Body) throw notFound()
  return (
    <Main>
      <Prose as="article" aria-labelledby="post-title">
        {/* The title stands on the first stretch of the line; the text runs down beside it, the line on the right. */}
        <Leg from="edge" as="header" xstyle={legSpace.first}>
          <div {...stylex.props(legSpace.headScene)}>
            <div {...stylex.props(legSpace.headText)}>
              <Link to="/notes/" {...stylex.props(styles.back, ui.focusRing)}>
                <SketchArrow dir="left" /> Notes
              </Link>
              <p {...stylex.props(styles.meta)}>
                <time dateTime={note.date}>{formatLongDate(note.date)}</time> · {note.series}, part {note.part}
              </p>
              <h1 id="post-title" {...stylex.props(styles.title)}>
                {note.title}
              </h1>
            </div>
            <Figure name="squat" xstyle={legSpace.headFigure} />
          </div>
        </Leg>
        <Leg from="right" to="edge" as="div" xstyle={legSpace.text}>
          <div {...stylex.props(styles.body, legSpace.column)}>
            {/* Body comes from a module-level map of compiled MDX files; nothing is created here. */}
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Body components={{ ...mdxComponents, Diagram, Shots, ThemedFigures, Muted }} />
          </div>
        </Leg>
      </Prose>
    </Main>
  )
}

const styles = stylex.create({
  back: {
    display: 'inline-block',
    marginBottom: '1.75rem',
    fontSize: type.meta,
    color: { default: colors.muted, ':hover': colors.accent },
    textDecorationLine: 'none',
  },
  meta: { color: colors.muted, fontSize: type.meta },
  title: {
    marginTop: '0.6rem',
    fontFamily: fonts.serif,
    fontSize: type.title,
    lineHeight: 1.15,
    textWrap: 'balance',
    fontWeight: weights.regular,
    letterSpacing: '-0.012em',
  },
  body: { minWidth: 0 },
})

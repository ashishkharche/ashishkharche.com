import { NoteBanner, hasNoteBanner } from '~/components/NoteBanner'
import { noteOgImage } from '~/content/ogImages'
import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { Diagram } from '~/components/Diagram'
import { ThemedFigures } from '~/components/Figures'
import { Shots } from '~/components/Screens'
import { Main } from '~/components/Main'
import { SketchArrow } from '~/components/SketchArrow'
import { Muted, Prose, mdxComponents } from '~/components/Prose'
import { PageHead } from '~/components/PageHead'
import headings from 'virtual:note-headings'
import { getNoteBody } from '~/content/noteBodies'
import { getNote } from '~/content/notes'
import { formatLongDate } from '~/lib/dates'
import { seo } from '~/lib/seo'
import { jsonLdScript, noteJsonLd } from '~/lib/structuredData'
import dates from 'virtual:content-dates'
import { breakpoints, colors, leading, space, type } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'
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
  const hasBanner = hasNoteBanner(note.slug)
  const toc = headings[note.slug] ?? []
  if (!Body) throw notFound()
  return (
    <Main>
      <Prose as="article" aria-labelledby="post-title">
        <PageHead
          size="title"
          titleId="post-title"
          title={note.title}
          figure={hasBanner ? undefined : 'squat'}
          meta={
            <>
              <Link to="/notes/" {...stylex.props(styles.back, ui.focusRing)}>
                <SketchArrow dir="left" /> Notes
              </Link>
              <p>
                <time dateTime={note.date}>{formatLongDate(note.date)}</time>, {note.series}, part {note.part}
              </p>
            </>
          }
        >
          {hasBanner ? <NoteBanner slug={note.slug} page /> : null}
        </PageHead>
        <div {...stylex.props(ui.wrap, ui.rail, styles.row)}>
          {/* A drawn contents list in the rail on wide screens; long notes only. */}
          {toc.length >= 4 ? (
            <nav aria-label="Contents" {...stylex.props(styles.toc)}>
              <p {...stylex.props(sk.ruleBottom, styles.tocTitle)}>Contents</p>
              <ol role="list" {...stylex.props(styles.tocList)}>
                {toc.map((item) => (
                  <li key={item.id}>
                    <a href={`#${item.id}`} {...stylex.props(styles.tocLink, ui.focusRing)}>
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          ) : (
            <span />
          )}
          <div data-note-body {...stylex.props(styles.body)}>
            {/* Body comes from a module-level map of compiled MDX files; nothing is created here. */}
            {/* eslint-disable-next-line react-hooks/static-components */}
            <Body components={{ ...mdxComponents, Diagram, Shots, ThemedFigures, Muted }} />
          </div>
        </div>
      </Prose>
    </Main>
  )
}

const styles = stylex.create({
  row: { marginTop: { default: space.s48, [breakpoints.phone]: space.s24 } },
  back: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35em',
    minHeight: '2.75rem',
    fontSize: type.meta,
    color: { default: colors.muted, ':hover': colors.accent },
    textDecorationLine: 'none',
  },
  body: { minWidth: 0 },
  // The contents list stays in view in the rail as you read. Hidden below 1100px, where the rail sits on top.
  toc: {
    display: { default: 'block', [breakpoints.tablet]: 'none' },
    position: 'sticky',
    top: space.s24,
    alignSelf: 'start',
    paddingTop: space.s16,
    fontSize: type.meta,
    lineHeight: leading.meta,
  },
  tocTitle: { color: colors.muted, paddingBottom: space.s8, marginBottom: space.s8 },
  tocList: { listStyle: 'none', display: 'grid', rowGap: space.s8 },
  tocLink: {
    color: { default: colors.muted, ':hover': colors.text },
    textDecorationLine: 'none',
    textWrap: 'balance',
  },
})

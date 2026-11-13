import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { breakpoints, colors, space, type, weights } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'
import { SketchArrow } from './SketchArrow'
import { NoteBanner, hasNoteBanner } from './NoteBanner'

export interface NoteItem {
  title: string
  /** Internal path. Items without one (planned notes) are shown muted, without a link. */
  href?: string
  /** A short line under the title, such as the date and the part of the series. */
  meta: string
  summary?: string
}

/**
 * A list of notes separated by space rather than rules. Each note is a title,
 * a muted meta line and an optional summary. The title is the link, and it is
 * stretched over the whole note so the note can be clicked anywhere. Hovering
 * the note darkens and nudges the arrow; keyboard focus draws a ring around
 * the whole note.
 */
export function NoteList({
  items,
  compact = false,
  columns,
}: {
  items: NoteItem[]
  compact?: boolean
  /** Notes side by side on wide screens, two or three to a row; one under another below 1100px. */
  columns?: 2 | 3
}) {
  return (
    <ul
      role="list"
      {...stylex.props(
        styles.list,
        compact && styles.listCompact,
        columns === 2 && styles.grid2,
        columns === 3 && styles.grid3,
      )}
    >
      {items.map((item) => (
        <li
          key={item.title}
          {...stylex.props(stylex.defaultMarker(), styles.item, item.href !== undefined && styles.linked)}
        >
          {bannerSlug(item.href) ? (
            <div data-note-banner {...stylex.props(styles.banner)}>
              <NoteBanner slug={bannerSlug(item.href) ?? ''} />
              {/* The picture stands on a pen line, like the figures of the footer drawing. */}
              <span aria-hidden="true" {...stylex.props(sk.rule, styles.ground)} />
            </div>
          ) : null}
          <h3 {...stylex.props(styles.title)}>
            {item.href === undefined ? (
              <span {...stylex.props(styles.muted)}>{item.title}</span>
            ) : (
              <Link to={item.href} {...stylex.props(stylex.defaultMarker(), styles.link)}>
                {item.title}
                <span aria-hidden="true" {...stylex.props(styles.arrow)}>
                  <SketchArrow />
                </span>
              </Link>
            )}
          </h3>
          <p {...stylex.props(styles.meta)}>{item.meta}</p>
          {item.summary ? <p {...stylex.props(styles.summary)}>{item.summary}</p> : null}
        </li>
      ))}
    </ul>
  )
}

/** The slug of a note link that has a banner, or undefined. */
function bannerSlug(href: string | undefined): string | undefined {
  const slug = /^\/notes\/([a-z0-9-]+)\/$/.exec(href ?? '')?.[1]
  return slug && hasNoteBanner(slug) ? slug : undefined
}

const styles = stylex.create({
  banner: { position: 'relative', minWidth: 0, paddingBottom: '0.5rem', marginBottom: space.s24 },
  ground: { position: 'absolute', left: '-2%', right: '-2%', bottom: 0, marginBlock: 0 },
  list: {
    listStyle: 'none',
    display: 'grid',
    rowGap: space.s48,
  },
  listCompact: { rowGap: '1.25rem' },
  grid2: {
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    columnGap: space.s48,
    rowGap: space.s48,
  },
  grid3: {
    gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    columnGap: space.s48,
    rowGap: space.s48,
  },
  item: {
    position: 'relative',
    display: 'grid',
    alignContent: 'start',
    rowGap: 0,
    borderRadius: '6px',
  },
  // The focus ring goes round the whole note, since the whole note is the link's target.
  linked: {
    outline: { default: null, [stylex.when.descendant(':focus-visible')]: `2px solid ${colors.accent}` },
    outlineOffset: '8px',
  },
  title: {
    // Heavier weight at the lead size, so the title stands out from the 16px date and summary.
    fontSize: type.lead,
    fontWeight: weights.brand,
    lineHeight: 1.6667,
    letterSpacing: '-0.012em',
    color: colors.text,
    textWrap: 'balance',
  },
  link: {
    color: colors.text,
    textDecorationLine: 'none',
    outline: 'none',
    // Stretches the link over the whole note.
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
    },
  },
  // The display face has no arrows and the arrow should not be underlined, so it is its own inline block.
  arrow: {
    display: 'inline-block',
    marginLeft: '0.35em',
    color: { default: colors.muted, [stylex.when.ancestor(':hover')]: colors.text },
    transform: { default: 'none', [stylex.when.ancestor(':hover')]: 'translateX(3px)' },
    transitionProperty: { default: 'transform, color', [breakpoints.reducedMotion]: 'color' },
    transitionDuration: '0.15s',
  },
  muted: { color: colors.muted, fontWeight: weights.regular },
  meta: {
    marginTop: space.s8,
    color: colors.muted,
    fontSize: type.meta,
    fontWeight: weights.regular,
    lineHeight: 1.5,
    fontVariantNumeric: 'tabular-nums',
  },
  summary: {
    marginTop: space.s8,
    color: colors.muted,
    fontSize: type.meta,
    fontWeight: weights.regular,
    lineHeight: 1.5,
    maxWidth: '40em',
    textWrap: 'pretty',
  },
})

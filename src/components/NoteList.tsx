import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { breakpoints, colors, type, weights } from '~/styles/tokens.stylex'
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
  posts,
}: {
  items: NoteItem[]
  compact?: boolean
  /**
   * Each note on a drawn post: side by side, each post running down to the ground line under the list (`row`),
   * or one under another, each post beside its own note (`column`).
   */
  posts?: 'row' | 'column'
}) {
  return (
    <ul role="list" {...stylex.props(styles.list, compact && styles.listCompact, posts === 'row' && styles.listPosts)}>
      {items.map((item) => (
        <li
          key={item.title}
          {...stylex.props(
            stylex.defaultMarker(),
            styles.item,
            item.href !== undefined && styles.linked,
            posts && styles.post,
            posts === 'column' && styles.postColumn,
          )}
        >
          {bannerSlug(item.href) ? (
            <div data-note-banner {...stylex.props(styles.banner)}>
              <NoteBanner slug={bannerSlug(item.href) ?? ''} />
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
  banner: { minWidth: 0, marginBottom: '1rem' },
  list: {
    listStyle: 'none',
    display: 'grid',
    rowGap: { default: '2.5rem', [breakpoints.phone]: '2rem' },
  },
  listCompact: { rowGap: '1.25rem' },
  listPosts: {
    gridTemplateColumns: { default: 'repeat(auto-fit, minmax(15rem, 1fr))', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    columnGap: 'clamp(1.5rem, 3vw, 3rem)',
    alignItems: 'end',
  },
  postColumn: { paddingBottom: '0.25rem', height: 'auto', '::before': { bottom: 0 } },
  // A stake in the ground: a drawn upright beside the note, from its title down to the ground line.
  post: {
    alignContent: 'start',
    paddingLeft: '1.5rem',
    paddingBottom: { default: '2.5rem', [breakpoints.tablet]: '0.5rem' },
    height: '100%',
    '::before': {
      content: '""',
      position: 'absolute',
      left: '-7px',
      top: '0.45rem',
      bottom: { default: '-1px', [breakpoints.tablet]: '0' },
      width: '16px',
      backgroundColor: colors.ink,
      maskImage: 'url("/assets/img/scene/line-v.svg")',
      maskSize: '100% 100%',
      maskRepeat: 'no-repeat',
      pointerEvents: 'none',
    },
  },
  item: {
    position: 'relative',
    display: 'grid',
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
    lineHeight: 1.35,
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
    marginTop: '0.55rem',
    color: colors.muted,
    fontSize: type.meta,
    fontWeight: weights.regular,
    lineHeight: 1.4,
    fontVariantNumeric: 'tabular-nums',
  },
  summary: {
    marginTop: '0.7rem',
    color: colors.muted,
    fontSize: type.meta,
    fontWeight: weights.regular,
    lineHeight: 1.5,
    maxWidth: '40em',
    textWrap: 'pretty',
  },
})

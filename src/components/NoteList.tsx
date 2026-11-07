import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { breakpoints, colors, type, weights } from '~/styles/tokens.stylex'
import { SketchArrow } from './SketchArrow'

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
 * the note underlines the title and nudges its arrow; keyboard focus draws a
 * ring around the whole note.
 */
export function NoteList({ items, compact = false }: { items: NoteItem[]; compact?: boolean }) {
  return (
    <ul role="list" {...stylex.props(styles.list, compact && styles.listCompact)}>
      {items.map((item) => (
        <li
          key={item.title}
          {...stylex.props(stylex.defaultMarker(), styles.item, item.href !== undefined && styles.linked)}
        >
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

const styles = stylex.create({
  list: {
    listStyle: 'none',
    display: 'grid',
    rowGap: { default: '2.5rem', [breakpoints.phone]: '2rem' },
  },
  listCompact: { rowGap: '1.25rem' },
  item: {
    position: 'relative',
    display: 'grid',
    rowGap: '0.3rem',
    borderRadius: '6px',
  },
  // The focus ring goes round the whole note, since the whole note is the link's target.
  linked: {
    outline: { default: null, [stylex.when.descendant(':focus-visible')]: `2px solid ${colors.accent}` },
    outlineOffset: '8px',
  },
  title: {
    fontSize: type.lead,
    fontWeight: weights.medium,
    lineHeight: 1.4,
    letterSpacing: '-0.005em',
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
  // Geist Serif has no arrows and the arrow should not be underlined, so it is its own inline block.
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
    color: colors.muted,
    fontSize: type.meta,
    fontVariantNumeric: 'tabular-nums',
  },
  summary: {
    marginTop: '0.2rem',
    color: colors.muted,
    fontSize: type.body,
    lineHeight: 1.55,
    maxWidth: '40em',
    textWrap: 'pretty',
  },
})

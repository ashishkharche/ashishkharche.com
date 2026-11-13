import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { Figure, type FigureName } from '~/components/Scene'
import { breakpoints, colors, fonts, layout, leading, space, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

/**
 * The head of every page, set the same way and at the same height: the rail on the left (meta such as a back link
 * and a date), the title and lead at the content edge, and a figure from the footer drawing standing on a pen line
 * under it all. The line starts at the line that runs down the page. Index pages set the title at 96 (48 on phones);
 * notes, with long titles, at 48.
 */
export function PageHead({
  title,
  lead,
  icon,
  meta,
  figure,
  size = 'display',
  titleId,
  children,
}: {
  title: ReactNode
  lead?: ReactNode
  icon?: ReactNode
  meta?: ReactNode
  figure?: FigureName
  size?: 'display' | 'title'
  titleId?: string
  /** Shown under the title, above the ground line, such as a note's banner. */
  children?: ReactNode
}) {
  return (
    <header {...stylex.props(ui.wrap, styles.head)}>
      <div {...stylex.props(ui.rail)}>
        <div {...stylex.props(ui.railText, styles.meta)}>{meta}</div>
        <div {...stylex.props(styles.main)}>
          <div {...stylex.props(styles.text, children != null && styles.textOnGround)}>
            {icon ? <div {...stylex.props(styles.icon)}>{icon}</div> : null}
            <h1 id={titleId} {...stylex.props(styles.title, size === 'display' ? styles.display : styles.titleSize)}>
              {title}
            </h1>
            {lead ? <p {...stylex.props(styles.lead)}>{lead}</p> : null}
            {children ? <div {...stylex.props(styles.extra)}>{children}</div> : null}
          </div>
          {figure ? <Figure name={figure} xstyle={styles.figure} /> : null}
        </div>
      </div>
      <span aria-hidden="true" {...stylex.props(styles.ground)} />
    </header>
  )
}

const styles = stylex.create({
  head: {
    position: 'relative',
    paddingTop: { default: space.s48, [breakpoints.phone]: space.s24 },
  },
  meta: {
    display: { default: 'flex', ':empty': { default: 'flex', [breakpoints.tablet]: 'none' } },
    flexDirection: 'column',
    alignItems: 'flex-start',
    rowGap: space.s8,
    // On wide screens the meta lines up with the top of the title.
    paddingTop: { default: '0.4rem', [breakpoints.tablet]: 0 },
  },
  main: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    columnGap: space.s48,
    minWidth: 0,
  },
  text: {
    minWidth: 0,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 'auto',
    paddingBottom: { default: space.s48, [breakpoints.phone]: space.s24 },
  },
  // A banner stands on the ground line itself.
  textOnGround: { paddingBottom: { default: space.s8, [breakpoints.phone]: space.s8 } },
  icon: { marginBottom: space.s16 },
  title: {
    fontFamily: fonts.serif,
    fontWeight: weights.display,
    textWrap: 'balance',
    color: colors.text,
  },
  display: { fontSize: type.display, lineHeight: leading.display, letterSpacing: '-0.02em' },
  titleSize: {
    fontSize: type.title,
    lineHeight: leading.title,
    letterSpacing: '-0.012em',
    maxWidth: layout.columnWide,
  },
  lead: {
    marginTop: space.s24,
    fontSize: type.lead,
    lineHeight: leading.body,
    color: colors.muted,
    maxWidth: '36em',
    textWrap: 'pretty',
  },
  extra: { marginTop: space.s48 },
  // The figure stands on the ground line, its feet on the pen stroke.
  figure: {
    flex: 'none',
    height: { default: 'clamp(8rem, 12vw, 11rem)', [breakpoints.phone]: '5.5rem' },
    marginBottom: '-2px',
  },
  ground: {
    position: 'absolute',
    bottom: '-8px',
    left: { default: `calc(-1 * ${layout.spineGap})`, [breakpoints.phone]: `calc(-1 * ${layout.spineGapPhone})` },
    right: 0,
    height: '16px',
    backgroundColor: colors.ink,
    maskImage: 'url("/assets/img/scene/line-h1.svg")',
    maskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    pointerEvents: 'none',
  },
})

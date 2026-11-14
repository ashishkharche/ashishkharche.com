import * as stylex from '@stylexjs/stylex'
import { breakpoints, colors, fonts, layout, leading, space, type, weights } from './tokens.stylex'

// The left edge of `wrap`: the scene inset on narrow screens, centred in the panorama width on wide ones.
const alignedLeft = `max(${layout.sceneInset}, (100% - ${layout.wide}) / 2)`
// The content edge: the wrap's left edge plus the rail and its gap. Titles and text start here on every page.
const contentLeft = `calc(${alignedLeft} + ${layout.rail} + ${layout.railGap})`
// The width from the content edge to the wrap's right edge.
const contentWidth = `calc(min(100vw - 2 * ${layout.sceneInset}, ${layout.wide}) - ${layout.rail} - ${layout.railGap})`

const focusRing = {
  outline: { default: null, ':focus-visible': `2px solid ${colors.accent}` },
  outlineOffset: { default: null, ':focus-visible': '3px' },
} as const

export const ui = stylex.create({
  wrap: {
    // A little more room at the sides on phones.
    width: {
      default: `min(100% - 2 * ${layout.sceneInset}, ${layout.wide})`,
      [breakpoints.phone]: 'calc(100% - 3rem)',
    },
    marginInline: 'auto',
  },
  /**
   * The text columns start at the same left edge as `wrap` (and the header), so page titles and
   * text line up on every page; the space they leave is on the right.
   */
  column: {
    width: {
      default: `min(100% - 2 * ${layout.sceneInset}, ${layout.column})`,
      [breakpoints.phone]: 'calc(100% - 3rem)',
    },
    marginLeft: { default: alignedLeft, [breakpoints.desktop]: contentLeft, [breakpoints.phone]: 'auto' },
    marginRight: 'auto',
  },
  columnWide: {
    width: {
      default: `min(100% - 2 * ${layout.sceneInset}, ${layout.columnWide})`,
      [breakpoints.phone]: 'calc(100% - 3rem)',
    },
    marginLeft: { default: alignedLeft, [breakpoints.desktop]: contentLeft, [breakpoints.phone]: 'auto' },
    marginRight: 'auto',
  },
  /**
   * The grid every page shares: a rail on the left for section numbers, dates and meta, then the content. Below
   * 1100px the rail sits above the content.
   */
  rail: {
    display: 'grid',
    gridTemplateColumns: { default: `${layout.rail} minmax(0, 1fr)`, [breakpoints.tablet]: 'minmax(0, 1fr)' },
    columnGap: layout.railGap,
    rowGap: space.s24,
  },
  /** What sits in the rail: 16px meta in the muted colour. */
  railText: { fontSize: type.meta, lineHeight: leading.meta, color: colors.muted, minWidth: 0 },
  /**
   * A section of a page: a pen line across the top that starts at the line running down the page (see Page.tsx),
   * 96 above it and 48 below it, so sections sit 144 apart.
   */
  /**
   * The spacing of a pen section without its line, for a section that follows a ground line (the hero phones stand on
   * one), so the two lines never stack.
   */
  sectionAfterGround: {
    marginTop: { default: space.s96, [breakpoints.phone]: space.s48 },
  },
  penSection: {
    position: 'relative',
    marginTop: { default: space.s96, [breakpoints.phone]: space.s48 },
    paddingTop: { default: space.s48, [breakpoints.phone]: space.s48 },
    '::before': {
      content: '""',
      position: 'absolute',
      top: '-8px',
      left: { default: `calc(-1 * ${layout.spineGap})`, [breakpoints.phone]: `calc(-1 * ${layout.spineGapPhone})` },
      right: 0,
      height: '16px',
      backgroundColor: colors.ink,
      maskImage: 'url("/assets/img/scene/line-h1.svg")',
      maskRepeat: 'no-repeat',
      maskSize: '100% 100%',
      pointerEvents: 'none',
    },
  },
  narrow: { maxWidth: layout.column },
  /**
   * Breaks a block out of the text column to the full content width. The column starts at the
   * wrap's left edge, so the wide block starts there too and runs to the wrap's right edge.
   */
  wide: {
    width: {
      default: contentWidth,
      [breakpoints.tablet]: `min(100vw - 2 * ${layout.sceneInset}, ${layout.wide})`,
      [breakpoints.phone]: 'calc(100vw - 3rem)',
    },
  },
  /**
   * A link in running text. Links are never underlined: the words are set in the heavier of the two weights,
   * and hovering fades them a little.
   */
  link: {
    color: colors.text,
    fontWeight: weights.brand,
    textDecorationLine: 'none',
    opacity: { default: 1, ':hover': 0.7 },
    ...focusRing,
  },
  quietLink: {
    color: colors.muted,
    fontWeight: weights.regular,
  },
  plainLink: {
    fontWeight: weights.regular,
  },
  focusRing,
  muted: { color: colors.muted },
  small: { fontSize: type.meta },
  visuallyHidden: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
  /**
   * A page section: a wide gap above it, with a ground line drawn across the
   * middle of the gap in the pen of the footer drawing. The line is a mask
   * filled with the ink colour, so it follows the theme.
   */
  section: {
    marginTop: { default: 'clamp(3.5rem, 6vw, 5rem)', [breakpoints.phone]: '3rem' },
    '::before': {
      content: '""',
      display: 'block',
      height: '16px',
      marginBottom: { default: 'clamp(3rem, 5vw, 4.25rem)', [breakpoints.phone]: '2.5rem' },
      backgroundColor: colors.ink,
      maskImage: 'url("/assets/img/sketch/ground.svg")',
      maskRepeat: 'no-repeat',
      maskPosition: 'center',
      maskSize: '100% 100%',
      pointerEvents: 'none',
    },
  },
  h2: {
    fontFamily: fonts.serif,
    fontSize: type.title,
    fontWeight: weights.display,
    lineHeight: leading.title,
    letterSpacing: '-0.01em',
    textWrap: 'balance',
  },
  h3: {
    fontSize: type.lead,
    fontWeight: weights.medium,
    lineHeight: leading.body,
    textWrap: 'balance',
  },
  note: { marginTop: '1.5rem', color: colors.muted, fontSize: type.meta },
  mt06: { marginTop: '0.6rem' },
  mt1: { marginTop: '1rem' },
  mt2: { marginTop: '2rem' },
})

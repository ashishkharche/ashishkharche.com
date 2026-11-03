import * as stylex from '@stylexjs/stylex'
import { breakpoints, colors, fonts, layout, type, weights } from './tokens.stylex'

// The left edge of `wrap`: half the gutter on narrow screens, centred in the 1040px width on wide ones.
const alignedLeft = `max(${layout.gutter} / 2, (100% - ${layout.wide}) / 2)`

const focusRing = {
  outline: { default: null, ':focus-visible': `2px solid ${colors.accent}` },
  outlineOffset: { default: null, ':focus-visible': '3px' },
} as const

export const ui = stylex.create({
  wrap: {
    // A little more room at the sides on phones.
    width: { default: `min(100% - ${layout.gutter}, ${layout.wide})`, [breakpoints.phone]: 'calc(100% - 3rem)' },
    marginInline: 'auto',
  },
  /**
   * The text columns start at the same left edge as `wrap` (and the header), so page titles and
   * text line up on every page; the space they leave is on the right.
   */
  column: {
    width: { default: `min(100% - ${layout.gutter}, ${layout.column})`, [breakpoints.phone]: 'calc(100% - 3rem)' },
    marginLeft: { default: alignedLeft, [breakpoints.phone]: 'auto' },
    marginRight: 'auto',
  },
  columnWide: {
    width: { default: `min(100% - ${layout.gutter}, ${layout.columnWide})`, [breakpoints.phone]: 'calc(100% - 3rem)' },
    marginLeft: { default: alignedLeft, [breakpoints.phone]: 'auto' },
    marginRight: 'auto',
  },
  narrow: { maxWidth: layout.column },
  /**
   * Breaks a block out of the text column to the full content width. The column starts at the
   * wrap's left edge, so the wide block starts there too and runs to the wrap's right edge.
   */
  wide: {
    width: { default: `min(100vw - ${layout.gutter}, ${layout.wide})`, [breakpoints.phone]: 'calc(100vw - 3rem)' },
  },
  link: {
    color: { default: colors.text, ':hover': colors.accent },
    textDecorationLine: 'underline',
    textDecorationColor: { default: colors.accentLine, ':hover': colors.accent },
    textDecorationThickness: '1.5px',
    textUnderlineOffset: '3px',
    transitionProperty: 'color, text-decoration-color',
    transitionDuration: '0.15s',
    ...focusRing,
  },
  quietLink: {
    color: { default: colors.muted, ':hover': colors.accent },
  },
  plainLink: {
    textDecorationLine: 'none',
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
   * A page section: a wide gap above it, with a soft line of hills and the AK
   * mark from the footer art drawn in the middle of the gap. The drawing is a
   * mask filled with the muted text colour, so it follows the theme.
   */
  section: {
    marginTop: { default: 'clamp(4.5rem, 8vw, 6.5rem)', [breakpoints.phone]: '3.5rem' },
    '::before': {
      content: '""',
      display: 'block',
      height: { default: '64px', [breakpoints.phone]: '48px' },
      marginBottom: { default: 'clamp(3.5rem, 6vw, 5rem)', [breakpoints.phone]: '3rem' },
      backgroundColor: colors.muted,
      opacity: colors.artOpacity,
      maskImage: 'url("/assets/img/section-hills.svg")',
      maskRepeat: 'no-repeat',
      maskPosition: 'center bottom',
      maskSize: 'auto 100%',
      pointerEvents: 'none',
    },
  },
  h2: {
    fontFamily: fonts.serif,
    fontSize: type.title,
    fontWeight: weights.regular,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
    textWrap: 'balance',
  },
  h3: {
    fontSize: type.lead,
    fontWeight: weights.medium,
    lineHeight: 1.45,
    textWrap: 'balance',
  },
  note: { marginTop: '1.5rem', color: colors.muted, fontSize: type.meta },
  mt06: { marginTop: '0.6rem' },
  mt1: { marginTop: '1rem' },
  mt2: { marginTop: '2rem' },
})

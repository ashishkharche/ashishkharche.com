import * as stylex from '@stylexjs/stylex'
import { colors } from './tokens.stylex'

/**
 * Drawn lines, in the ink of the footer drawing. Boxes and pills are pen
 * strokes from small SVGs used as border images on a `::before` layer; rules
 * are pen lines used as masks. Nothing here fills a box: every shape is an
 * outline on the paper. Nothing here is drawn on or round a picture: photos and
 * app screens are shown as they are.
 */

const drawnBase = {
  content: '""',
  position: 'absolute',
  borderStyle: 'solid',
  borderColor: 'transparent',
  borderImageRepeat: 'stretch',
  pointerEvents: 'none',
} as const

const drawnBox = { ...drawnBase, inset: '-5px', borderWidth: '12px', borderImageSlice: 12 } as const

const drawnPill = {
  ...drawnBase,
  inset: '-3px',
  borderTopWidth: '12px',
  borderBottomWidth: '12px',
  borderLeftWidth: '24px',
  borderRightWidth: '24px',
  borderImageSlice: '12 24',
} as const

const penLine = {
  content: '""',
  position: 'absolute',
  left: 0,
  right: 0,
  height: '10px',
  backgroundColor: colors.ink,
  maskRepeat: 'no-repeat',
  maskSize: '100% 100%',
  pointerEvents: 'none',
} as const

export const sk = stylex.create({
  /**
   * A box drawn round the element: four pen strokes that overrun at the corners, from an SVG used as a
   * border image, so the corners keep their shape at any size. The drawing sits 5px outside the box.
   */
  box: {
    position: 'relative',
    '::before': { ...drawnBox, borderImageSource: colors.skBox },
  },
  /** The same box, pressed harder: for things you can press, so the outline keeps 3:1 contrast. */
  boxStrong: {
    position: 'relative',
    '::before': { ...drawnBox, borderImageSource: colors.skBoxStrong },
  },
  /** A drawn pill round a button: two straight strokes and two rounded ends that do not quite meet. */
  pill: {
    position: 'relative',
    '::before': { ...drawnPill, borderImageSource: colors.skPill },
  },
  /** The pill gone over twice with a heavier line, for the one button that matters most. */
  pillHeavy: {
    position: 'relative',
    '::before': { ...drawnPill, borderImageSource: colors.skPillHeavy },
  },
  /** A drawn line along the top of the box: a pen line (a mask filled with the ink) hung on `::before`. */
  ruleTop: {
    position: 'relative',
    '::before': { ...penLine, top: '-5px', maskImage: 'url("/assets/img/sketch/rule-1.svg")' },
  },
  /** A drawn line along the bottom of the box, on the `::after` layer so it can sit with `ruleTop`. */
  ruleBottom: {
    position: 'relative',
    '::after': { ...penLine, bottom: '-5px', maskImage: 'url("/assets/img/sketch/rule-2.svg")' },
  },
  /** A rule as an element of its own (a `<div aria-hidden>`), for places with no box to hang it on. */
  rule: {
    display: 'block',
    height: '10px',
    marginBlock: '-4px',
    backgroundColor: colors.ink,
    maskImage: 'url("/assets/img/sketch/rule-3.svg")',
    maskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    pointerEvents: 'none',
  },
  /** Pictures and logos in the pen's one colour: grey on the paper, nothing coloured. */
  mono: { filter: 'grayscale(1)' },
})

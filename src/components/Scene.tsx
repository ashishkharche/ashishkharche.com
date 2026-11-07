import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { breakpoints, colors, layout } from '~/styles/tokens.stylex'

/**
 * The home page as one drawn line, like the ground line of the footer drawing
 * carried on down the page. Each leg is a stretch of that line: it comes down
 * one side of the page, turns, and runs along the bottom of the leg as the
 * ground the leg's content stands on; at the far side the next leg picks it up
 * and turns down again. The first leg starts at the left edge of the page and
 * the last runs off the edge into the footer. The line is drawn in pieces
 * (masks filled with the ink colour, so they follow the theme), all of them
 * decorative and hidden from assistive technology.
 */
type Side = 'left' | 'right'

interface LegProps {
  /** Where the line comes into this leg: down the left or right side, or in from the left edge of the page. */
  from: Side | 'edge'
  /** At the far end the ground turns down into the next leg, or runs off the page. */
  to?: 'turn' | 'edge'
  /** Which drawing of the ground line to use, so neighbouring legs are not the same stroke. */
  stroke?: 1 | 2
  as?: 'section' | 'div' | 'li' | 'header'
  id?: string
  labelledBy?: string
  label?: string
  xstyle?: stylex.StyleXStyles
  children: ReactNode
}

export function Leg({
  from,
  to = 'turn',
  stroke = 1,
  as = 'section',
  labelledBy,
  label,
  id,
  xstyle,
  children,
}: LegProps) {
  const Tag = as
  // The ground runs away from the side the line came down; from the page edge it runs left to right.
  const far: Side = from === 'right' ? 'left' : 'right'
  const near: Side | 'edge' = from
  return (
    <Tag id={id} aria-labelledby={labelledBy} aria-label={label} {...stylex.props(styles.leg, xstyle)}>
      {children}
      <span
        aria-hidden="true"
        {...stylex.props(
          styles.piece,
          styles.ground,
          stroke === 2 && styles.ground2,
          near === 'edge' ? styles.startLeftEdge : near === 'left' ? styles.startLeft : styles.startRight,
          to === 'edge'
            ? far === 'left'
              ? styles.endLeftEdge
              : styles.endRightEdge
            : far === 'left'
              ? styles.endLeft
              : styles.endRight,
        )}
      />
      {near !== 'edge' ? (
        <>
          <span
            aria-hidden="true"
            {...stylex.props(styles.piece, styles.corner, styles.top, near === 'right' && styles.flipX)}
          />
          <span
            aria-hidden="true"
            {...stylex.props(styles.piece, styles.side, near === 'left' ? styles.sideLeft : styles.sideRight)}
          />
          <span
            aria-hidden="true"
            {...stylex.props(
              styles.piece,
              styles.corner,
              styles.bottom,
              near === 'right' ? styles.flipXY : styles.flipY,
            )}
          />
        </>
      ) : null}
    </Tag>
  )
}

// --x: how far the line runs in from the page edge on the sides. --r: the radius of each turn.
const X = 'var(--scene-x)'
const R = 'var(--scene-r)'

const styles = stylex.create({
  leg: {
    position: 'relative',
    '--scene-x': { default: layout.sceneX, [breakpoints.phone]: '0.6rem' },
    '--scene-r': '48px',
    // The content keeps clear of the side lines and turns, and on wide screens is held to a panorama width.
    paddingInline: {
      default: `max(${layout.sceneInset}, (100% - ${layout.wide}) / 2)`,
      [breakpoints.phone]: '1.5rem',
    },
  },
  piece: {
    position: 'absolute',
    backgroundColor: colors.ink,
    maskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    pointerEvents: 'none',
  },
  ground: {
    bottom: '-8px',
    height: '16px',
    maskImage: 'url("/assets/img/scene/line-h1.svg")',
  },
  ground2: { maskImage: 'url("/assets/img/scene/line-h2.svg")' },
  startLeftEdge: { left: 0 },
  startLeft: { left: `calc(${X} + ${R})` },
  startRight: { right: `calc(${X} + ${R})` },
  endLeft: { left: `calc(${X} + ${R})` },
  endRight: { right: `calc(${X} + ${R})` },
  endLeftEdge: { left: 0 },
  endRightEdge: { right: 0 },
  // One quarter turn, drawn for the top left and mirrored for the other corners.
  corner: {
    width: `calc(${R} + 16px)`,
    height: `calc(${R} + 16px)`,
    left: `calc(${X} - 8px)`,
    maskImage: 'url("/assets/img/scene/corner.svg")',
  },
  top: { top: '-8px' },
  bottom: { bottom: '-8px' },
  flipX: { left: 'auto', right: `calc(${X} - 8px)`, transform: 'scaleX(-1)' },
  flipY: { transform: 'scaleY(-1)' },
  flipXY: { left: 'auto', right: `calc(${X} - 8px)`, transform: 'scale(-1, -1)' },
  side: {
    top: `calc(${R} + 8px)`,
    bottom: `calc(${R} + 8px)`,
    width: '16px',
    maskImage: 'url("/assets/img/scene/line-v.svg")',
  },
  sideLeft: { left: `calc(${X} - 8px)` },
  sideRight: { right: `calc(${X} - 8px)` },
})

/** One of the exercise figures from the footer drawing, standing on a ground line. Decorative. */
export type FigureName = 'walk' | 'lunge' | 'squat' | 'curl' | 'pushup'

const figureSize: Record<FigureName, [number, number]> = {
  walk: [213, 372],
  lunge: [234, 277],
  squat: [148, 266],
  curl: [175, 373],
  pushup: [545, 253],
}

export function Figure({ name, xstyle }: { name: FigureName; xstyle?: stylex.StyleXStyles }) {
  const [width, height] = figureSize[name]
  return (
    <img
      src={`/assets/img/scene/fig-${name}.svg`}
      width={width}
      height={height}
      alt=""
      aria-hidden="true"
      loading="lazy"
      decoding="async"
      {...stylex.props(figure.base, xstyle)}
    />
  )
}

const figure = stylex.create({
  // The footer drawing's line: black line art at the art opacity, turned light in dark mode.
  base: {
    display: 'block',
    width: 'auto',
    filter: colors.artFilter,
    opacity: colors.artOpacity,
    userSelect: 'none',
    pointerEvents: 'none',
  },
})

/** Room in a leg: air above, and a little space between words and the ground they sit on. */
export const legSpace = stylex.create({
  text: {
    paddingTop: { default: 'clamp(6rem, 11vw, 9rem)', [breakpoints.phone]: '4.5rem' },
    paddingBottom: { default: '4rem', [breakpoints.phone]: '3rem' },
  },
  first: {
    paddingTop: { default: 'clamp(4rem, 9vw, 7rem)', [breakpoints.phone]: '2rem' },
    paddingBottom: { default: '3.5rem', [breakpoints.phone]: '2.5rem' },
  },
  // The words of a leg held to a reading width, on the side the line comes down (so they read from that side).
  column: { maxWidth: '34rem' },
  columnWide: { maxWidth: '46rem' },
  toRight: { marginLeft: { default: 'auto', [breakpoints.tablet]: 0 } },
  // A page title with a figure from the footer drawing standing on the ground beside it.
  headScene: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 46rem) 1fr', [breakpoints.tablet]: 'minmax(0, 1fr) auto' },
    alignItems: 'end',
    columnGap: '2rem',
  },
  headText: { paddingBottom: { default: '2.75rem', [breakpoints.phone]: '2.25rem' }, minWidth: 0 },
  headFigure: {
    justifySelf: 'end',
    height: { default: 'clamp(9rem, 16vw, 14rem)', [breakpoints.phone]: '6.5rem' },
  },
})

/** A drawn arrow from one thing to another. Decorative: what it points at is said in words nearby. */
export function Arrow({ shape, xstyle }: { shape: 'over' | 'under' | 'down' | 'long'; xstyle?: stylex.StyleXStyles }) {
  return <span aria-hidden="true" {...stylex.props(drawn.arrow, arrows[shape], xstyle)} />
}

/** A strip of tape drawn over the edge of a picture, as if it were taped onto the page. */
export function Tape({ xstyle, alt = false }: { xstyle?: stylex.StyleXStyles; alt?: boolean }) {
  return <span aria-hidden="true" {...stylex.props(drawn.tape, alt && drawn.tape2, xstyle)} />
}

const drawn = stylex.create({
  arrow: {
    position: 'absolute',
    display: { default: 'block', [breakpoints.tablet]: 'none' },
    width: '240px',
    height: '120px',
    backgroundColor: colors.inkStrong,
    maskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    pointerEvents: 'none',
  },
  tape: {
    position: 'absolute',
    zIndex: 3,
    width: '5.5rem',
    height: '1.75rem',
    backgroundColor: colors.inkStrong,
    maskImage: 'url("/assets/img/scene/tape-1.svg")',
    maskRepeat: 'no-repeat',
    maskSize: '100% 100%',
    pointerEvents: 'none',
  },
  tape2: { maskImage: 'url("/assets/img/scene/tape-2.svg")' },
})

const arrows = stylex.create({
  over: { maskImage: 'url("/assets/img/scene/arrow-over.svg")' },
  under: { maskImage: 'url("/assets/img/scene/arrow-under.svg")' },
  down: { maskImage: 'url("/assets/img/scene/arrow-down.svg")' },
  long: { maskImage: 'url("/assets/img/scene/arrow-long.svg")' },
})

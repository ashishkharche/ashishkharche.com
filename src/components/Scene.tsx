import * as stylex from '@stylexjs/stylex'
import { colors } from '~/styles/tokens.stylex'

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

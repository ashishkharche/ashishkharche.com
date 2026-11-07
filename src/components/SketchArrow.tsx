import * as stylex from '@stylexjs/stylex'

const paths = {
  // A slightly bowed shaft and a head drawn as two separate strokes, as a pen would.
  right: ['M2.5 10.6c4.2-.5 9.4-.7 14.6-.4', 'M12.4 5.6c1.6 1.7 3.4 3.3 5 4.6', 'M17.3 10.4c-1.6 1.2-3.3 2.7-4.7 4.3'],
  left: ['M17.5 10.2c-4.2-.3-9.4-.1-14.6.4', 'M7.6 5.4c-1.6 1.7-3.4 3.3-5 4.8', 'M2.7 10.4c1.6 1.2 3.3 2.7 4.7 4.3'],
  out: ['M4.4 15.9c3.5-3.6 7.2-7.3 10.9-10.7', 'M8.3 4.9c2.4-.1 4.9-.2 7.4.1', 'M15.6 5c.2 2.4.2 4.9 0 7.4'],
} as const

/** An arrow drawn in the pen's line, in the current text colour. Decorative: the link text says where it goes. */
export function SketchArrow({ dir = 'right', xstyle }: { dir?: keyof typeof paths; xstyle?: stylex.StyleXStyles }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" {...stylex.props(styles.svg, xstyle)}>
      {paths[dir].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

const styles = stylex.create({
  svg: {
    display: 'inline-block',
    flex: 'none',
    width: '1.05em',
    height: '1.05em',
    verticalAlign: '-0.16em',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  },
})

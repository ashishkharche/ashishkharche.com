import * as stylex from '@stylexjs/stylex'
import { ui } from '~/styles/ui'

/**
 * The Workout Director wordmark: the lettering of the brand lockup (wd-brand
 * public/assets/wdfont-lockup-ink.svg and -white.svg, outlined, 960 x 200), without the mark, in the
 * current text colour so it follows the theme. The lettering is custom and its font file is not licensed
 * for the web, so the outlines are used, not the font. The name is said as text for assistive technology
 * and for find in page; the drawing is hidden from it.
 */
const letters: ReadonlyArray<readonly [string, number, number]> = [
  [
    'M5 5H19L17 58Q16 70 25 70Q32 70 36 58L53 5H68L59 58Q57 70 65 70Q72 70 76 57L89 5H103L88 61Q81 85 64 85Q49 85 47 72Q40 85 24 85Q1 85 3 59Z',
    0,
    0,
  ],
  [
    'M43 3C18 3 1 20 1 44S18 85 43 85S85 68 85 44S68 3 43 3ZM43 17C60 17 71 28 71 44S60 71 43 71S15 60 15 44S26 17 43 17Z',
    103,
    0,
  ],
  ['M3 5H42Q68 5 68 29Q68 47 50 52L72 83H55L32 53H17V83H3ZM17 19V39H41Q54 39 54 29Q54 19 41 19Z', 197, 0],
  ['M3 5H17V38L49 5H68L31 43L71 83H51L17 49V83H3Z', 276, 0],
  [
    'M43 3C18 3 1 20 1 44S18 85 43 85S85 68 85 44S68 3 43 3ZM43 17C60 17 71 28 71 44S60 71 43 71S15 60 15 44S26 17 43 17Z',
    354,
    0,
  ],
  ['M3 5H17V51Q17 71 37 71Q57 71 57 51V5H71V52Q71 85 37 85Q3 85 3 52Z', 448, 0],
  ['M0 5H76V19H33Q49 26 49 44V83H35V44Q35 19 13 19H0Z', 531, 0],
  ['M3 5H33Q76 5 76 44Q76 83 33 83H3ZM17 19V69H32Q62 69 62 44Q62 19 32 19Z', 0, 101],
  ['M4 5H18V83H4Z', 85, 101],
  ['M3 5H42Q68 5 68 29Q68 47 50 52L72 83H55L32 53H17V83H3ZM17 19V39H41Q54 39 54 29Q54 19 41 19Z', 115, 101],
  ['M3 5H64V19H17V37H57V51H17V69H64V83H3Z', 194, 101],
  [
    'M77 16L67 27Q58 17 43 17Q15 17 15 44Q15 71 43 71Q58 71 68 60L78 70Q64 85 43 85Q1 85 1 44Q1 3 43 3Q64 3 77 16Z',
    267,
    101,
  ],
  ['M0 5H76V19H33Q49 26 49 44V83H35V44Q35 19 13 19H0Z', 356, 101],
  [
    'M43 3C18 3 1 20 1 44S18 85 43 85S85 68 85 44S68 3 43 3ZM43 17C60 17 71 28 71 44S60 71 43 71S15 60 15 44S26 17 43 17Z',
    440,
    101,
  ],
  ['M3 5H42Q68 5 68 29Q68 47 50 52L72 83H55L32 53H17V83H3ZM17 19V39H41Q54 39 54 29Q54 19 41 19Z', 534, 101],
]

export function WdWordmark({ xstyle }: { xstyle?: stylex.StyleXStyles }) {
  return (
    <span {...stylex.props(styles.wrap, xstyle)}>
      <span {...stylex.props(ui.visuallyHidden)}>Workout Director</span>
      <svg viewBox="0 0 608 189" aria-hidden="true" focusable="false" {...stylex.props(styles.svg)}>
        {letters.map(([d, x, y], index) => (
          <path key={index} d={d} transform={`translate(${x} ${y})`} fillRule="evenodd" />
        ))}
      </svg>
    </span>
  )
}

const styles = stylex.create({
  // Sized by the height of the two lines; 1em is the font size of the heading it stands in.
  wrap: { display: 'inline-block', verticalAlign: 'bottom', lineHeight: 0, height: '1.6em' },
  svg: { display: 'block', height: '100%', width: 'auto', fill: 'currentColor' },
})

import * as stylex from '@stylexjs/stylex'
import { colors, fonts, type } from '~/styles/tokens.stylex'

/** A section number in the rail, circled by hand like the page you are on in the header. Decorative. */
export function RailNumber({ n }: { n: string }) {
  return (
    <span aria-hidden="true" {...stylex.props(styles.number)}>
      {n}
    </span>
  )
}

const styles = stylex.create({
  number: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '3rem',
    height: '2.25rem',
    fontFamily: fonts.serif,
    fontSize: type.body,
    lineHeight: 1,
    color: colors.text,
    fontVariantNumeric: 'tabular-nums',
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      backgroundColor: colors.inkStrong,
      maskImage: 'url("/assets/img/sketch/loop.svg")',
      maskRepeat: 'no-repeat',
      maskSize: '100% 100%',
      pointerEvents: 'none',
    },
  },
})

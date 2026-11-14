import * as stylex from '@stylexjs/stylex'
import { RailNumber } from '~/components/RailNumber'
import { sk } from '~/styles/sketch'
import { breakpoints, colors, fonts, leading, space, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

/**
 * The excece section of the Design page, whole: the icon, the wordmark, the colours and the type, set out like the
 * Workout Director brand section. It holds no links and no screens. Grow it here, or drop the one `<DesignExcece />`
 * line in src/routes/design.tsx to remove it.
 */
const palette = [
  ['Canvas', '#090A0B'],
  ['Surface', '#1A1A1A'],
  ['Surface raised', '#1F2227'],
  ['White', '#FFFFFF'],
  ['Coral', '#FF4438'],
] as const

export function DesignExcece({ n }: { n: string }) {
  return (
    <section aria-labelledby="design-excece" data-design="excece" {...stylex.props(ui.wrap, ui.penSection)}>
      <div {...stylex.props(ui.rail)}>
        <div {...stylex.props(ui.railText, styles.rail)}>
          <RailNumber n={n} />
          <span>Brand</span>
        </div>
        <h2 id="design-excece" {...stylex.props(styles.name)}>
          excece
        </h2>
        <span {...stylex.props(styles.railGap)} />
        <div {...stylex.props(styles.content)}>
          <p {...stylex.props(styles.text)}>
            The icon is a heavy round c in pale grey on a near-black square, with a soft x cut into its open side. It
            uses no coral, gradients or outlines.
          </p>
          <div {...stylex.props(styles.brandRow)}>
            <figure {...stylex.props(styles.iconStand)}>
              <img
                src="/assets/design/excece/excece-icon.svg"
                width={1024}
                height={1024}
                alt="The excece app icon: a heavy round pale c with a soft x cut into its open side, on near-black"
                loading="lazy"
                decoding="async"
                {...stylex.props(styles.icon)}
              />
              <span aria-hidden="true" {...stylex.props(sk.rule, styles.ground)} />
            </figure>
            <p aria-hidden="true" {...stylex.props(styles.wordmark)}>
              excece
            </p>
          </div>
          <ul role="list" aria-label="excece colours" {...stylex.props(styles.palette)}>
            {palette.map(([name, hex]) => (
              <li key={hex} {...stylex.props(styles.swatchItem)}>
                <span aria-hidden="true" {...stylex.props(styles.swatch, swatches[hex])} />
                <span {...stylex.props(styles.swatchName)}>{name}</span>
                <span {...stylex.props(styles.mono)}>{hex}</span>
              </li>
            ))}
          </ul>
          <div {...stylex.props(styles.typeRow)}>
            <p {...stylex.props(styles.specimen)}>
              <span aria-hidden="true" {...stylex.props(styles.specimenSans)}>
                Aa
              </span>
              <span {...stylex.props(styles.specimenLabel)}>DM Sans, interface</span>
            </p>
            <p {...stylex.props(styles.specimen)}>
              <span aria-hidden="true" {...stylex.props(styles.specimenMono)}>
                {'{x}'}
              </span>
              <span {...stylex.props(styles.specimenLabel)}>JetBrains Mono, code</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

// The swatch fills are classes, not inline styles, which the CSP blocks.
const swatches = stylex.create({
  '#090A0B': { backgroundColor: '#090A0B' },
  '#1A1A1A': { backgroundColor: '#1A1A1A' },
  '#1F2227': { backgroundColor: '#1F2227' },
  '#FFFFFF': { backgroundColor: '#FFFFFF' },
  '#FF4438': { backgroundColor: '#FF4438' },
})

const styles = stylex.create({
  rail: {
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.tablet]: 'row' },
    alignItems: { default: 'flex-start', [breakpoints.tablet]: 'center' },
    gap: { default: space.s8, [breakpoints.tablet]: space.s16 },
  },
  railGap: { display: { default: 'block', [breakpoints.tablet]: 'none' } },
  name: {
    margin: 0,
    fontFamily: fonts.dmSans,
    fontSize: type.title,
    lineHeight: leading.title,
    fontWeight: weights.brand,
    letterSpacing: '-0.02em',
    color: colors.text,
  },
  content: { minWidth: 0, display: 'grid', rowGap: { default: space.s96, [breakpoints.phone]: space.s48 } },
  text: { maxWidth: '34rem', fontSize: type.body, lineHeight: leading.body, color: colors.muted },
  brandRow: {
    display: 'grid',
    gridTemplateColumns: { default: '16rem 1fr', [breakpoints.tablet]: '13rem 1fr', [breakpoints.phone]: '1fr' },
    alignItems: 'center',
    columnGap: space.s96,
    rowGap: space.s48,
  },
  iconStand: { margin: 0, width: { default: '16rem', [breakpoints.phone]: '11rem' } },
  icon: {
    display: 'block',
    width: '100%',
    height: 'auto',
    aspectRatio: '1',
    marginBottom: space.s16,
    // The iOS icon corner, so the square reads as an app icon; the artwork itself is not changed.
    borderRadius: '22.37%',
    boxShadow: `0 0 0 1px ${colors.phoneEdge}`,
  },
  ground: { marginInline: '-4%' },
  wordmark: {
    margin: 0,
    fontFamily: fonts.dmSans,
    fontSize: type.display,
    lineHeight: 1,
    fontWeight: weights.brand,
    letterSpacing: '-0.03em',
    color: colors.text,
  },
  palette: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(6, minmax(0, 1fr))',
      [breakpoints.phone]: 'repeat(3, minmax(0, 1fr))',
    },
    columnGap: space.s24,
    rowGap: space.s48,
  },
  swatchItem: { display: 'flex', flexDirection: 'column', gap: space.s8, minWidth: 0 },
  swatch: {
    display: 'block',
    width: '100%',
    maxWidth: '6rem',
    aspectRatio: '1',
    borderRadius: '50%',
    boxShadow: `inset 0 0 0 1px ${colors.line}`,
    marginBottom: space.s8,
  },
  swatchName: { fontSize: type.meta, lineHeight: leading.meta, color: colors.text },
  mono: { fontFamily: fonts.jetbrainsMono, fontSize: type.meta, lineHeight: leading.meta, color: colors.muted },
  typeRow: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', columnGap: space.s48 },
  specimen: { display: 'flex', flexDirection: 'column', gap: space.s16, margin: 0 },
  specimenSans: {
    fontFamily: fonts.dmSans,
    fontSize: type.display,
    lineHeight: 1,
    fontWeight: weights.brand,
    letterSpacing: '-0.03em',
    color: colors.text,
  },
  specimenMono: {
    fontFamily: fonts.jetbrainsMono,
    fontSize: type.display,
    lineHeight: 1,
    fontWeight: weights.regular,
    letterSpacing: '-0.04em',
    color: colors.text,
  },
  specimenLabel: { fontSize: type.meta, lineHeight: leading.meta, color: colors.muted },
})

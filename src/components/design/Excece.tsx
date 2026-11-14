import * as stylex from '@stylexjs/stylex'
import { RailNumber } from '~/components/RailNumber'
import { breakpoints, colors, fonts, leading, space, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

/**
 * The excece section of the Design page, whole: the icon, the name and one line on the icon. It holds no links and no
 * screens. Grow it here, or drop the one `<DesignExcece />` line in src/routes/design.tsx to remove it.
 */
export function DesignExcece({ n }: { n: string }) {
  return (
    <section aria-labelledby="design-excece" data-design="excece" {...stylex.props(ui.wrap, ui.penSection)}>
      <div {...stylex.props(ui.rail)}>
        <div {...stylex.props(ui.railText, styles.rail)}>
          <RailNumber n={n} />
          <span>Icon</span>
        </div>
        <div {...stylex.props(styles.body)}>
          <img
            src="/assets/design/excece/excece-icon.svg"
            width={1024}
            height={1024}
            alt="The excece app icon: a heavy round pale c with a soft x cut into its open side, on near-black"
            loading="lazy"
            decoding="async"
            {...stylex.props(styles.icon)}
          />
          <div>
            <h2 id="design-excece" {...stylex.props(styles.name)}>
              excece
            </h2>
            <p {...stylex.props(styles.line)}>
              A heavy round c with a soft x cut into its open side, pale on near-black.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

const styles = stylex.create({
  rail: {
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.tablet]: 'row' },
    alignItems: { default: 'flex-start', [breakpoints.tablet]: 'center' },
    gap: { default: space.s8, [breakpoints.tablet]: space.s16 },
  },
  body: {
    display: 'flex',
    alignItems: { default: 'center', [breakpoints.phone]: 'flex-start' },
    flexDirection: { default: 'row', [breakpoints.phone]: 'column' },
    gap: { default: space.s48, [breakpoints.phone]: space.s24 },
  },
  icon: {
    display: 'block',
    flexShrink: 0,
    width: { default: '12rem', [breakpoints.phone]: '9rem' },
    height: 'auto',
    aspectRatio: '1',
    // The iOS icon corner, so the square reads as an app icon; the artwork itself is not changed.
    borderRadius: '22.37%',
    boxShadow: `0 0 0 1px ${colors.phoneEdge}`,
  },
  name: {
    margin: 0,
    fontFamily: fonts.dmSans,
    fontSize: type.title,
    lineHeight: leading.title,
    fontWeight: weights.brand,
    letterSpacing: '-0.02em',
    color: colors.text,
  },
  line: { marginTop: space.s16, maxWidth: '26rem', fontSize: type.body, lineHeight: leading.body, color: colors.muted },
})

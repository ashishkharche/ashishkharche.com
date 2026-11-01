import * as stylex from '@stylexjs/stylex'
import { logos, type LogoName } from '~/content/logos'
import { colors } from '~/styles/tokens.stylex'

interface Props {
  name: LogoName
  /** Height of the space the mark sits in, in pixels. */
  size?: number
  /** Leave empty when the name is written next to the logo. */
  alt?: string
  inline?: boolean
}

/**
 * A company mark or app icon, scaled to fit a square of `size` pixels. Marks
 * with a light and a dark version switch with the theme.
 */
export function Logo({ name, size = 32, alt = '', inline = false }: Props) {
  const logo = logos[name]
  const scale = Math.min(size / logo.height, (size * 1.3) / logo.width)
  const width = Math.round(logo.width * scale)
  const height = Math.round(logo.height * scale)
  const darkSrc = 'darkSrc' in logo ? logo.darkSrc : undefined
  const shape = 'appIcon' in logo && logo.appIcon ? styles.appIcon : null
  return (
    <span {...stylex.props(styles.wrap, inline && styles.inline)}>
      <img
        src={logo.src}
        width={width}
        height={height}
        alt={alt}
        loading="lazy"
        decoding="async"
        {...stylex.props(styles.img, shape, darkSrc !== undefined && styles.lightOnly)}
      />
      {darkSrc !== undefined ? (
        <img
          src={darkSrc}
          width={width}
          height={height}
          alt={alt}
          loading="lazy"
          decoding="async"
          {...stylex.props(styles.img, styles.darkOnly)}
        />
      ) : null}
    </span>
  )
}

const styles = stylex.create({
  wrap: {
    display: 'inline-flex',
    flex: 'none',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    verticalAlign: '-0.2em',
    marginInlineEnd: '0.3em',
  },
  img: { display: 'block', objectFit: 'contain' },
  lightOnly: { display: colors.sunDisplay },
  darkOnly: { display: colors.moonDisplay },
  appIcon: {
    borderRadius: '22.5%',
    outlineWidth: '1px',
    outlineStyle: 'solid',
    outlineColor: colors.phoneEdge,
    outlineOffset: '-1px',
  },
})

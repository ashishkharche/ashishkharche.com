import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { breakpoints, colors, layout, type } from '~/styles/tokens.stylex'

export interface ThemedImage {
  /** File stem in /assets/img: `<name>-light.webp` and `<name>-dark.webp`. */
  name: string
  alt: string
  width: number
  height: number
}

/**
 * Images with a light and a dark version, side by side. Only the version for the
 * current theme is shown, so it follows both the system setting and the toggle.
 */
export function ThemedFigures({ images, caption }: { images: ThemedImage[]; caption: string }) {
  return (
    <figure {...stylex.props(styles.themed)}>
      {images.map((image) => (
        <div key={image.name}>
          {(['light', 'dark'] as const).map((theme) => (
            <img
              key={theme}
              src={`/assets/img/${image.name}-${theme}.webp`}
              width={image.width}
              height={image.height}
              alt={image.alt}
              loading="lazy"
              decoding="async"
              {...stylex.props(styles.themedImg, theme === 'light' ? styles.onlyLight : styles.onlyDark)}
            />
          ))}
        </div>
      ))}
      <figcaption {...stylex.props(styles.caption, styles.fullRow)}>{caption}</figcaption>
    </figure>
  )
}

export function Facts({ items }: { items: Array<{ term: string; detail: ReactNode }> }) {
  return (
    <dl {...stylex.props(styles.facts)}>
      {items.map((item) => (
        <div key={item.term}>
          <dt {...stylex.props(styles.term)}>{item.term}</dt>
          <dd {...stylex.props(styles.detail)}>{item.detail}</dd>
        </div>
      ))}
    </dl>
  )
}

const styles = stylex.create({
  themed: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: { default: '1rem', [breakpoints.phone]: '0.5rem' },
    marginBlock: '2.25rem',
  },
  themedImg: { width: '100%', height: 'auto' },
  onlyLight: { display: colors.sunDisplay },
  onlyDark: { display: colors.moonDisplay },
  fullRow: { gridColumnStart: 1, gridColumnEnd: -1 },
  caption: {
    marginTop: '0.7rem',
    fontSize: type.meta,
    lineHeight: 1.5,
    color: colors.muted,
  },
  facts: {
    display: 'grid',
    gridTemplateColumns: { default: '1.3fr 1fr 1fr', [breakpoints.tablet]: '1fr 1fr', [breakpoints.phone]: '1fr' },
    rowGap: '1.25rem',
    columnGap: '2rem',
    marginTop: '2.25rem',
    paddingBlock: '1.25rem',
    borderBlockWidth: '1px',
    borderBlockStyle: 'solid',
    borderBlockColor: colors.line,
    maxWidth: layout.columnWide,
  },
  term: { color: colors.muted, fontSize: type.meta },
  detail: { marginTop: '0.15rem', fontSize: type.body, textWrap: 'pretty' },
})

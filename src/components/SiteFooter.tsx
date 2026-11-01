import * as stylex from '@stylexjs/stylex'
import { site } from '~/content/site'
import { breakpoints, colors, type } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer {...stylex.props(styles.footer)}>
      <div {...stylex.props(ui.wrap, styles.row)}>
        <p>
          © {year} {site.name} · {site.city}
        </p>
        <ul role="list" aria-label="Elsewhere" {...stylex.props(styles.list)}>
          <li>
            <a href={`mailto:${site.email}`} {...stylex.props(ui.link, ui.quietLink)}>
              Email
            </a>
          </li>
          <li>
            <a href={site.linkedin} {...stylex.props(ui.link, ui.quietLink)}>
              LinkedIn
            </a>
          </li>
          <li>
            <a href={site.github} {...stylex.props(ui.link, ui.quietLink)}>
              GitHub
            </a>
          </li>
          <li>
            <a href={site.x} rel="me noopener" {...stylex.props(ui.link, ui.quietLink)}>
              X
            </a>
          </li>
        </ul>
      </div>
      {/*
        Line art across the full width: the AK mark, Workout Director exercise
        figures mid-movement and the WD mark on a phone. Decorative, so it has no alt text.
      */}
      <img
        src="/assets/img/footer-identity.svg"
        width={2400}
        height={560}
        alt=""
        loading="lazy"
        decoding="async"
        {...stylex.props(styles.art)}
      />
    </footer>
  )
}

const styles = stylex.create({
  footer: {
    marginTop: { default: '8rem', [breakpoints.phone]: '6rem' },
    color: colors.muted,
    fontSize: type.meta,
    overflow: 'hidden',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: '0.75rem',
    columnGap: '2rem',
    paddingTop: '2rem',
    paddingBottom: '2.5rem',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    rowGap: '0.4rem',
    columnGap: '1.25rem',
  },
  // On phones the drawing is shown larger and cropped at the sides, so the figures stay readable.
  art: {
    display: 'block',
    width: { default: '100%', [breakpoints.phone]: '170%' },
    maxWidth: { default: '1680px', [breakpoints.phone]: 'none' },
    height: 'auto',
    marginInline: { default: 'auto', [breakpoints.phone]: '-35%' },
    filter: colors.artFilter,
    opacity: colors.artOpacity,
    userSelect: 'none',
    pointerEvents: 'none',
  },
})

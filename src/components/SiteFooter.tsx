import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { site } from '~/content/site'
import { breakpoints, colors, space, type } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <footer {...stylex.props(styles.footer)}>
      <div data-footer-row="" {...stylex.props(ui.wrap, styles.row)}>
        <p>
          © {year} {site.name}, {site.city}
        </p>
        <ul role="list" aria-label="Elsewhere" {...stylex.props(styles.list)}>
          <li>
            <a href={`mailto:${site.email}`} {...stylex.props(ui.link, ui.quietLink, ui.plainLink)}>
              Email
            </a>
          </li>
          <li>
            <a href={site.linkedin} {...stylex.props(ui.link, ui.quietLink, ui.plainLink)}>
              LinkedIn
            </a>
          </li>
          <li>
            <a href={site.github} {...stylex.props(ui.link, ui.quietLink, ui.plainLink)}>
              GitHub
            </a>
          </li>
          <li>
            <a href={site.x} rel="me noopener" {...stylex.props(ui.link, ui.quietLink, ui.plainLink)}>
              X
            </a>
          </li>
          <li>
            {/* The video and image credits are on a page of their own, not under every page. */}
            <Link to="/credits/" {...stylex.props(ui.link, ui.quietLink, ui.plainLink)}>
              Credits
            </Link>
          </li>
        </ul>
      </div>
      {/*
        Line art across the full width: the AK mark, Workout Director exercise
        figures mid-movement and the WD mark on a phone. Decorative, so it has no alt text.
        Phones get a narrower drawing (the push-up left out, the phone moved up next to the
        curl) so the whole of it fits the screen at a readable size. Only the one shown is
        loaded: a lazy image that is not displayed is never fetched.
      */}
      <img
        src="/assets/img/footer-identity.svg"
        width={2400}
        height={560}
        data-footer-art=""
        data-viewbox="0 0 2400 560"
        alt=""
        loading="lazy"
        decoding="async"
        {...stylex.props(styles.art, styles.wide)}
      />
      <img
        src="/assets/img/footer-identity-phone.svg"
        width={1682}
        height={440}
        data-footer-art=""
        data-viewbox="70 120 1682 440"
        alt=""
        loading="lazy"
        decoding="async"
        {...stylex.props(styles.art, styles.narrow)}
      />
    </footer>
  )
}

const styles = stylex.create({
  footer: {
    marginTop: space.s48,
    color: colors.muted,
    fontSize: type.meta,
    overflow: 'hidden',
    // Keeps the baseline of the drawing clear of the home indicator on phones.
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: '0.75rem',
    columnGap: '2rem',
    paddingTop: space.s24,
    paddingBottom: space.s24,
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    rowGap: '0.4rem',
    columnGap: '1.25rem',
  },
  art: {
    width: '100%',
    maxWidth: '1680px',
    height: 'auto',
    marginInline: 'auto',
    // Room above the drawing for the page's pen line to bend into the A (see PenMerge).
    marginTop: { default: space.s24, [breakpoints.tablet]: space.s48 },
    filter: colors.artFilter,
    opacity: colors.artOpacity,
    userSelect: 'none',
    pointerEvents: 'none',
  },
  wide: {
    display: { default: 'block', [breakpoints.phone]: 'none' },
  },
  narrow: {
    display: { default: 'none', [breakpoints.phone]: 'block' },
  },
})

import * as stylex from '@stylexjs/stylex'
import { Link, useLocation } from '@tanstack/react-router'
import { nav, site } from '~/content/site'
import { sectionFor } from '~/lib/urls'
import { breakpoints, colors, type } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const section = sectionFor(pathname)
  const isHome = pathname === '/'

  return (
    <header {...stylex.props(styles.header)}>
      <div {...stylex.props(ui.wrap, styles.row)}>
        <Link to="/" aria-current={isHome ? 'page' : undefined} {...stylex.props(ui.focusRing, styles.home)}>
          <Brand />
          <span {...stylex.props(ui.visuallyHidden)}>{site.name}</span>
        </Link>
        <nav aria-label="Main" {...stylex.props(styles.nav)}>
          <ul role="list" {...stylex.props(styles.list)}>
            {nav.map((item) => {
              const active = section === item.to
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    aria-current={active ? 'page' : undefined}
                    {...stylex.props(ui.focusRing, styles.navLink, active && styles.active)}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
        <div {...stylex.props(styles.toggle)}>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

const styles = stylex.create({
  header: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.line,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: { default: 'nowrap', [breakpoints.phone]: 'wrap' },
    gap: { default: '1rem', [breakpoints.phone]: 0 },
    minHeight: '64px',
    paddingTop: { default: 0, [breakpoints.phone]: '0.6rem' },
  },
  home: {
    display: 'block',
    color: colors.text,
    paddingBlock: '0.5rem',
  },
  nav: {
    marginLeft: { default: 'auto', [breakpoints.phone]: '-0.65rem' },
    order: { default: null, [breakpoints.phone]: 3 },
    width: { default: null, [breakpoints.phone]: '100%' },
    marginTop: { default: null, [breakpoints.phone]: '0.2rem' },
    marginBottom: { default: null, [breakpoints.phone]: '0.5rem' },
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    gap: '0.25rem',
  },
  navLink: {
    display: 'block',
    paddingBlock: '0.3rem',
    paddingInline: '0.65rem',
    textDecorationLine: { default: 'none', ':hover': 'underline' },
    textDecorationThickness: '1px',
    textUnderlineOffset: '6px',
    fontSize: type.meta,
    color: { default: colors.muted, ':hover': colors.text },
  },
  active: {
    color: colors.text,
    textDecorationLine: 'underline',
  },
  toggle: {
    marginLeft: { default: null, [breakpoints.phone]: 'auto' },
    display: 'flex',
  },
})

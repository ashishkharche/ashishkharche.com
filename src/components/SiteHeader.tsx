import * as stylex from '@stylexjs/stylex'
import { Link, useLocation } from '@tanstack/react-router'
import { nav, site } from '~/content/site'
import { sectionFor } from '~/lib/urls'
import { breakpoints, colors, type } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'
import { ui } from '~/styles/ui'
import { Brand } from './Brand'
import { ThemeToggle } from './ThemeToggle'

export function SiteHeader() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const section = sectionFor(pathname)
  const isHome = pathname === '/'

  return (
    <header {...stylex.props(sk.ruleBottom)}>
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
    position: 'relative',
    display: 'block',
    paddingBlock: '0.3rem',
    paddingInline: '0.65rem',
    textDecorationLine: 'none',
    fontSize: type.meta,
    color: { default: colors.muted, ':hover': colors.text },
  },
  // The page you are on is circled by hand, as you would mark it on a printed page.
  active: {
    color: colors.text,
    '::after': {
      content: '""',
      position: 'absolute',
      top: '-0.15rem',
      bottom: '-0.15rem',
      left: '-0.1rem',
      right: '-0.1rem',
      backgroundColor: colors.inkStrong,
      maskImage: 'url("/assets/img/sketch/loop.svg")',
      maskRepeat: 'no-repeat',
      maskSize: '100% 100%',
      pointerEvents: 'none',
    },
  },
  toggle: {
    marginLeft: { default: null, [breakpoints.phone]: 'auto' },
    display: 'flex',
  },
})

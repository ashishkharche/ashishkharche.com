import * as stylex from '@stylexjs/stylex'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { NotFound } from '~/components/NotFound'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { site } from '~/content/site'
import { feedPath, feedTitle } from '~/lib/feed'
import { themeScript } from '~/lib/theme'
import globalCss from '~/styles/global.css?url'
import { colors, fonts, type } from '~/styles/tokens.stylex'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'author', content: site.name },
      { name: 'color-scheme', content: 'light dark' },
    ],
    links: [
      { rel: 'icon', href: '/favicon.ico', sizes: '32x32' },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/site.webmanifest' },
      { rel: 'alternate', type: 'application/atom+xml', title: feedTitle, href: feedPath },
      {
        rel: 'preload',
        href: '/assets/fonts/Geist-Latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      // The serif is only used for headings, and the page title is above the fold.
      {
        rel: 'preload',
        href: '/assets/fonts/GeistSerif-Latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      { rel: 'stylesheet', href: globalCss },
    ],
    scripts: [{ children: themeScript }],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
})

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    // The theme script may add a theme class before React hydrates.
    <html lang={site.lang} suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Written here because head() keeps only one meta tag per name. */}
        <meta name="theme-color" content="#faf8f3" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0c0d0e" media="(prefers-color-scheme: dark)" />
      </head>
      <body {...stylex.props(styles.body)}>
        <a href="#main" {...stylex.props(styles.skip)}>
          Skip to content
        </a>
        <SiteHeader />
        {children}
        <SiteFooter />
        <Scripts />
      </body>
    </html>
  )
}

const styles = stylex.create({
  body: {
    backgroundColor: colors.bg,
    backgroundImage: colors.grain,
    backgroundRepeat: 'repeat',
    color: colors.text,
    colorScheme: colors.scheme,
    fontFamily: fonts.sans,
    fontWeight: 400,
    fontSize: type.body,
    lineHeight: 1.65,
  },
  skip: {
    position: 'absolute',
    left: '1rem',
    top: { default: '-80px', ':focus': '1rem' },
    zIndex: 10,
    paddingBlock: '0.5rem',
    paddingInline: '0.9rem',
    borderRadius: '6px',
    backgroundColor: colors.text,
    color: colors.bg,
  },
})

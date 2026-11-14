import * as stylex from '@stylexjs/stylex'
import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { NotFound } from '~/components/NotFound'
import { PenMerge } from '~/components/PenMerge'
import { SiteFooter } from '~/components/SiteFooter'
import { SiteHeader } from '~/components/SiteHeader'
import { SketchDefs } from '~/components/SketchDefs'
import { site } from '~/content/site'
import { feedPath, feedTitle } from '~/lib/feed'
import { themeScript } from '~/lib/theme'
import globalCss from '~/styles/global.css?url'
import { breakpoints, colors, fonts, layout, leading, type } from '~/styles/tokens.stylex'

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
        href: '/assets/fonts/Newsreader-Latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      // The display face is only used for headings, and the name is above the fold.
      {
        rel: 'preload',
        href: '/assets/fonts/SourceSans3-Latin.woff2',
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
        <SketchDefs />
        <a href="#main" {...stylex.props(styles.skip)}>
          Skip to content
        </a>
        <SiteHeader />
        {/*
          One pen line through the page: it runs down the left of every page, just outside the content, and at the
          bottom becomes the left stroke of the A in the footer drawing (see PenMerge). Section lines start from it.
          Decorative.
        */}
        <div {...stylex.props(styles.scene)}>
          {children}
          <SiteFooter />
          <span aria-hidden="true" data-pen-spine="" {...stylex.props(styles.pen, styles.spine)} />
          <PenMerge />
        </div>
        <Scripts />
      </body>
    </html>
  )
}

// Where the line runs: the wrap's left edge (see ui.wrap) less the spine gap, and 8px less again for the middle of
// the 16px pen drawing.
const spineLeft = `calc(max(${layout.sceneInset}, (100% - ${layout.wide}) / 2) - ${layout.spineGap} - 8px)`
const spineLeftPhone = `calc(1.5rem - ${layout.spineGapPhone} - 8px)`
// Roughly where the footer starts, from the bottom of the page: the drawing (the page width up to 1680px, 560 units
// tall; 440 of 1682 on phones), the space above it and the text row (see SiteFooter.tsx).
const footerTop = 'calc(min(100cqw, 1680px) * 560 / 2400 + 1.5rem + 4.5rem + env(safe-area-inset-bottom, 0px))'
const footerTopTablet = 'calc(100cqw * 560 / 2400 + 3rem + 4.5rem + env(safe-area-inset-bottom, 0px))'
const footerTopPhone = 'calc(100cqw * 440 / 1682 + 3rem + 7rem + env(safe-area-inset-bottom, 0px))'

const styles = stylex.create({
  scene: { position: 'relative', containerType: 'inline-size' },
  pen: {
    position: 'absolute',
    backgroundColor: colors.ink,
    pointerEvents: 'none',
  },
  spine: {
    top: '1.5rem',
    width: '16px',
    left: { default: spineLeft, [breakpoints.phone]: spineLeftPhone },
    // Until the bend into the A is measured (and without JavaScript), the line ends above the footer.
    bottom: { default: footerTop, [breakpoints.tablet]: footerTopTablet, [breakpoints.phone]: footerTopPhone },
    maskImage: 'url("/assets/img/scene/line-v.svg")',
    maskRepeat: 'repeat-y',
    maskSize: '16px 1200px',
  },
  body: {
    backgroundColor: colors.bg,
    color: colors.text,
    colorScheme: colors.scheme,
    fontFamily: fonts.sans,
    fontWeight: 400,
    fontSize: type.body,
    lineHeight: leading.body,
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

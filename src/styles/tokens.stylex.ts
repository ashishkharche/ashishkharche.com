import * as stylex from '@stylexjs/stylex'

const DARK = '@media (prefers-color-scheme: dark)'

/**
 * Colour tokens. The defaults follow the system setting; the light and dark
 * themes below override them when someone picks a theme with the toggle.
 */
export const colors = stylex.defineVars({
  bg: { default: '#faf8f3', [DARK]: '#0c0d0e' },
  // The footer drawing is black line art; dark mode turns it light.
  artFilter: { default: 'none', [DARK]: 'invert(1)' },
  artOpacity: { default: '0.42', [DARK]: '0.3' },
  // The footer drawing's pen: its line colour (black at artOpacity on the paper) for drawn rules and frames.
  ink: { default: 'rgb(9 10 11 / 0.42)', [DARK]: 'rgb(241 246 243 / 0.34)' },
  // The same pen pressed harder, for the outlines of things you can press, so they keep 3:1 contrast.
  inkStrong: { default: 'rgb(9 10 11 / 0.66)', [DARK]: 'rgb(241 246 243 / 0.6)' },
  // A hand-drawn underline for links in running text, drawn in the ink colour of each theme.
  inkUnderline: {
    default: 'url("/assets/img/sketch/underline-light.svg")',
    [DARK]: 'url("/assets/img/sketch/underline-dark.svg")',
  },
  // Hand-drawn outlines (boxes and pills) for border-image, in each theme's ink. See src/styles/sketch.ts.
  skBox: {
    default: 'url("/assets/img/sketch/box-light.svg")',
    [DARK]: 'url("/assets/img/sketch/box-dark.svg")',
  },
  skBoxStrong: {
    default: 'url("/assets/img/sketch/box-strong-light.svg")',
    [DARK]: 'url("/assets/img/sketch/box-strong-dark.svg")',
  },
  skPill: {
    default: 'url("/assets/img/sketch/pill-light.svg")',
    [DARK]: 'url("/assets/img/sketch/pill-dark.svg")',
  },
  skPillHeavy: {
    default: 'url("/assets/img/sketch/pill-heavy-light.svg")',
    [DARK]: 'url("/assets/img/sketch/pill-heavy-dark.svg")',
  },
  text: { default: '#090a0b', [DARK]: '#f1f6f3' },
  muted: { default: '#4d5755', [DARK]: '#a9b2bc' },
  line: { default: 'rgb(9 10 11 / 0.3)', [DARK]: 'rgb(241 246 243 / 0.22)' },
  accent: { default: '#090a0b', [DARK]: '#f1f6f3' },
  accentLine: {
    default: 'rgb(9 10 11 / 0.35)',
    [DARK]: 'rgb(241 246 243 / 0.4)',
  },
  soft: { default: 'transparent', [DARK]: 'transparent' },
  // Code blocks: a neutral light grey, not the green-tinted soft colour.
  codeBg: { default: '#f6f7f8', [DARK]: '#141618' },
  codeLine: { default: '#e3e6e8', [DARK]: '#262a2d' },
  panel: { default: '#e8eeeb', [DARK]: '#1b1f21' },
  diagramEdge: { default: '#95a3a1', [DARK]: '#5f6a6c' },
  phoneEdge: { default: 'rgb(9 10 11 / 0.08)', [DARK]: 'rgb(255 255 255 / 0.12)' },
  // The backdrop behind the app screens: a soft panel with a light glow at the top.
  stage: { default: '#e6ece9', [DARK]: '#131618' },
  stageGlow: { default: 'rgb(255 255 255 / 0.85)', [DARK]: 'rgb(255 255 255 / 0.07)' },
  stageShadow: { default: 'rgb(9 10 11 / 0.32)', [DARK]: 'rgb(0 0 0 / 0.7)' },
  scheme: { default: 'light', [DARK]: 'dark' },
  // Which theme icon to show on the toggle.
  sunDisplay: { default: 'block', [DARK]: 'none' },
  moonDisplay: { default: 'none', [DARK]: 'block' },
})

const light = {
  bg: '#faf8f3',
  artFilter: 'none',
  artOpacity: '0.42',
  ink: 'rgb(9 10 11 / 0.42)',
  inkStrong: 'rgb(9 10 11 / 0.66)',
  inkUnderline: 'url("/assets/img/sketch/underline-light.svg")',
  skBox: 'url("/assets/img/sketch/box-light.svg")',
  skBoxStrong: 'url("/assets/img/sketch/box-strong-light.svg")',
  skPill: 'url("/assets/img/sketch/pill-light.svg")',
  skPillHeavy: 'url("/assets/img/sketch/pill-heavy-light.svg")',
  text: '#090a0b',
  muted: '#4d5755',
  line: 'rgb(9 10 11 / 0.3)',
  accent: '#090a0b',
  accentLine: 'rgb(9 10 11 / 0.35)',
  soft: 'transparent',
  codeBg: '#f6f7f8',
  codeLine: '#e3e6e8',
  panel: '#e8eeeb',
  diagramEdge: '#95a3a1',
  phoneEdge: 'rgb(9 10 11 / 0.08)',
  stage: '#e6ece9',
  stageGlow: 'rgb(255 255 255 / 0.85)',
  stageShadow: 'rgb(9 10 11 / 0.32)',
  scheme: 'light',
  sunDisplay: 'block',
  moonDisplay: 'none',
}

const dark = {
  bg: '#0c0d0e',
  artFilter: 'invert(1)',
  artOpacity: '0.3',
  ink: 'rgb(241 246 243 / 0.34)',
  inkStrong: 'rgb(241 246 243 / 0.6)',
  inkUnderline: 'url("/assets/img/sketch/underline-dark.svg")',
  skBox: 'url("/assets/img/sketch/box-dark.svg")',
  skBoxStrong: 'url("/assets/img/sketch/box-strong-dark.svg")',
  skPill: 'url("/assets/img/sketch/pill-dark.svg")',
  skPillHeavy: 'url("/assets/img/sketch/pill-heavy-dark.svg")',
  text: '#f1f6f3',
  muted: '#a9b2bc',
  line: 'rgb(241 246 243 / 0.22)',
  accent: '#f1f6f3',
  accentLine: 'rgb(241 246 243 / 0.4)',
  soft: 'transparent',
  codeBg: '#141618',
  codeLine: '#262a2d',
  panel: '#1b1f21',
  diagramEdge: '#5f6a6c',
  phoneEdge: 'rgb(255 255 255 / 0.12)',
  stage: '#131618',
  stageGlow: 'rgb(255 255 255 / 0.07)',
  stageShadow: 'rgb(0 0 0 / 0.7)',
  scheme: 'dark',
  sunDisplay: 'none',
  moonDisplay: 'block',
}

export const lightTheme = stylex.createTheme(colors, light)
export const darkTheme = stylex.createTheme(colors, dark)

export const fonts = stylex.defineConsts({
  sans: 'Geist, "Geist Fallback", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  // Display headings. Geist Serif has one weight, so headings set in it use 400.
  serif: '"Geist Serif", "Geist Serif Fallback", ui-serif, Georgia, serif',
})

const PHONE = '@media (max-width: 560px)'

/**
 * The type scale: five sizes on one modular scale (ratio 1.2, the minor third),
 * from a 17px body on wider screens and a 16px body on phones, rounded to whole
 * pixels (14, 17, 20, 35, 72 and 13, 16, 19, 33, 48). Every text size
 * on the home page is one of these, so there are five sizes, two families
 * (Geist and Geist Serif) and two weights (400 and 500). See
 * site-shots/home-hero-v3/b3/TYPE-AUDIT.md for the audit and the sources.
 */
export const type = stylex.defineVars({
  // Dates, captions, credits, nav, footer, role lines, tags: about body / 1.2.
  meta: { default: '0.875rem', [PHONE]: '0.8125rem' },
  // Running text, links and the role names.
  body: { default: '1.0625rem', [PHONE]: '1rem' },
  // The intro lead, note titles and the Workout Director name: about body x 1.2.
  lead: { default: '1.25rem', [PHONE]: '1.1875rem' },
  // Section and project titles: about body x 1.2^4.
  title: { default: '2.1875rem', [PHONE]: '2.0625rem' },
  // The name only: about body x 1.2^8 on wide screens, x 1.2^6 on phones.
  display: { default: '5.25rem', [PHONE]: '3.25rem' },
})

/** The two weights. Geist Serif has one weight, so serif text always uses regular. */
export const weights = stylex.defineConsts({
  regular: '400',
  medium: '500',
})

export const layout = stylex.defineConsts({
  // The panorama: the width the home page's scenes are drawn across, and the header and footer with them.
  wide: '1240px',
  // About 72 characters of body text per line.
  column: '36rem',
  // For pages with a date column beside the text, such as Work, and the case study details row.
  columnWide: '46rem',
  gutter: '2.5rem',
  // The drawn line down the sides of the page (see Scene.tsx): how far in from the edge it runs.
  sceneX: 'clamp(0.75rem, 2.4vw, 2.25rem)',
  // How far content keeps in from the page edge: clear of that line and its 48px turns. Header, footer and pages share it.
  sceneInset: 'calc(clamp(0.75rem, 2.4vw, 2.25rem) + 48px + 0.5rem)',
})

export const breakpoints = stylex.defineConsts({
  tablet: '@media (max-width: 760px)',
  phone: '@media (max-width: 560px)',
  // Below this the hero screens become a sideways scroller instead of three in a row.
  narrow: '@media (max-width: 640px)',
  desktop: '@media (min-width: 761px)',
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
})

/**
 * Chart typography: four sizes from the site's type scale (ratio 1.2), two weights and the site's two families, used
 * by every chart renderer (scatter and the live kinds), on the canvas, in PNG exports and in SVG exports.
 *
 * Sizes are px on the 1800 px wide base figure. That figure is shown as a 1200 px wide card at 1x, so each size is
 * the site size x 1.5: display 72, title 35, body 17 and meta 14 (the site's 1x sizes; lead is not used in charts).
 * Other export sizes scale the whole figure, never one size on its own.
 */
export const CHART_SIZES = {
  /** The one big answer on a headline chart. */
  display: 108,
  /** The chart's question or title, and the big values on a head to head. */
  title: 52.5,
  /** Subtitles, app names, values, sentences and point labels. */
  body: 25.5,
  /** Axis ticks, axis titles, details under names, footnotes and the source line. */
  meta: 21,
} as const

export type TypeRole = keyof typeof CHART_SIZES

/** From largest to smallest; text that does not fit steps down this list, never to an in-between size. */
export const ROLE_ORDER: TypeRole[] = ['display', 'title', 'body', 'meta']

export const CHART_WEIGHTS = { regular: 400, medium: 500 } as const
export type ChartWeight = (typeof CHART_WEIGHTS)[keyof typeof CHART_WEIGHTS]

/** Families registered for the chart (FontFace on the page, @font-face in SVG files). */
export const CHART_FAMILIES = { sans: 'ChartGeist' } as const
export type ChartFamily = keyof typeof CHART_FAMILIES

/** The site's own self-hosted Geist file, a variable font (400 to 700). Charts use Geist only. */
export const CHART_FONT_FILES = [
  { family: CHART_FAMILIES.sans, weight: '400 500', url: '/assets/fonts/Geist-Latin.woff2' },
] as const

/** What a font string falls back to when a chart font is missing (and for glyphs Geist lacks). */
export const FALLBACK = 'ui-sans-serif, system-ui, sans-serif'

/** Geist's typographic ascender and descender, as fractions of the font size. */
export const ASCENT = 1005 / 1000
export const DESCENT = 295 / 1000

/** The size in px for a role at a layout scale; nothing is drawn below the 14 px meta size on any export. */
export const META_MIN_PX = 14
/** Gallery thumbnails (s 0.4) are not exports and keep the plain scale; every export size has s of 0.6 or more. */
export const EXPORT_MIN_SCALE = 0.5
export const sizeOf = (role: TypeRole, s: number) =>
  role === 'meta' && s >= EXPORT_MIN_SCALE ? Math.max(CHART_SIZES.meta * s, META_MIN_PX) : CHART_SIZES[role] * s

/** A canvas font string. */
export function fontString(size: number, weight: ChartWeight, family: ChartFamily = 'sans'): string {
  return `${weight} ${size}px ${CHART_FAMILIES[family]}, ${FALLBACK}`
}

/**
 * The largest role from `start` down whose width fits, using `width(size)`. Returns meta if nothing fits; callers
 * that must fit then shorten the text.
 */
export function fitRole(start: TypeRole, s: number, maxWidth: number, width: (size: number) => number): number {
  for (const role of ROLE_ORDER.slice(ROLE_ORDER.indexOf(start))) {
    const size = sizeOf(role, s)
    if (width(size) <= maxWidth) return size
  }
  return sizeOf('meta', s)
}

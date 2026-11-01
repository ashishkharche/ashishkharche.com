/** Output sizes. Sources for the X guidance are linked on the page (xImageSources). */
export interface ChartSize {
  id: 'original' | 'wide' | 'square'
  label: string
  width: number
  height: number
}

export const chartSizes: ChartSize[] = [
  { id: 'original', label: 'Same as the X charts, 1800 × 1390', width: 1800, height: 1390 },
  { id: 'wide', label: '16:9, 1920 × 1080', width: 1920, height: 1080 },
  { id: 'square', label: '1:1, 1200 × 1200', width: 1200, height: 1200 },
]

/** X shows a single image in full between 2:1 and 3:4, and photos can be up to 5 MB. */
export const X_MAX_BYTES = 5 * 1024 * 1024
export const X_RATIO_RANGE = { widest: 2, tallest: 3 / 4 }

export function fitsX(size: Pick<ChartSize, 'width' | 'height'>): boolean {
  const ratio = size.width / size.height
  return ratio <= X_RATIO_RANGE.widest + 1e-9 && ratio >= X_RATIO_RANGE.tallest - 1e-9
}

export const xImageSources = {
  help: 'https://help.x.com/en/using-x/posting-gifs-and-pictures',
  adSpecs: 'https://business.x.com/en/help/campaign-setup/creative-ad-specifications',
} as const

/** A file name for a download, from the title, size and scale. */
export function fileName(
  title: string,
  size: Pick<ChartSize, 'width' | 'height'>,
  scale: number,
  extension: 'png' | 'svg',
): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  const pixels = extension === 'svg' ? `${size.width}x${size.height}` : `${size.width * scale}x${size.height * scale}`
  return `${slug || 'chart'}-${pixels}.${extension}`
}

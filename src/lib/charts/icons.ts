/**
 * Where the chart builder loads app icons from: never the icon hosts themselves. First the copy baked into the deploy
 * (/lab/charts/icons/, written by scripts/lab-charts-icons.ts for every icon in the build snapshot), then the
 * same-origin icon route (api/icon.ts), which fetches from the allowed hosts only and is cached on the CDN. If both
 * fail the chart draws the neutral tile.
 */
import { iconAllowed } from './tdn.ts'

export const ICON_ROUTE = '/api/icon/'
export const ICON_DIR = '/lab/charts/icons/'
export const ICON_MANIFEST = `${ICON_DIR}index.json`
/** Baked icons are this many px square, enough for the largest icon at 2x. */
export const BAKED_SIZE = 256

export type IconManifest = { savedAt: string; files: Record<string, string> }

const BAKED_FILE = /^[a-f0-9]{16}\.webp$/

export const iconRouteUrl = (url: string) => `${ICON_ROUTE}?u=${encodeURIComponent(url)}`

/** Same-origin places to try for an icon, in order; empty when the URL is not an allowed icon. */
export function iconSources(url: string | null | undefined, manifest: IconManifest | null): string[] {
  if (!iconAllowed(url)) return []
  const file = manifest?.files[url]
  return [...(file && BAKED_FILE.test(file) ? [`${ICON_DIR}${file}`] : []), iconRouteUrl(url)]
}

/** Reads the baked icon list once; a missing or broken file is no list (the route still works). */
export function manifestLoader(
  load: () => Promise<IconManifest | null> = () =>
    fetch(ICON_MANIFEST).then((r) => (r.ok ? (r.json() as Promise<IconManifest>) : null)),
): () => Promise<IconManifest | null> {
  let file: Promise<IconManifest | null> | undefined
  return () => (file ??= load().catch(() => null))
}

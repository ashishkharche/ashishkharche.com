// The words on each chart template: titles, footnotes, point labels and how the
// template is listed. Kept apart from the data so a fresh copy of the data
// (scripts/lab-charts-data.ts) gets the same words.
//
//   node scripts/lab-charts-copy.ts   rewrites public/lab/charts/data/<id>.json in place
//
// Every number here is checked against the rows by tests/unit/charts.test.ts.
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { composeLabel, type ChartConfig, type LabelConfig, type LabelField } from '../src/lib/charts/config.ts'

interface Copy {
  title: string
  subtitle: string
  footnote: [string, string, string]
  /** Axis titles, when the data's own titles are not plain enough. */
  axes?: { x?: string; y?: string }
  footnote_counts?: ChartConfig['footnote_counts']
  label_fields: Record<string, LabelField>
  /** One entry per label, in the config's order. */
  labels: Array<{ show: string[]; stack?: boolean; place?: Pick<LabelConfig, 'ha' | 'va' | 'offset'> }>
  /** Caveat wording on the chart, by column and old wording. */
  chart_text?: Record<string, Record<string, string>>
  source: string
  template: { name: string; sample: string; source_short: string }
}

const appStore = 'public App Store ranking pages and Apple lookup data'
const builds = 'public Android app build analysis pages'

export const copy: Record<string, Copy> = {
  'us-rank-countries': {
    title: 'US App Store rank vs countries in the Top Free 100',
    subtitle: '30 tracked iOS apps in the US Top Free 100 on 1 Nov 2026',
    footnote: [
      'Source: {source}, 1 Nov 2026 (single snapshot).',
      '{n_rows} tracked apps, not the full chart. Countries: of 175 with data, where the app is in the Top Free 100.',
      'No ranks averaged. Rank is not downloads or users. Muse from Meta is on sale in only 5 countries.',
    ],
    label_fields: {
      us_rank: { name: 'US rank', format: 'US #{us_rank}' },
      countries_charted: { name: 'Countries', format: '{countries_charted} countries' },
      countries_top10: { name: 'Top 10 in', format: 'top 10 in {countries_top10}' },
      storefronts_available: { name: 'On sale in', format: 'on sale in {storefronts_available}' },
    },
    labels: [
      { show: ['us_rank', 'countries_charted', 'storefronts_available'], stack: true },
      { show: ['us_rank', 'countries_charted'], stack: true },
    ],
    chart_text: { countries_charted: { 'limited launch': 'on sale in only 5' } },
    axes: { y: 'Countries in the Top Free 100' },
    source: appStore,
    template: { name: 'US rank vs countries charted', sample: '30 iOS apps', source_short: 'App Store' },
  },
  'android-permissions': {
    title: 'Android manifest permissions vs third-party SDKs',
    subtitle: 'Latest analyzed build of 171 Android apps, 1 Nov 2026',
    footnote: [
      'Source: {source}, 1 Nov 2026. Latest build of {n_rows} apps, not all of Google Play.',
      "Permissions: declared in the manifest, not granted or used. Alipay's 200 may be a list cap.",
      'SDKs: {n_observed} observed, {n_lower} a lower bound. {stale_count} builds older than 60 days (oldest {oldest}).',
    ],
    label_fields: {
      permissions: { name: 'Permissions', format: '{permissions} permissions' },
      sdks: { name: 'SDKs', format: '{sdks} SDKs' },
      permissions_rank: { name: 'Rank', format: '#{permissions_rank} of {n_builds}' },
      native_libs: { name: 'Native libraries', format: '{native_libs} native libraries' },
    },
    labels: [
      { show: ['permissions'] },
      { show: ['permissions'] },
      { show: ['permissions'] },
      // Facebook sits just left of Phone by Google, so its label goes underneath.
      { show: ['permissions'], place: { ha: 'left', va: 'top', offset: [-18, -26] } },
      { show: ['permissions', 'permissions_rank'] },
    ],
    source: builds,
    template: { name: 'Permissions vs SDKs', sample: '171 Android builds', source_short: 'Build analysis' },
  },
  'ai-apps-ios-android-sdks': {
    title: 'Third-party SDKs detected in AI apps: iOS vs Android',
    subtitle: '10 AI apps with both builds analyzed, latest build per platform',
    footnote: [
      'Source: {source}, 1 Nov 2026. Latest build per platform, analyzed Jun to Oct 2026.',
      'iOS: {n_ios_lower} of {n_rows} counts a lower bound. Android: {n_android_observed} of {n_rows} observed, so not like-for-like.',
      'Only apps with both platforms analyzed. Builds older than 60 days are labelled.',
    ],
    footnote_counts: {
      n_ios_lower: { column: 'ios_detection', equals: 'lower bound' },
      n_android_observed: { column: 'android_detection', equals: 'observed' },
    },
    label_fields: {
      ios_sdks: { name: 'iOS SDKs', format: '{ios_sdks} on iOS' },
      android_sdks: { name: 'Android SDKs', format: '{android_sdks} on Android' },
    },
    labels: [{ show: ['ios_sdks', 'android_sdks'], stack: true }, { show: ['ios_sdks', 'android_sdks'] }],
    source: 'public app build analysis pages',
    template: { name: 'AI apps: iOS vs Android SDKs', sample: '10 AI apps', source_short: 'Build analysis' },
  },
  'android-native-libs': {
    title: 'Android native libraries vs third-party SDKs',
    subtitle: 'The 80 analyzed Android builds with the most third-party SDKs',
    footnote: [
      'Source: {source}, 1 Nov 2026. The {n_rows} builds with the most SDKs, not all apps.',
      'Native libraries: .so files, not their size or what they do. SDK counts can be a lower bound.',
      '{stale_count} of {n_rows} builds older than 60 days (oldest {oldest}).',
    ],
    label_fields: {
      native_libs: { name: 'Native libraries', format: '{native_libs} native libraries' },
      sdks: { name: 'SDKs', format: '{sdks} SDKs' },
      permissions: { name: 'Permissions', format: '{permissions} permissions' },
    },
    labels: [{ show: ['native_libs'] }, { show: ['native_libs'] }],
    source: builds,
    template: { name: 'Native libraries vs SDKs', sample: '80 Android builds', source_short: 'Build analysis' },
  },
  'us-rating-countries': {
    title: 'US App Store rating vs countries in the Top Free 100',
    subtitle: '30 tracked iOS apps in the US Top Free 100 on 1 Nov 2026',
    footnote: [
      'Source: {source}, 1 Nov 2026 (single snapshot).',
      '{n_rows} tracked apps, not the full chart. Countries: where the app is in the Top Free 100.',
      'Rating: US ratings only, not how many people use the app. Muse from Meta is on sale in only 5 countries.',
    ],
    label_fields: {
      rating: { name: 'Rating', format: '{rating:.1f} stars' },
      countries_charted: { name: 'Countries', format: '{countries_charted} countries' },
      us_rank: { name: 'US rank', format: 'US #{us_rank}' },
      reviews: { name: 'Ratings count', format: '{reviews} ratings' },
    },
    labels: [
      { show: ['rating', 'countries_charted'], stack: true },
      { show: ['rating', 'countries_charted'], stack: true },
    ],
    chart_text: { countries_charted: { 'limited launch': 'on sale in only 5' } },
    axes: { y: 'Countries in the Top Free 100' },
    source: appStore,
    template: { name: 'US rating vs countries charted', sample: '30 iOS apps', source_short: 'App Store' },
  },
}

/** The config with the words above. Labels keep their position and target. */
export function applyCopy(id: string, config: Record<string, unknown>): Record<string, unknown> {
  const words = copy[id]
  if (!words) throw new Error(`No words for ${id}`)
  const next = structuredClone(config) as unknown as ChartConfig
  next.title = words.title
  next.subtitle = words.subtitle
  next.footnote = [...words.footnote]
  if (words.footnote_counts) next.footnote_counts = { ...next.footnote_counts, ...words.footnote_counts }
  next.label_fields = words.label_fields
  if (words.axes?.x) next.x = { ...next.x, label: words.axes.x }
  if (words.axes?.y) next.y = { ...next.y, label: words.axes.y }
  const labels = next.labels ?? []
  if (labels.length !== words.labels.length)
    throw new Error(`${id}: ${labels.length} labels, ${words.labels.length} in the copy`)
  next.labels = labels.map((label, i) => {
    const { show, stack, place } = words.labels[i] ?? { show: [] }
    const out = { ...label, ...place, show, stack }
    if (!stack) delete out.stack
    return { ...out, text: composeLabel(out, next) }
  })
  for (const [field, swaps] of Object.entries(words.chart_text ?? {})) {
    for (const bias of next.metrics[field]?.biases ?? []) {
      if (bias.chart_text && swaps[bias.chart_text]) bias.chart_text = swaps[bias.chart_text]
    }
  }
  next.source_default = words.source
  next.template = {
    name: words.template.name,
    sample: words.template.sample,
    source_short: words.template.source_short,
    date: next.template?.date ?? '2026-11-01',
    source: words.source,
    ...(next.template?.extra ? { extra: true } : {}),
  }
  return next as unknown as Record<string, unknown>
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = new URL('../public/lab/charts/data/', import.meta.url).pathname
  for (const id of Object.keys(copy)) {
    const file = join(dir, `${id}.json`)
    const config = JSON.parse(await readFile(file, 'utf8')) as Record<string, unknown>
    await writeFile(file, `${JSON.stringify(applyCopy(id, config), null, 2)}\n`)
    console.log(`${id}: words updated`)
  }
}

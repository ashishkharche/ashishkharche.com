import { CSPProvider } from '@base-ui/react/csp-provider'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { Select } from '@base-ui/react/select'
import * as stylex from '@stylexjs/stylex'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  composeLabel,
  filterRows,
  labelRows,
  nameOf,
  shortName,
  toNumber,
  validate,
  type AxisConfig,
  type ChartConfig,
  type LabelConfig,
  type Row,
} from '~/lib/charts/config'
import {
  ICON_CELL,
  localSource,
  type ChartDataSource,
  type ChartTemplate,
  type TemplateSummary,
} from '~/lib/charts/data'
import { drawLive, type Icon } from '~/lib/charts/kinds'
import {
  isPlace,
  kindNames,
  liveTemplates,
  PLACES,
  loadWithFallback,
  retryDelay,
  scatterNotes,
  validateLive,
  type AppRef,
  type ChartText,
  type Kind,
  type LiveChart,
  type LiveTemplate,
  type Model,
  type PlaceId,
} from '~/lib/charts/live'
import { autoAxis, drawChart, drawPlaceholder, type Ctx } from '~/lib/charts/render'
import { CHART_FONT_FILES } from '~/lib/charts/type'
import { chartSizes, fileName, X_MAX_BYTES, type ChartSize } from '~/lib/charts/spec'
import { asCtx, SvgContext, type SvgFont } from '~/lib/charts/svg'
import { createTdnClient, iconAllowed, PAGE_CLIENT, snapshotLookup, trackClient, type Fetched } from '~/lib/charts/tdn'
import { fetchedLine, galleryGroups, keptCopyNote } from '~/lib/charts/page'
import { AboutData } from './AboutData'
import { breakpoints, colors, type as text, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

let fontsLoading: Promise<void> | undefined
/**
 * The site's Geist file, registered under the chart family name. Charts are drawn only after these
 * load, so the canvas, PNG and SVG never fall back to another font by accident.
 */
function loadChartFonts(): Promise<void> {
  fontsLoading ??= Promise.all(
    CHART_FONT_FILES.map(async ({ family, weight, url }) => {
      const face = new FontFace(family, `url(${url})`, { weight })
      document.fonts.add(await face.load())
    }),
  ).then(() => undefined)
  return fontsLoading
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(`Could not load ${src}`))
    image.src = src
  })
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the file'))
    reader.readAsDataURL(blob)
  })
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const words: Record<string, string> = { us: 'US', ios: 'iOS', sdks: 'SDKs', libs: 'libraries' }
/** A column name as words: "native_libs" is "Native libraries", "us_rank" is "US rank". */
const humanise = (field: string) => {
  const text = field
    .split('_')
    .map((word) => words[word] ?? word)
    .join(' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** The axis for a field: the template's own axis when it has one for that field, otherwise fitted to the data. */
function axisFor(field: string, original: ChartConfig, rows: Row[]): AxisConfig {
  const known = [original.x, original.y].find((a) => a.field === field)
  if (known) return structuredClone(known)
  const fitted = autoAxis(rows.map((r) => toNumber(r[field])))
  return { field, label: humanise(field), ...fitted }
}

/** "2026-11-01" as "1 Nov 2026". */
function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** How a top-by label is described: "#2 by permissions". */
function rankedBy(label: LabelConfig, fields: ChartConfig['label_fields']) {
  const field = label.top_by ?? ''
  const name = (fields?.[field]?.name ?? humanise(field)).toLowerCase()
  const first = (label.skip ?? 0) + 1
  const last = first + (label.n ?? 1) - 1
  return `${first === last ? `#${first}` : `#${first} to #${last}`} by ${name}`
}

/** Where select lists open: inside the page's main landmark, not at the end of the body. */
const PopupLayer = createContext<HTMLElement | null>(null)

type Entry = {
  id: string
  kind: Kind | 'scatter'
  name: string
  about: string
  field: string
  /** Why a template is held back from the default gallery, until its field is verified. */
  pending?: string
}

const iconCache = new Map<string, Promise<Icon | null>>()
const noIcons = new Map<string, Icon>()
/** An icon that has not loaded by then is drawn without, so a slow image never holds the chart back. */
const ICON_TIMEOUT_MS = 8000
/**
 * An app icon from an allowed host, loaded with CORS so the canvas stays exportable (a CORS failure is a load
 * error, so a loaded icon can always be drawn into a PNG). Null when it does not load in time; the chart is then
 * drawn without that icon. Failures are not kept, so the next load asks for the icon again.
 */
function loadIcon(url: string): Promise<Icon | null> {
  let found = iconCache.get(url)
  if (!found) {
    found = new Promise<Icon | null>((resolve) => {
      if (!iconAllowed(url)) return resolve(null)
      const image = new Image()
      const timer = setTimeout(() => done(false), ICON_TIMEOUT_MS)
      function done(ok: boolean) {
        clearTimeout(timer)
        image.onload = image.onerror = null
        resolve(ok && image.naturalWidth > 0 ? { image, width: image.naturalWidth, height: image.naturalHeight } : null)
      }
      image.crossOrigin = 'anonymous'
      image.decoding = 'async'
      // decode() can reject in some browsers for an image that has loaded fine (WebKit), so loaded is enough.
      image.onload = () => {
        image.decode().then(
          () => done(true),
          () => done(true),
        )
      }
      image.onerror = () => done(false)
      image.src = url
    })
    iconCache.set(url, found)
    void found.then((icon) => {
      if (!icon) iconCache.delete(url)
    })
  }
  return found
}

/** The icons of the apps in a chart that loaded, by app id. */
async function iconsFor(model: Model): Promise<Map<string, Icon>> {
  const found = await Promise.all(
    appsIn(model).map(
      async (app) => [app.appId, iconAllowed(app.iconUrl) ? await loadIcon(app.iconUrl) : null] as const,
    ),
  )
  return new Map(found.filter((f): f is readonly [string, Icon] => f[1] !== null))
}

function appsIn(model: Model): AppRef[] {
  switch (model.kind) {
    case 'headline':
      return [model.app, ...model.others.map((o) => o.app)]
    case 'leaderboard':
      return model.rows.map((r) => r.app)
    case 'head-to-head':
      return model.apps
    case 'bump':
      return model.series.map((x) => x.app)
    case 'dumbbell':
      return model.rows.map((r) => r.app)
  }
}

function describeLive(chart: LiveChart, text: ChartText): string {
  const what: Record<Kind, string> = {
    headline: 'Headline number',
    leaderboard: 'Ranked bar list',
    'head-to-head': 'Head to head comparison',
    bump: 'Line chart of rank by day',
    dumbbell: 'Dot plot of iOS and Android ranks',
  }
  const m = chart.model
  const detail =
    m.kind === 'headline'
      ? `${m.answer}${m.unit ? ` ${m.unit}` : ''}. ${m.sentence}`
      : m.kind === 'leaderboard'
        ? m.rows.map((r, i) => `${i + 1}. ${r.app.name}, ${r.display}`).join('; ')
        : m.kind === 'head-to-head'
          ? m.metrics
              .map((x) => `${x.label}: ${m.apps[0].name} ${x.display[0]}, ${m.apps[1].name} ${x.display[1]}`)
              .join('; ')
          : m.kind === 'bump'
            ? m.series.map((x) => `${x.app.name}, latest #${x.ranks.filter((r) => r !== null).at(-1) ?? ''}`).join('; ')
            : m.rows.map((r) => `${r.app.name}: iOS #${r.left}, Android #${r.right}`).join('; ')
  return `${text.title}. ${text.subtitle} ${what[m.kind]}. ${detail}. Data from ${chart.dataTime}.`
}

export function ChartBuilder({
  source = localSource,
  live = liveTemplates,
}: {
  source?: ChartDataSource
  live?: LiveTemplate[]
}) {
  const id = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const client = useMemo(() => createTdnClient(undefined, { ...PAGE_CLIENT, lastGood: snapshotLookup() }), [])
  const [scatterList, setScatterList] = useState<TemplateSummary[]>([])
  const [templateId, setTemplateId] = useState('')
  const [template, setTemplate] = useState<ChartTemplate | null>(null)
  const [config, setConfig] = useState<ChartConfig | null>(null)
  const [sourceText, setSourceText] = useState('')
  const [sprite, setSprite] = useState<HTMLImageElement | null>(null)
  const [size, setSize] = useState<ChartSize>(chartSizes[0] as ChartSize)
  const [scale, setScale] = useState(2)
  const [fontsReady, setFontsReady] = useState(false)
  const [status, setStatus] = useState('Loading the templates…')
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)
  // Live templates.
  const [rowCount, setRowCount] = useState<number | undefined>(undefined)
  const [pair, setPair] = useState<[string, string] | undefined>(undefined)
  const [place, setPlace] = useState<PlaceId | undefined>(undefined)
  /** The last finished load, with the request it answers. Only shown while that is still the request. */
  const [result, setResult] = useState<{
    key: string
    chart: LiveChart
    note: string
    icons: Map<string, Icon>
    /** This chart's answers, with when the proxy fetched each (x-tdn-fetched-at). */
    answers: Fetched[]
  } | null>(null)
  /** How many loads in a row have failed for the current request; the page keeps asking, and never shows an error. */
  const [failed, setFailed] = useState<{ key: string; n: number }>({ key: '', n: 0 })
  const [liveText, setLiveText] = useState<ChartText | null>(null)
  /** Each template's measured coverage, or why it is not shown, as its chart or preview loads. */
  const [coverage, setCoverage] = useState<Record<string, string>>({})
  const noteCoverage = useCallback(
    (templateId: string, note: string) =>
      setCoverage((c) => (c[templateId] === note ? c : { ...c, [templateId]: note })),
    [],
  )

  const liveTemplate = live.find((t) => t.id === templateId)
  const loadKey = liveTemplate ? `${templateId}|${rowCount ?? ''}|${pair?.join(',') ?? ''}|${place ?? ''}` : ''
  const current = result && result.key === loadKey ? result : null
  const chart = current?.chart ?? null
  const icons = current?.icons ?? noIcons
  const liveState: 'loading' | 'ready' = current ? 'ready' : 'loading'
  const waiting = failed.key === loadKey ? failed.n : 0
  const entries: Entry[] = useMemo(
    () => [
      ...live.map((t) => ({ id: t.id, kind: t.kind, name: t.name, about: t.about, field: t.field })),
      ...scatterList.map((t) => ({
        id: t.id,
        kind: 'scatter' as const,
        name: t.name,
        about: [t.sample, t.sourceShort, `data file, ${formatDate(t.date)}`].filter(Boolean).join(' · '),
        field: scatterNotes[t.id]?.field ?? 'data file',
        pending: scatterNotes[t.id]?.pending,
      })),
    ],
    [live, scatterList],
  )

  useEffect(() => {
    const done = () => setFontsReady(true)
    loadChartFonts().then(done, done)
    const wanted = new URLSearchParams(window.location.search).get('template')
    const pickFirst = (ids: string[]) =>
      setTemplateId((current) => current || ids.find((t) => t === wanted) || ids[0] || '')
    source.listTemplates().then(
      (list) => {
        setScatterList(list)
        setStatus('')
        pickFirst([...live.map((t) => t.id), ...list.map((t) => t.id)])
      },
      () => {
        setStatus('')
        pickFirst(live.map((t) => t.id))
      },
    )
  }, [source, live])

  // Scatter templates come from the data files.
  useEffect(() => {
    if (!templateId || live.some((t) => t.id === templateId)) return
    let cancelled = false
    source
      .loadTemplate(templateId)
      .then(async (loaded) => {
        const image = loaded.iconSprite ? await loadImage(loaded.iconSprite).catch(() => null) : null
        if (cancelled) return
        // Points are app icons only. Without the sprite there is nothing honest to draw.
        if (!image) {
          setStatus('The app icons for this template could not be loaded, so the chart is not shown.')
          return
        }
        setTemplate(loaded)
        setConfig(structuredClone(loaded.config))
        setSourceText(loaded.config.source_default ?? '')
        setSprite(image)
        setStatus('')
      })
      .catch(() => {
        if (!cancelled) setStatus('This template could not be loaded. Please try again later.')
      })
    return () => {
      cancelled = true
    }
  }, [templateId, source, live])

  // Live templates read the proxy on every page load. Old numbers are cleared first, so a chart is never shown
  // with data from another template. A template whose data cannot answer its question draws a fallback template
  // with a note; a failed request is asked again (soon, then once a minute) while the spinner shows, so the page
  // shows a chart or a loading state, never an error. The proxy answers with its kept copy when the source is down.
  useEffect(() => {
    if (!liveTemplate) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = (failures: number) => {
      const tracked = trackClient(client)
      loadWithFallback(liveTemplate, tracked.client, { rows: rowCount, apps: pair, place }, live)
        .then(async ({ chart: loaded, note }) => {
          const answers = tracked.answers()
          const iconMap = await iconsFor(loaded.model)
          if (cancelled) return
          setLiveText(structuredClone(loaded.text))
          setResult({ key: loadKey, chart: loaded, note, icons: iconMap, answers })
          if (rowCount === undefined && pair === undefined && place === undefined)
            noteCoverage(liveTemplate.id, note ? `${note} ${loaded.coverage}` : loaded.coverage)
        })
        .catch(() => {
          if (cancelled) return
          setFailed({ key: loadKey, n: failures + 1 })
          timer = setTimeout(() => run(failures + 1), retryDelay(failures) * 1000)
        })
    }
    run(0)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [liveTemplate, client, rowCount, pair, place, loadKey, noteCoverage, live])

  const problems = useMemo(() => {
    if (liveTemplate) return chart && liveText ? validateLive(chart, liveText) : []
    return config && template ? validate(config, template.rows, sourceText) : []
  }, [liveTemplate, chart, liveText, config, template, sourceText])

  const scatterReady = !liveTemplate && !!config && !!template && !!sprite && template.config.id === templateId
  const liveReady = !!liveTemplate && liveState === 'ready' && !!chart && !!liveText
  const ready = (scatterReady || liveReady) && problems.length === 0

  const paint = (ctx: Ctx, width: number, height: number, image: CanvasImageSource | null) => {
    if (liveTemplate && chart && liveText) {
      drawLive(ctx, chart, liveText, { width, height, icons })
    } else if (config && template) {
      drawChart(ctx, config, template.rows, { width, height, source: sourceText, sprite: image })
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    canvas.width = size.width
    canvas.height = size.height
    delete canvas.dataset.rendered
    if (!fontsReady || !ready) {
      // While live data is on its way the frame shows where the title, rule and footnote will be.
      if (liveTemplate && liveState === 'loading') drawPlaceholder(ctx, size.width, size.height)
      else ctx.clearRect(0, 0, size.width, size.height)
      return
    }
    paint(ctx, size.width, size.height, sprite)
    // For checks: how many verified icons the chart has, and how many of them are drawn (not the neutral tile).
    if (liveTemplate && chart) {
      const wanted = appsIn(chart.model).filter((a) => iconAllowed(a.iconUrl))
      canvas.dataset.iconsWanted = String(new Set(wanted.map((a) => a.appId)).size)
      canvas.dataset.iconsDrawn = String(new Set(wanted.filter((a) => icons.has(a.appId)).map((a) => a.appId)).size)
    } else {
      canvas.dataset.iconsWanted = canvas.dataset.iconsDrawn = sprite ? 'sprite' : '0'
    }
    canvas.dataset.rendered = `${templateId}:${size.width}x${size.height}`
    // paint reads the same state as the dependencies below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, config, template, sprite, size, fontsReady, sourceText, chart, liveText, icons, templateId])

  const rows = useMemo(() => (template && config ? filterRows(template.rows, config) : []), [template, config])
  const update = (change: Partial<ChartConfig>) =>
    setConfig((current) => (current ? { ...current, ...change } : current))
  const updateText = (change: Partial<ChartText>) =>
    setLiveText((current) => (current ? { ...current, ...change } : current))

  const setField = (axis: 'x' | 'y', field: string) => {
    if (!config || !template) return
    const original = template.config
    const next = { ...config, [axis]: axisFor(field, original, rows) }
    const unchanged = next.x.field === original.x.field && next.y.field === original.y.field
    next.reference_lines = unchanged ? structuredClone(original.reference_lines) : []
    setConfig(next)
  }

  const setLabel = (index: number, change: Partial<LabelConfig>) => {
    if (!config) return
    const labels = (config.labels ?? []).map((label, i) => {
      if (i !== index) return label
      const next = { ...label, ...change }
      // Picking what a label shows rewrites its text; typing the text by hand leaves the picks.
      return 'text' in change ? { ...next, show: undefined } : { ...next, text: composeLabel(next, config) }
    })
    setConfig({ ...config, labels })
  }

  const toggleShown = (index: number, field: string) => {
    const label = config?.labels?.[index]
    if (!label) return
    const shown = label.show ?? []
    const order = Object.keys(config.label_fields ?? {})
    const show = shown.includes(field)
      ? shown.filter((f) => f !== field)
      : [...shown, field].sort((a, b) => order.indexOf(a) - order.indexOf(b))
    setLabel(index, { show })
  }

  const setFootnote = (index: number, value: string) => {
    if (liveTemplate) {
      setLiveText((current) =>
        current
          ? {
              ...current,
              footnote: current.footnote.map((line, i) => (i === index ? value : line)) as ChartText['footnote'],
            }
          : current,
      )
      return
    }
    if (!config) return
    setConfig({ ...config, footnote: config.footnote.map((line, i) => (i === index ? value : line)) })
  }

  const pick = (next: string) => {
    setStatus('')
    setDownloadNote('')
    setRowCount(undefined)
    setPair(undefined)
    setPlace(undefined)
    setTemplateId(next)
    // The address names the template, so a chart can be shared or reloaded.
    const url = new URL(window.location.href)
    url.searchParams.set('template', next)
    window.history.replaceState(window.history.state, '', url)
  }

  /** Brings the chart into view after a template is chosen from the gallery below it. */
  const showChart = () => {
    // After the choice is drawn: scrolling during the click is undone when the page re-lays out under it.
    requestAnimationFrame(() => {
      const box = previewRef.current
      if (!box || box.getBoundingClientRect().top >= 0) return
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      box.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
    })
  }

  const reset = () => {
    if (liveTemplate) {
      if (chart) setLiveText(structuredClone(chart.text))
      return
    }
    if (!template) return
    setConfig(structuredClone(template.config))
    setSourceText(template.config.source_default ?? '')
  }

  const render = (width: number, height: number, factor: number) => {
    const canvas = document.createElement('canvas')
    canvas.width = width * factor
    canvas.height = height * factor
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(factor, factor)
    paint(ctx, width, height, sprite)
    return canvas
  }

  const title = liveTemplate ? (liveText?.title ?? '') : (config?.title ?? '')
  const [downloadNote, setDownloadNote] = useState('')
  const downloadPng = () => {
    if (!ready) return
    const canvas = render(size.width, size.height, scale)
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return
      save(blob, fileName(title, size, scale, 'png'))
      setDownloadNote(
        blob.size > X_MAX_BYTES
          ? 'Over 5 MB, the limit for photos on X. Try 1x.'
          : `PNG saved, ${canvas.width} × ${canvas.height}, ${(blob.size / 1024 / 1024).toFixed(1)} MB.`,
      )
    }, 'image/png')
  }

  const downloadSvg = async () => {
    if (!ready) return
    const measure = document.createElement('canvas').getContext('2d')
    if (!measure) return
    // Each image crop becomes one embedded PNG: keyed by the image and the crop, so different icons never share one.
    const crops = new Map<CanvasImageSource, Map<string, string>>()
    const svg = new SvgContext(size.width, size.height, measure, (image, sx, sy, sw, sh) => {
      const forImage = crops.get(image) ?? new Map<string, string>()
      crops.set(image, forImage)
      const key = `${sx},${sy},${sw},${sh}`
      let url = forImage.get(key)
      if (!url) {
        const cell = document.createElement('canvas')
        cell.width = ICON_CELL
        cell.height = ICON_CELL
        cell.getContext('2d')?.drawImage(image, sx, sy, sw, sh, 0, 0, ICON_CELL, ICON_CELL)
        url = cell.toDataURL('image/png')
        forImage.set(key, url)
      }
      return url
    })
    paint(asCtx(svg), size.width, size.height, sprite)
    const fonts: SvgFont[] = await Promise.all(
      CHART_FONT_FILES.map(async ({ family, weight, url }) => ({
        family,
        weight,
        url: await readAsDataUrl(await (await fetch(url)).blob()),
      })),
    )
    save(new Blob([svg.toString(fonts)], { type: 'image/svg+xml' }), fileName(title, size, 1, 'svg'))
    setDownloadNote(`SVG saved, ${size.width} × ${size.height}.`)
  }

  const plottable = config ? Object.keys(config.metrics).filter((f) => !f.includes('DO_NOT_PLOT')) : []
  const fieldItems = plottable.map((f) => ({ value: f, label: humanise(f) }))
  const names = useMemo(
    () => (config ? [...new Set(rows.map((r) => nameOf(r, config)))].sort((a, b) => a.localeCompare(b)) : []),
    [rows, config],
  )
  const nameItems = names.map((name) => ({ value: name, label: name }))
  const chartLabel = liveTemplate
    ? chart && liveText && liveReady
      ? describeLive(chart, liveText)
      : 'Chart preview, no data shown yet'
    : config
      ? `${config.title}. ${config.subtitle ?? ''} Scatter chart of ${config.y.label.toLowerCase()} against ${config.x.label.toLowerCase()}.`
      : 'Chart preview'
  const labelFields = Object.entries(config?.label_fields ?? {})
  const sizeNames: Record<ChartSize['id'], string> = {
    original: 'Default',
    wide: '16:9',
    square: '1:1',
    portrait: '4:5',
  }
  const dataLine = liveTemplate
    ? liveReady && chart
      ? fetchedLine(current?.answers ?? [], chart.dataTime)
      : ''
    : scatterReady && config?.template?.date
      ? `Data file from ${formatDate(config.template.date)}, not live`
      : ''
  const statusText = liveTemplate
    ? liveState === 'loading'
      ? waiting
        ? 'Waiting for live data. Asking again…'
        : 'Loading live data…'
      : [current?.note, downloadNote].filter(Boolean).join(' ')
    : template && template.config.id !== templateId && !status
      ? 'Loading the template…'
      : status || downloadNote
  const keptNote = liveTemplate ? keptCopyNote(current?.answers ?? []) : ''
  const footnote = liveTemplate ? (liveText?.footnote ?? []) : (config?.footnote ?? [])
  const choices = (chart?.choices ?? []).map((app) => ({ value: app.appId, label: app.name }))
  const pairNow: [string, string] | undefined =
    chart?.model.kind === 'head-to-head' ? [chart.model.apps[0].appId, chart.model.apps[1].appId] : undefined

  return (
    <CSPProvider disableStyleElements>
      <PopupLayer.Provider value={layer}>
        <div ref={setLayer} {...stylex.props(styles.layout)}>
          <div {...stylex.props(styles.top)}>
            <div ref={previewRef} {...stylex.props(styles.preview)}>
              <div {...stylex.props(styles.stage)}>
                <canvas
                  ref={canvasRef}
                  width={size.width}
                  height={size.height}
                  role="img"
                  aria-label={chartLabel}
                  aria-busy={liveTemplate ? liveState === 'loading' : undefined}
                  {...stylex.props(styles.canvas)}
                />
                {liveTemplate && liveState === 'loading' ? (
                  <div aria-hidden="true" {...stylex.props(styles.overlay)}>
                    <span {...stylex.props(styles.spinner)} />
                  </div>
                ) : null}
              </div>
              <div {...stylex.props(styles.meta)}>
                {dataLine ? (
                  <p {...stylex.props(styles.dataTime)} data-testid="data-time">
                    {dataLine}
                  </p>
                ) : null}
                {liveReady && keptNote ? (
                  <p data-testid="kept-copy" {...stylex.props(styles.kept)}>
                    {keptNote}
                  </p>
                ) : null}
                <p role="status" {...stylex.props(styles.status)}>
                  {statusText}
                </p>
              </div>
              {problems.length ? (
                <div role="alert" {...stylex.props(styles.problems)}>
                  <p {...stylex.props(styles.problemsTitle)}>Downloads are off until this is fixed:</p>
                  <ul {...stylex.props(styles.problemList)}>
                    {problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div {...stylex.props(styles.actions)}>
                <button
                  type="button"
                  onClick={downloadPng}
                  disabled={!ready}
                  {...stylex.props(styles.button, styles.download, styles.primary, ui.focusRing)}
                >
                  Download PNG
                </button>
                <button
                  type="button"
                  onClick={() => void downloadSvg()}
                  disabled={!ready}
                  {...stylex.props(styles.button, styles.download, ui.focusRing)}
                >
                  Download SVG
                </button>
                <button
                  type="button"
                  onClick={reset}
                  disabled={liveTemplate ? !chart : !template}
                  {...stylex.props(styles.button, styles.quiet, ui.focusRing)}
                >
                  Reset template
                </button>
              </div>
            </div>

            <form
              {...stylex.props(styles.form)}
              onSubmit={(event) => event.preventDefault()}
              aria-label="Chart settings"
            >
              <Section title="Text" id={`${id}-s-text`}>
                <Field label="Title" htmlFor={`${id}-title`}>
                  <input
                    id={`${id}-title`}
                    type="text"
                    maxLength={90}
                    value={title}
                    onChange={(e) =>
                      liveTemplate ? updateText({ title: e.target.value }) : update({ title: e.target.value })
                    }
                    {...stylex.props(styles.control, ui.focusRing)}
                  />
                </Field>
                <Field label="Subtitle" htmlFor={`${id}-subtitle`}>
                  <input
                    id={`${id}-subtitle`}
                    type="text"
                    maxLength={120}
                    value={liveTemplate ? (liveText?.subtitle ?? '') : (config?.subtitle ?? '')}
                    onChange={(e) =>
                      liveTemplate ? updateText({ subtitle: e.target.value }) : update({ subtitle: e.target.value })
                    }
                    {...stylex.props(styles.control, ui.focusRing)}
                  />
                </Field>
              </Section>

              {liveTemplate && (liveTemplate.rowChoices || liveTemplate.pickApps || liveTemplate.pickPlace) ? (
                <Section title="Data" id={`${id}-s-data`}>
                  {liveTemplate.rowChoices ? (
                    <Segmented
                      label="Rows"
                      value={String(rowCount ?? liveTemplate.rowChoices.at(-1))}
                      options={liveTemplate.rowChoices.map((n) => ({ value: String(n), label: String(n) }))}
                      onChange={(value) => setRowCount(Number(value))}
                    />
                  ) : null}
                  {liveTemplate.pickApps && choices.length && pairNow
                    ? (['First app', 'Second app'] as const).map((label, side) => (
                        <Picker
                          key={label}
                          label={label}
                          value={(pair ?? pairNow)[side] ?? ''}
                          items={choices}
                          onChange={(value) => {
                            const next: [string, string] = [...(pair ?? pairNow)]
                            next[side] = value
                            setPair(next)
                          }}
                        />
                      ))
                    : null}
                  {liveTemplate.pickPlace ? (
                    <Segmented
                      label="Store and country"
                      value={place ?? 'apple-us'}
                      options={Object.entries(PLACES).map(([value, p]) => ({ value, label: p.label }))}
                      onChange={(value) => isPlace(value) && setPlace(value)}
                    />
                  ) : null}
                </Section>
              ) : null}

              {liveTemplate ? null : (
                <>
                  <Section title="Axes" id={`${id}-s-axes`}>
                    {(['x', 'y'] as const).map((axis) => (
                      <Picker
                        key={axis}
                        label={axis === 'x' ? 'Horizontal' : 'Vertical'}
                        value={config?.[axis].field ?? ''}
                        items={fieldItems}
                        onChange={(value) => setField(axis, value)}
                      />
                    ))}
                  </Section>

                  <Section title="Point labels" id={`${id}-s-labels`}>
                    {(config?.labels ?? []).map((label, index) => {
                      const target = config ? labelRows(rows, label).map((r) => nameOf(r, config)) : []
                      const custom = !label.show
                      return (
                        <div key={index} {...stylex.props(styles.labelBox)}>
                          {label.match ? (
                            <Picker
                              label={`Point ${index + 1}`}
                              value={target[0] ?? ''}
                              items={nameItems}
                              onChange={(value) =>
                                config && setLabel(index, { match: { [config.name_column ?? 'app']: value } })
                              }
                            />
                          ) : (
                            <div {...stylex.props(styles.field)}>
                              <span {...stylex.props(styles.label)}>Point {index + 1}</span>
                              <span {...stylex.props(styles.fixed)}>
                                {rankedBy(label, config?.label_fields)}: {target.map(shortName).join(', ')}
                              </span>
                            </div>
                          )}
                          <div
                            role="group"
                            aria-label={`What point ${index + 1} shows`}
                            {...stylex.props(styles.chips)}
                          >
                            <Chip
                              pressed={!custom && !label.hide_name}
                              onClick={() => setLabel(index, { hide_name: !label.hide_name, show: label.show ?? [] })}
                            >
                              Name
                            </Chip>
                            {labelFields.map(([field, meta]) => (
                              <Chip
                                key={field}
                                pressed={!custom && (label.show ?? []).includes(field)}
                                onClick={() => toggleShown(index, field)}
                              >
                                {meta.name}
                              </Chip>
                            ))}
                          </div>
                          {custom ? <p {...stylex.props(styles.note)}>Custom text, set under Advanced.</p> : null}
                        </div>
                      )
                    })}
                  </Section>
                </>
              )}

              <Section title="Export" id={`${id}-s-export`}>
                <Segmented
                  label="Size"
                  value={size.id}
                  options={chartSizes.map((option) => ({ value: option.id, label: sizeNames[option.id] }))}
                  onChange={(value) => setSize(chartSizes.find((option) => option.id === value) ?? size)}
                />
                <Segmented
                  label="PNG resolution"
                  value={String(scale)}
                  options={[
                    { value: '2', label: '2x' },
                    { value: '1', label: '1x' },
                  ]}
                  onChange={(value) => setScale(Number(value))}
                />
                <p {...stylex.props(styles.note)}>
                  PNG {size.width * scale} × {size.height * scale} px · SVG {size.width} × {size.height}
                </p>
              </Section>

              <details {...stylex.props(styles.advanced)}>
                <summary {...stylex.props(styles.summary, ui.focusRing)}>
                  Advanced
                  <Chevron />
                </summary>
                <div {...stylex.props(styles.advancedBody)}>
                  {liveTemplate
                    ? null
                    : (['x', 'y'] as const).map((axis) => (
                        <Field
                          key={axis}
                          label={axis === 'x' ? 'Horizontal axis title' : 'Vertical axis title'}
                          htmlFor={`${id}-${axis}-label`}
                        >
                          <input
                            id={`${id}-${axis}-label`}
                            type="text"
                            maxLength={70}
                            value={config?.[axis].label ?? ''}
                            onChange={(e) => config && update({ [axis]: { ...config[axis], label: e.target.value } })}
                            {...stylex.props(styles.control, ui.focusRing)}
                          />
                        </Field>
                      ))}
                  {liveTemplate
                    ? null
                    : (config?.labels ?? []).map((label, index) => (
                        <Field key={index} label={`Point ${index + 1} text`} htmlFor={`${id}-label-${index}`}>
                          <textarea
                            id={`${id}-label-${index}`}
                            rows={3}
                            maxLength={160}
                            value={label.text}
                            onChange={(e) => setLabel(index, { text: e.target.value })}
                            {...stylex.props(styles.control, styles.textarea, ui.focusRing)}
                          />
                        </Field>
                      ))}
                  <Field label="Source" htmlFor={`${id}-source`}>
                    <input
                      id={`${id}-source`}
                      type="text"
                      maxLength={90}
                      value={liveTemplate ? (liveText?.source ?? '') : sourceText}
                      onChange={(e) =>
                        liveTemplate ? updateText({ source: e.target.value }) : setSourceText(e.target.value)
                      }
                      {...stylex.props(styles.control, ui.focusRing)}
                    />
                  </Field>
                  {footnote.map((line, index) => (
                    <Field key={index} label={`Footnote line ${index + 1}`} htmlFor={`${id}-foot-${index}`}>
                      <textarea
                        id={`${id}-foot-${index}`}
                        rows={3}
                        maxLength={180}
                        value={line}
                        onChange={(e) => setFootnote(index, e.target.value)}
                        {...stylex.props(styles.control, styles.textarea, ui.focusRing)}
                      />
                    </Field>
                  ))}
                </div>
              </details>
            </form>
          </div>

          <Gallery
            id={id}
            entries={entries}
            selected={templateId}
            onPick={pick}
            onShow={showChart}
            live={live}
            client={client}
            source={source}
            fontsReady={fontsReady}
            waitFor={!ready && !problems.length}
            onCoverage={noteCoverage}
          />
          <AboutData id={id} client={client} entries={entries} coverage={coverage} />
        </div>
      </PopupLayer.Provider>
    </CSPProvider>
  )
}

/** Thumbnails are drawn at this size (canvas pixels) and shown at up to half of it. */
const THUMB = { width: 720, height: 556 }

/**
 * The templates as a gallery under the chart: a filter by kind, then a card per template with a small drawing of
 * that chart made by the same renderer from the same data. The cards are one radio group, so arrow keys move the
 * choice; a click or Enter also brings the chart into view.
 */
function Gallery({
  id,
  entries,
  selected,
  onPick,
  onShow,
  live,
  client,
  source,
  fontsReady,
  waitFor,
  onCoverage,
}: {
  id: string
  entries: Entry[]
  selected: string
  onPick: (id: string) => void
  onShow: () => void
  live: LiveTemplate[]
  client: ReturnType<typeof createTdnClient>
  source: ChartDataSource
  fontsReady: boolean
  /** True while the main chart is still loading: the thumbnails wait, so the chart is drawn first. */
  waitFor: boolean
  onCoverage: (id: string, note: string) => void
}) {
  const ready = entries.filter((e) => !e.pending)
  const held = entries.filter((e) => e.pending)
  const pointer = useRef(false)
  const headingId = `${id}-gallery`
  const groups = [
    ...galleryGroups.map((g) => ({ ...g, items: ready.filter((e) => g.kinds.includes(e.kind)) })),
    { id: 'pending', title: 'Pending verification', kinds: [], items: held },
  ].filter((g) => g.items.length)

  const card = (t: Entry) => {
    const on = t.id === selected
    return (
      <label
        key={t.id}
        onPointerDown={() => {
          pointer.current = true
        }}
        {...stylex.props(styles.card, on && styles.cardOn)}
      >
        <input
          type="radio"
          name={`${id}-template`}
          value={t.id}
          checked={on}
          onChange={() => {
            onPick(t.id)
            if (pointer.current) onShow()
            pointer.current = false
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (!on) onPick(t.id)
              onShow()
            }
          }}
          aria-describedby={`${id}-about-${t.id}`}
          {...stylex.props(styles.cardInput)}
        />
        <span {...stylex.props(styles.thumbBox, on && styles.thumbOn)}>
          <Thumb
            entry={t}
            live={live}
            client={client}
            source={source}
            enabled={fontsReady && !waitFor}
            onCoverage={onCoverage}
          />
          {on ? (
            <span {...stylex.props(styles.badge)}>
              <Check />
              Selected
            </span>
          ) : null}
        </span>
        <span {...stylex.props(styles.cardKind)}>
          <KindGlyph kind={t.kind} />
          {kindNames[t.kind]}
        </span>
        <span {...stylex.props(styles.cardName)}>{t.name}</span>
        <span id={`${id}-about-${t.id}`} {...stylex.props(styles.cardAbout)}>
          {t.pending ? `Pending verification · ${t.about}` : t.about}
        </span>
      </label>
    )
  }

  return (
    <section aria-labelledby={headingId} data-testid="gallery" {...stylex.props(styles.gallery)}>
      <div {...stylex.props(styles.galleryHead)}>
        <h2 id={headingId} {...stylex.props(styles.galleryTitle)}>
          Templates
        </h2>
        <p data-testid="gallery-count" {...stylex.props(styles.galleryCount)}>
          {entries.length} templates
        </p>
      </div>
      <div role="radiogroup" aria-labelledby={headingId} {...stylex.props(styles.groups)}>
        {groups.map((g) => (
          <div
            key={g.id}
            role="group"
            aria-labelledby={`${id}-group-${g.id}`}
            data-testid={`group-${g.id}`}
            {...stylex.props(styles.group)}
          >
            <h3 id={`${id}-group-${g.id}`} {...stylex.props(styles.groupTitle)}>
              {g.title} <span {...stylex.props(styles.groupCount)}>{g.items.length}</span>
            </h3>
            {g.id === 'pending' ? (
              <p {...stylex.props(styles.galleryNote)}>
                These use fields not yet checked against the live API, so they are not in the default gallery.
              </p>
            ) : null}
            <div {...stylex.props(styles.cards)}>{g.items.map(card)}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

/** A small drawing of one template, from the same renderer and data as the chart (requests are shared). */
function Thumb({
  entry,
  live,
  client,
  source,
  enabled,
  onCoverage,
}: {
  entry: Entry
  live: LiveTemplate[]
  client: ReturnType<typeof createTdnClient>
  source: ChartDataSource
  enabled: boolean
  onCoverage: (id: string, note: string) => void
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<'waiting' | 'ready'>('waiting')
  /** Failed loads so far: a thumbnail asks again like the chart does, and is never left with an error. */
  const [failures, setFailures] = useState(0)
  const [seen, setSeen] = useState(false)

  // Until its chart is drawn, a thumbnail shows the chart's outline: still, so a page of cards does not spin.
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (ctx && state !== 'ready') drawPlaceholder(ctx, THUMB.width, THUMB.height)
  }, [state])

  // Each thumbnail loads when its card comes near the screen, so a card that is never looked at costs nothing.
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || seen) return
    const observer = new IntersectionObserver(
      (list) => {
        if (list.some((e) => e.isIntersecting)) setSeen(true)
      },
      { rootMargin: '120px' },
    )
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [seen])

  useEffect(() => {
    if (!enabled || !seen || state !== 'waiting') return
    let cancelled = false
    let retry: ReturnType<typeof setTimeout> | undefined
    const drawing: Promise<(ctx: Ctx) => void> = (async () => {
      const liveTemplate = live.find((l) => l.id === entry.id)
      if (liveTemplate) {
        const { chart, note } = await loadWithFallback(liveTemplate, client, {}, live)
        const icons = await iconsFor(chart.model)
        onCoverage(entry.id, note ? `${note} ${chart.coverage}` : chart.coverage)
        return (ctx: Ctx) => drawLive(ctx, chart, chart.text, { ...THUMB, icons })
      }
      const t = await source.loadTemplate(entry.id)
      const sprite = t.iconSprite ? await loadImage(t.iconSprite).catch(() => null) : null
      if (!sprite) throw new Error('no icons')
      const plotted = filterRows(t.rows, t.config).length
      onCoverage(entry.id, `${plotted} of ${t.rows.length} rows in the data file plotted; a data file, not live.`)
      return (ctx: Ctx) => drawChart(ctx, t.config, t.rows, { ...THUMB, source: t.config.source_default ?? '', sprite })
    })()
    drawing.then(
      (paint) => {
        const ctx = ref.current?.getContext('2d')
        if (cancelled || !ctx) return
        try {
          paint(ctx)
          setState('ready')
        } catch {
          retry = setTimeout(() => setFailures((n) => n + 1), retryDelay(failures) * 1000)
        }
      },
      () => {
        if (cancelled) return
        retry = setTimeout(() => setFailures((n) => n + 1), retryDelay(failures) * 1000)
      },
    )
    return () => {
      cancelled = true
      clearTimeout(retry)
    }
  }, [enabled, seen, state, failures, entry.id, live, client, source, onCoverage])

  return (
    <canvas
      ref={ref}
      width={THUMB.width}
      height={THUMB.height}
      aria-hidden="true"
      data-thumb={state}
      {...stylex.props(styles.thumb)}
    />
  )
}

/** A small drawing of each chart kind, for the template list. */
function KindGlyph({ kind }: { kind: Kind | 'scatter' }) {
  const paths: Record<Kind | 'scatter', ReactNode> = {
    headline: (
      <>
        <path d="M6 5h3v14" />
        <path d="M14 15h3M14 19h6" />
      </>
    ),
    leaderboard: <path d="M4 6h16M4 12h11M4 18h7" />,
    'head-to-head': <path d="M12 4v16M11 8H4M11 16H7M13 8h5M13 16h7" />,
    bump: <path d="M3 17 9 7l6 8 6-10M3 7l6 6 6-4 6 8" />,
    dumbbell: (
      <>
        <path d="M6 8h10M9 16h9" />
        <circle cx="6" cy="8" r="2" />
        <circle cx="16" cy="8" r="2" />
        <circle cx="9" cy="16" r="2" />
        <circle cx="18" cy="16" r="2" />
      </>
    ),
    scatter: (
      <>
        <circle cx="6" cy="16" r="1.5" />
        <circle cx="10" cy="11" r="1.5" />
        <circle cx="15" cy="13" r="1.5" />
        <circle cx="18" cy="6" r="1.5" />
        <path d="M3 3v18h18" />
      </>
    ),
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" {...stylex.props(styles.glyph)}>
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {paths[kind]}
      </g>
    </svg>
  )
}

function Section({ title, id, children }: { title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} {...stylex.props(styles.section)}>
      <h2 id={id} {...stylex.props(styles.sectionTitle)}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div {...stylex.props(styles.field)}>
      <label htmlFor={htmlFor} {...stylex.props(styles.label)}>
        {label}
      </label>
      {children}
    </div>
  )
}

/** A select whose list opens below the field instead of over it. */
function Picker({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: string
  items: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <Select.Root items={items} value={value} onValueChange={(next) => next !== null && onChange(String(next))}>
      <div {...stylex.props(styles.field)}>
        <Select.Label {...stylex.props(styles.label)}>{label}</Select.Label>
        <Select.Trigger {...stylex.props(styles.control, styles.trigger, ui.focusRing)}>
          <Select.Value {...stylex.props(styles.value)} />
          <Select.Icon {...stylex.props(styles.icon)}>
            <Chevron />
          </Select.Icon>
        </Select.Trigger>
      </div>
      <Select.Portal container={useContext(PopupLayer)}>
        <Select.Positioner alignItemWithTrigger={false} sideOffset={8} {...stylex.props(styles.positioner)}>
          <Select.Popup {...stylex.props(styles.popup)}>
            <Select.List {...stylex.props(styles.list)}>
              {items.map((item) => (
                <Select.Item key={item.value} value={item.value} {...stylex.props(styles.item)}>
                  <Select.ItemText>{item.label}</Select.ItemText>
                  <Select.ItemIndicator {...stylex.props(styles.check)}>
                    <Check />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}

/** A row of options where one is picked, like the segmented controls on iOS. */
function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  const labelId = useId()
  return (
    <div {...stylex.props(styles.field)}>
      <span id={labelId} {...stylex.props(styles.label)}>
        {label}
      </span>
      <RadioGroup
        aria-labelledby={labelId}
        value={value}
        onValueChange={(next) => onChange(String(next))}
        {...stylex.props(styles.segments)}
      >
        {options.map((option) => (
          <Radio.Root
            key={option.value}
            value={option.value}
            {...stylex.props(styles.segment, option.value === value && styles.segmentOn, ui.focusRing)}
          >
            {option.label}
          </Radio.Root>
        ))}
      </RadioGroup>
    </div>
  )
}

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      {...stylex.props(styles.chip, styles.filterChip, pressed && styles.chipOn, ui.focusRing)}
    >
      {pressed ? <Check /> : null}
      {children}
    </button>
  )
}

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.chevron)}>
      <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" {...stylex.props(styles.checkIcon)}>
      <path
        d="m3.5 8.5 3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const CONTROL = { default: '40px', [breakpoints.phone]: '48px' }

const spin = stylex.keyframes({ to: { transform: 'rotate(360deg)' } })

const styles = stylex.create({
  layout: { display: 'grid', gap: { default: '64px', [breakpoints.tablet]: '32px' } },
  top: {
    display: { default: 'grid', [breakpoints.tablet]: 'contents' },
    gridTemplateColumns: 'minmax(0, 1fr) 360px',
    gap: '40px',
    alignItems: 'start',
  },
  preview: { position: { default: 'sticky', [breakpoints.tablet]: 'static' }, top: '24px', scrollMarginTop: '24px' },
  stage: { position: 'relative' },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '999px',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderColor: 'rgb(242 242 242 / 0.25)',
    borderTopColor: '#f2f2f2',
    animationName: spin,
    animationDuration: { default: '0.9s', '@media (prefers-reduced-motion: reduce)': '2.4s' },
    animationIterationCount: 'infinite',
    animationTimingFunction: 'linear',
  },
  meta: { display: 'grid', marginTop: '8px' },
  dataTime: { minHeight: '24px', fontSize: text.meta, lineHeight: '24px', color: colors.text },
  glyph: { display: 'block', flexShrink: 0, color: colors.text },
  canvas: {
    display: 'block',
    width: '100%',
    height: 'auto',
    borderRadius: '8px',
    backgroundColor: '#151515',
    boxShadow: `0 0 0 1px ${colors.line}`,
  },
  kept: {
    marginTop: '4px',
    paddingBlock: '4px',
    paddingInline: '8px',
    borderRadius: '4px',
    backgroundColor: 'rgba(244, 162, 97, 0.14)',
    color: colors.text,
    fontSize: text.meta,
    lineHeight: 1.5,
  },
  status: {
    minHeight: '24px',
    color: colors.muted,
    fontSize: text.meta,
    lineHeight: '24px',
  },
  problems: {
    marginBottom: '16px',
    padding: '16px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.line,
    backgroundColor: colors.soft,
    fontSize: text.meta,
    lineHeight: 1.5,
  },
  problemsTitle: { fontWeight: weights.medium },
  problemList: { marginTop: '8px', paddingLeft: '16px', color: colors.muted },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  button: {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: CONTROL,
    paddingInline: '16px',
    borderRadius: '999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.text,
    color: colors.text,
    backgroundColor: { default: 'transparent', ':hover': colors.soft },
    font: 'inherit',
    fontSize: text.meta,
    fontWeight: weights.medium,
    cursor: { default: 'pointer', ':disabled': 'not-allowed' },
    opacity: { default: 1, ':disabled': 0.5 },
    transitionProperty: 'background-color, color',
    transitionDuration: '0.15s',
  },
  download: {
    flexGrow: { default: 0, [breakpoints.phone]: 1 },
    flexBasis: { default: 'auto', [breakpoints.phone]: 0 },
  },
  primary: { color: colors.bg, backgroundColor: { default: colors.text, ':hover': colors.muted } },
  quiet: {
    borderColor: 'transparent',
    color: colors.muted,
    marginLeft: { default: 'auto', [breakpoints.phone]: 0 },
    width: { default: 'auto', [breakpoints.phone]: '100%' },
  },
  form: { display: 'grid', minWidth: 0, order: { default: 0, [breakpoints.tablet]: 3 } },
  section: {
    display: 'grid',
    gap: '16px',
    paddingBlock: '24px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: { default: colors.line, ':first-child': 'transparent' },
    paddingTop: { default: '24px', ':first-child': 0 },
    minWidth: 0,
  },
  sectionTitle: { fontSize: text.body, fontWeight: weights.medium, lineHeight: 1.5 },
  labelBox: { display: 'grid', gap: '8px', paddingBottom: '8px' },
  field: { display: 'grid', gap: '8px', minWidth: 0 },
  label: { fontSize: text.meta, color: colors.muted, lineHeight: 1.5 },
  fixed: {
    display: 'flex',
    alignItems: 'center',
    minHeight: CONTROL,
    paddingInline: '16px',
    borderRadius: '8px',
    backgroundColor: colors.soft,
    fontSize: text.body,
    lineHeight: 1.5,
  },
  note: { fontSize: text.meta, color: colors.muted, lineHeight: 1.5 },
  control: {
    display: 'block',
    width: '100%',
    height: CONTROL,
    paddingBlock: 0,
    paddingInline: '16px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: colors.line, ':hover': colors.diagramEdge },
    borderRadius: '8px',
    backgroundColor: colors.bg,
    color: colors.text,
    font: 'inherit',
    fontSize: text.body,
    lineHeight: 1.5,
    textAlign: 'left',
  },
  textarea: { height: 'auto', minHeight: '96px', paddingBlock: '8px', resize: 'none', fieldSizing: 'content' },
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    cursor: 'pointer',
  },
  value: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
  icon: { display: 'flex', flexShrink: 0, color: colors.muted },
  chevron: { display: 'block' },
  positioner: { zIndex: 10, outline: 'none' },
  popup: {
    minWidth: 'var(--anchor-width)',
    maxWidth: 'var(--available-width)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.line,
    borderRadius: '8px',
    backgroundColor: colors.bg,
    color: colors.text,
    boxShadow: `0 8px 24px ${colors.stageShadow}`,
    outline: 'none',
    overflow: 'hidden',
  },
  list: {
    maxHeight: 'min(320px, var(--available-height))',
    overflowY: 'auto',
    paddingBlock: '8px',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    minHeight: CONTROL,
    paddingInline: '16px',
    fontSize: text.body,
    lineHeight: 1.5,
    cursor: 'pointer',
    outline: 'none',
    backgroundColor: { default: 'transparent', ':hover': colors.soft, ':focus-visible': colors.soft },
  },
  check: { display: 'flex', flexShrink: 0 },
  checkIcon: { display: 'block', flexShrink: 0 },
  segments: {
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: '1fr',
    gap: '4px',
    padding: '4px',
    borderRadius: '8px',
    backgroundColor: colors.soft,
  },
  segment: {
    appearance: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: { default: '32px', [breakpoints.phone]: '40px' },
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderRadius: '4px',
    backgroundColor: 'transparent',
    color: colors.muted,
    font: 'inherit',
    fontSize: text.meta,
    fontWeight: weights.medium,
    cursor: 'pointer',
  },
  segmentOn: { backgroundColor: colors.bg, borderColor: colors.line, color: colors.text },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  chip: {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    height: { default: '32px', [breakpoints.phone]: '40px' },
    paddingInline: '12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: colors.diagramEdge, ':hover': colors.muted },
    borderRadius: '999px',
    backgroundColor: 'transparent',
    color: colors.muted,
    font: 'inherit',
    fontSize: text.meta,
    lineHeight: 1,
    cursor: 'pointer',
  },
  filterChip: { flexShrink: 0, whiteSpace: 'nowrap' },
  chipOn: { borderColor: colors.text, backgroundColor: colors.text, color: colors.bg },
  advanced: { borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: colors.line },
  summary: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '56px',
    listStyle: 'none',
    cursor: 'pointer',
    fontSize: text.body,
    fontWeight: weights.medium,
  },
  advancedBody: { display: 'grid', gap: '16px', paddingBottom: '24px' },
  gallery: {
    order: { default: 0, [breakpoints.tablet]: 2 },
    minWidth: 0,
    paddingTop: { default: '32px', [breakpoints.tablet]: '24px' },
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
  },
  galleryHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '16px' },
  galleryTitle: { fontSize: text.body, fontWeight: weights.medium, lineHeight: 1.5 },
  groups: { display: 'grid', gap: '32px', marginTop: '16px' },
  group: { display: 'grid', gap: '16px', minWidth: 0 },
  groupTitle: { fontSize: text.meta, fontWeight: weights.medium, lineHeight: 1.5, color: colors.text },
  groupCount: { color: colors.muted, fontWeight: weights.regular },
  galleryCount: { fontSize: text.meta, color: colors.muted, lineHeight: 1.5 },
  galleryNote: { marginTop: '-8px', fontSize: text.meta, color: colors.muted, lineHeight: 1.5 },
  cards: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(auto-fill, minmax(240px, 1fr))',
      [breakpoints.tablet]: 'repeat(2, minmax(0, 1fr))',
      [breakpoints.phone]: 'none',
    },
    gridAutoFlow: { default: 'row', [breakpoints.phone]: 'column' },
    gridAutoColumns: { default: 'auto', [breakpoints.phone]: '76%' },
    overflowX: { default: 'visible', [breakpoints.phone]: 'auto' },
    scrollSnapType: { default: 'none', [breakpoints.phone]: 'x mandatory' },
    columnGap: { default: '24px', [breakpoints.phone]: '16px' },
    rowGap: '32px',
    marginInline: { default: 0, [breakpoints.phone]: '-4px' },
    paddingInline: { default: 0, [breakpoints.phone]: '4px' },
    paddingTop: { default: 0, [breakpoints.phone]: '4px' },
    paddingBottom: { default: 0, [breakpoints.phone]: '12px' },
  },
  card: {
    position: 'relative',
    display: 'grid',
    alignContent: 'start',
    gap: '4px',
    minWidth: 0,
    borderRadius: '8px',
    cursor: 'pointer',
    scrollSnapAlign: 'start',
    outline: { default: null, ':has(:focus-visible)': `2px solid ${colors.accent}` },
    outlineOffset: { default: null, ':has(:focus-visible)': '4px' },
  },
  cardOn: {},
  cardInput: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    width: '100%',
    height: '100%',
    margin: 0,
    opacity: 0,
    cursor: 'pointer',
  },
  thumbBox: {
    position: 'relative',
    display: 'block',
    marginBottom: '8px',
    aspectRatio: '1800 / 1390',
    overflow: 'hidden',
    borderRadius: '8px',
    backgroundColor: '#151515',
    boxShadow: { default: `0 0 0 1px ${colors.line}`, ':hover': `0 0 0 1px ${colors.muted}` },
    transitionProperty: 'box-shadow',
    transitionDuration: '0.15s',
  },
  thumbOn: { boxShadow: { default: `0 0 0 2px ${colors.text}`, ':hover': `0 0 0 2px ${colors.text}` } },
  thumb: { display: 'block', width: '100%', height: '100%' },
  badge: {
    position: 'absolute',
    right: '8px',
    bottom: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    height: '24px',
    paddingLeft: '8px',
    paddingRight: '10px',
    borderRadius: '999px',
    backgroundColor: '#f2f2f2',
    color: '#151515',
    fontSize: text.meta,
    fontWeight: weights.medium,
    lineHeight: 1,
  },
  cardKind: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: text.meta,
    color: colors.muted,
    lineHeight: 1.5,
  },
  cardName: { fontSize: text.body, fontWeight: weights.medium, lineHeight: 1.4 },
  cardAbout: { fontSize: text.meta, color: colors.muted, lineHeight: 1.5 },
})

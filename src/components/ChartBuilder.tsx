import { CSPProvider } from '@base-ui/react/csp-provider'
import { Radio } from '@base-ui/react/radio'
import { RadioGroup } from '@base-ui/react/radio-group'
import { Select } from '@base-ui/react/select'
import * as stylex from '@stylexjs/stylex'
import { createContext, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
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
import { autoAxis, drawChart, FONT_FAMILY } from '~/lib/charts/render'
import { chartSizes, fileName, X_MAX_BYTES, type ChartSize } from '~/lib/charts/spec'
import { asCtx, SvgContext, type SvgFont } from '~/lib/charts/svg'
import { breakpoints, colors, type as text, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

const fontFiles = [
  { weight: 400, file: 'Inter-Regular.woff2' },
  { weight: 500, file: 'Inter-Medium.woff2' },
  { weight: 600, file: 'Inter-SemiBold.woff2' },
  { weight: 700, file: 'Inter-Bold.woff2' },
]
const fontUrl = (file: string) => `/lab/charts/fonts/${file}`

let fontsLoading: Promise<void> | undefined
/** Inter for the chart, loaded once. The page's own text stays in Geist. */
function loadChartFonts(): Promise<void> {
  fontsLoading ??= Promise.all(
    fontFiles.map(async ({ weight, file }) => {
      const face = new FontFace(FONT_FAMILY, `url(${fontUrl(file)})`, { weight: String(weight) })
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

export function ChartBuilder({ source = localSource }: { source?: ChartDataSource }) {
  const id = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [templates, setTemplates] = useState<TemplateSummary[]>([])
  const [templateId, setTemplateId] = useState('')
  const [template, setTemplate] = useState<ChartTemplate | null>(null)
  const [config, setConfig] = useState<ChartConfig | null>(null)
  const [sourceText, setSourceText] = useState('')
  const [sprite, setSprite] = useState<HTMLImageElement | null>(null)
  const [pointStyle, setPointStyle] = useState<'icons' | 'initials'>('icons')
  const [size, setSize] = useState<ChartSize>(chartSizes[0] as ChartSize)
  const [scale, setScale] = useState(2)
  const [fontsReady, setFontsReady] = useState(false)
  const [status, setStatus] = useState('Loading the templates…')
  const [layer, setLayer] = useState<HTMLDivElement | null>(null)

  useEffect(() => {
    const done = () => setFontsReady(true)
    loadChartFonts().then(done, done)
    source.listTemplates().then(
      (list) => {
        setTemplates(list)
        const wanted = new URLSearchParams(window.location.search).get('template')
        setTemplateId((current) => current || list.find((t) => t.id === wanted)?.id || list[0]?.id || '')
      },
      () => setStatus('The templates could not be loaded. Please try again later.'),
    )
  }, [source])

  useEffect(() => {
    if (!templateId) return
    let cancelled = false
    source
      .loadTemplate(templateId)
      .then(async (loaded) => {
        const image = loaded.iconSprite ? await loadImage(loaded.iconSprite).catch(() => null) : null
        if (cancelled) return
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
  }, [templateId, source])

  const problems = useMemo(
    () => (config && template ? validate(config, template.rows, sourceText) : []),
    [config, template, sourceText],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !config || !template || !fontsReady || problems.length) return
    canvas.width = size.width
    canvas.height = size.height
    drawChart(ctx, config, template.rows, {
      width: size.width,
      height: size.height,
      source: sourceText,
      sprite,
      pointStyle,
    })
    canvas.dataset.rendered = `${config.id}:${size.width}x${size.height}`
  }, [config, template, sprite, size, fontsReady, problems, sourceText, pointStyle])

  const rows = useMemo(() => (template && config ? filterRows(template.rows, config) : []), [template, config])
  const update = (change: Partial<ChartConfig>) =>
    setConfig((current) => (current ? { ...current, ...change } : current))

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
    if (!config) return
    setConfig({ ...config, footnote: config.footnote.map((line, i) => (i === index ? value : line)) })
  }

  const reset = () => {
    if (!template) return
    setConfig(structuredClone(template.config))
    setSourceText(template.config.source_default ?? '')
    setPointStyle('icons')
  }

  const render = (width: number, height: number, factor: number) => {
    if (!config || !template) return null
    const canvas = document.createElement('canvas')
    canvas.width = width * factor
    canvas.height = height * factor
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.scale(factor, factor)
    drawChart(ctx, config, template.rows, { width, height, source: sourceText, sprite, pointStyle })
    return canvas
  }

  const [downloadNote, setDownloadNote] = useState('')
  const downloadPng = () => {
    const canvas = render(size.width, size.height, scale)
    if (!canvas || !config) return
    canvas.toBlob((blob) => {
      if (!blob) return
      save(blob, fileName(config.title, size, scale, 'png'))
      setDownloadNote(
        blob.size > X_MAX_BYTES
          ? 'Over 5 MB, the limit for photos on X. Try 1x.'
          : `PNG saved, ${canvas.width} × ${canvas.height}, ${(blob.size / 1024 / 1024).toFixed(1)} MB.`,
      )
    }, 'image/png')
  }

  const downloadSvg = async () => {
    if (!config || !template) return
    const measure = document.createElement('canvas').getContext('2d')
    if (!measure) return
    const crops = new Map<string, string>()
    const svg = new SvgContext(size.width, size.height, measure, (image, sx, sy, sw, sh) => {
      const key = `${sx},${sy}`
      let url = crops.get(key)
      if (!url) {
        const cell = document.createElement('canvas')
        cell.width = ICON_CELL
        cell.height = ICON_CELL
        cell.getContext('2d')?.drawImage(image, sx, sy, sw, sh, 0, 0, ICON_CELL, ICON_CELL)
        url = cell.toDataURL('image/png')
        crops.set(key, url)
      }
      return url
    })
    drawChart(asCtx(svg), config, template.rows, {
      width: size.width,
      height: size.height,
      source: sourceText,
      sprite,
      pointStyle,
    })
    const fonts: SvgFont[] = await Promise.all(
      fontFiles.map(async ({ weight, file }) => ({
        family: FONT_FAMILY,
        weight,
        url: await readAsDataUrl(await (await fetch(fontUrl(file))).blob()),
      })),
    )
    save(new Blob([svg.toString(fonts)], { type: 'image/svg+xml' }), fileName(config.title, size, 1, 'svg'))
    setDownloadNote(`SVG saved, ${size.width} × ${size.height}.`)
  }

  const plottable = config ? Object.keys(config.metrics).filter((f) => !f.includes('DO_NOT_PLOT')) : []
  const fieldItems = plottable.map((f) => ({ value: f, label: humanise(f) }))
  const names = useMemo(
    () => (config ? [...new Set(rows.map((r) => nameOf(r, config)))].sort((a, b) => a.localeCompare(b)) : []),
    [rows, config],
  )
  const nameItems = names.map((name) => ({ value: name, label: name }))
  const ready = !!config && problems.length === 0
  const chartLabel = config
    ? `${config.title}. ${config.subtitle ?? ''} Scatter chart of ${config.y.label.toLowerCase()} against ${config.x.label.toLowerCase()}.`
    : 'Chart preview'
  const labelFields = Object.entries(config?.label_fields ?? {})
  const sizeNames: Record<ChartSize['id'], string> = { original: 'Default', wide: '16:9', square: '1:1' }

  return (
    <CSPProvider disableStyleElements>
      <PopupLayer.Provider value={layer}>
        <div ref={setLayer} {...stylex.props(styles.layout)}>
          <div {...stylex.props(styles.preview)}>
            <canvas
              ref={canvasRef}
              width={size.width}
              height={size.height}
              role="img"
              aria-label={chartLabel}
              {...stylex.props(styles.canvas)}
            />
            <p role="status" {...stylex.props(styles.status)}>
              {template && template.config.id !== templateId && !status
                ? 'Loading the template…'
                : status || downloadNote}
            </p>
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
                disabled={!template}
                {...stylex.props(styles.button, styles.quiet, ui.focusRing)}
              >
                Reset template
              </button>
            </div>
          </div>

          <form {...stylex.props(styles.form)} onSubmit={(event) => event.preventDefault()} aria-label="Chart settings">
            <Section title="Template" id={`${id}-s-template`}>
              <div role="radiogroup" aria-labelledby={`${id}-s-template`} {...stylex.props(styles.templates)}>
                {templates.map((t) => (
                  <label key={t.id} {...stylex.props(styles.template, t.id === templateId && styles.templateOn)}>
                    <input
                      type="radio"
                      name={`${id}-template`}
                      value={t.id}
                      checked={t.id === templateId}
                      onChange={() => {
                        setStatus('')
                        setTemplateId(t.id)
                      }}
                      {...stylex.props(styles.radio, ui.focusRing)}
                    />
                    <span {...stylex.props(styles.templateBody)}>
                      <span {...stylex.props(styles.templateName)}>{t.name}</span>
                      <span {...stylex.props(styles.templateData)}>
                        {[t.sample, t.sourceShort, formatDate(t.date)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </Section>

            <Section title="Text" id={`${id}-s-text`}>
              <Field label="Title" htmlFor={`${id}-title`}>
                <input
                  id={`${id}-title`}
                  type="text"
                  maxLength={90}
                  value={config?.title ?? ''}
                  onChange={(e) => update({ title: e.target.value })}
                  {...stylex.props(styles.control, ui.focusRing)}
                />
              </Field>
              <Field label="Subtitle" htmlFor={`${id}-subtitle`}>
                <input
                  id={`${id}-subtitle`}
                  type="text"
                  maxLength={120}
                  value={config?.subtitle ?? ''}
                  onChange={(e) => update({ subtitle: e.target.value })}
                  {...stylex.props(styles.control, ui.focusRing)}
                />
              </Field>
            </Section>

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
                    <div role="group" aria-label={`What point ${index + 1} shows`} {...stylex.props(styles.chips)}>
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
                {(['x', 'y'] as const).map((axis) => (
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
                <Segmented
                  label="Points"
                  value={pointStyle}
                  options={[
                    { value: 'icons', label: 'Icons' },
                    { value: 'initials', label: 'Initials' },
                  ]}
                  onChange={(value) => setPointStyle(value as 'icons' | 'initials')}
                />
                {(config?.labels ?? []).map((label, index) => (
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
                    value={sourceText}
                    onChange={(e) => setSourceText(e.target.value)}
                    {...stylex.props(styles.control, ui.focusRing)}
                  />
                </Field>
                {(config?.footnote ?? []).map((line, index) => (
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
      </PopupLayer.Provider>
    </CSPProvider>
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
      {...stylex.props(styles.chip, pressed && styles.chipOn, ui.focusRing)}
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

const styles = stylex.create({
  layout: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) 360px', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    gap: { default: '40px', [breakpoints.tablet]: '32px' },
    alignItems: 'start',
  },
  preview: { position: { default: 'sticky', [breakpoints.tablet]: 'static' }, top: '24px' },
  canvas: {
    display: 'block',
    width: '100%',
    height: 'auto',
    borderRadius: '8px',
    backgroundColor: '#151515',
    boxShadow: `0 0 0 1px ${colors.line}`,
  },
  status: {
    minHeight: '24px',
    marginTop: '8px',
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
  form: { display: 'grid', minWidth: 0 },
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
  templates: {
    display: 'grid',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.line,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  template: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
    paddingBlock: '8px',
    paddingInline: '16px',
    cursor: 'pointer',
    borderTopWidth: { default: '1px', ':first-child': 0 },
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
    backgroundColor: { default: 'transparent', ':hover': colors.soft },
  },
  templateOn: { backgroundColor: colors.soft },
  radio: { marginTop: '6px', flexShrink: 0, accentColor: colors.text },
  templateBody: { display: 'grid', minWidth: 0 },
  templateName: { fontSize: text.body, fontWeight: weights.medium, lineHeight: 1.5 },
  templateData: { fontSize: text.meta, color: colors.muted, lineHeight: 1.5 },
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
})

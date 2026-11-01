import * as stylex from '@stylexjs/stylex'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  filterRows,
  labelRows,
  nameOf,
  toNumber,
  validate,
  type AxisConfig,
  type ChartConfig,
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
import { breakpoints, colors } from '~/styles/tokens.stylex'
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

const humanise = (field: string) => {
  const text = field.replaceAll('_', ' ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** The axis for a field: the template's own axis when it has one for that field, otherwise fitted to the data. */
function axisFor(field: string, original: ChartConfig, rows: Row[]): AxisConfig {
  const known = [original.x, original.y].find((a) => a.field === field)
  if (known) return structuredClone(known)
  const fitted = autoAxis(rows.map((r) => toNumber(r[field])))
  return { field, label: humanise(field), ...fitted }
}

function formatDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

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
  const summary = templates.find((t) => t.id === templateId)
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

  const setLabel = (index: number, change: Partial<NonNullable<ChartConfig['labels']>[number]>) => {
    if (!config) return
    const labels = (config.labels ?? []).map((label, i) => (i === index ? { ...label, ...change } : label))
    setConfig({ ...config, labels })
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
          ? 'This file is over 5 MB, the limit for photos on X. Try the 1x size.'
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
  const names = useMemo(
    () => (config ? [...new Set(rows.map((r) => nameOf(r, config)))].sort((a, b) => a.localeCompare(b)) : []),
    [rows, config],
  )
  const ready = !!config && problems.length === 0
  const chartLabel = config
    ? `${config.title}. ${config.subtitle ?? ''} Scatter chart of ${config.y.label.toLowerCase()} against ${config.x.label.toLowerCase()}.`
    : 'Chart preview'

  return (
    <div {...stylex.props(styles.layout)}>
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
          {template && template.config.id !== templateId && !status ? 'Loading the template…' : status || downloadNote}
        </p>
        {problems.length ? (
          <div role="alert" {...stylex.props(styles.problems)}>
            <p {...stylex.props(styles.problemsTitle)}>
              This chart breaks the data rules, so it cannot be downloaded yet:
            </p>
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
            {...stylex.props(styles.button, styles.primary, ui.focusRing)}
          >
            Download PNG
          </button>
          <button
            type="button"
            onClick={() => void downloadSvg()}
            disabled={!ready}
            {...stylex.props(styles.button, ui.focusRing)}
          >
            Download SVG
          </button>
          <button type="button" onClick={reset} disabled={!template} {...stylex.props(styles.button, ui.focusRing)}>
            Reset template
          </button>
        </div>
        {summary ? (
          <p {...stylex.props(styles.meta)}>
            Data: {summary.source}, snapshot of {formatDate(summary.date)}.
          </p>
        ) : null}
      </div>

      <form {...stylex.props(styles.form)} onSubmit={(event) => event.preventDefault()} aria-label="Chart settings">
        <fieldset {...stylex.props(styles.group, styles.firstGroup)}>
          <legend {...stylex.props(styles.legend)}>Template</legend>
          <div {...stylex.props(styles.templates)}>
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
                <span>
                  <span {...stylex.props(styles.templateName)}>{t.name}</span>
                  <span {...stylex.props(styles.templateText)}>{t.description}</span>
                  <span {...stylex.props(styles.templateText)}>
                    {formatDate(t.date)} · {t.source}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <Field label="Chart type" htmlFor={`${id}-type`} hint="Scatter is the only type in the chart spec so far.">
          <select
            id={`${id}-type`}
            value="scatter"
            onChange={() => undefined}
            {...stylex.props(styles.control, ui.focusRing)}
          >
            <option value="scatter">Scatter</option>
          </select>
        </Field>
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

        {(['x', 'y'] as const).map((axis) => (
          <fieldset key={axis} {...stylex.props(styles.group)}>
            <legend {...stylex.props(styles.legend)}>{axis === 'x' ? 'Horizontal axis' : 'Vertical axis'}</legend>
            <Field
              label="Data"
              htmlFor={`${id}-${axis}-field`}
              hint="Only columns with a written meaning and biases can be plotted."
            >
              <select
                id={`${id}-${axis}-field`}
                value={config?.[axis].field ?? ''}
                onChange={(e) => setField(axis, e.target.value)}
                {...stylex.props(styles.control, ui.focusRing)}
              >
                {plottable.map((f) => (
                  <option key={f} value={f}>
                    {humanise(f)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Label" htmlFor={`${id}-${axis}-label`}>
              <input
                id={`${id}-${axis}-label`}
                type="text"
                maxLength={70}
                value={config?.[axis].label ?? ''}
                onChange={(e) => config && update({ [axis]: { ...config[axis], label: e.target.value } })}
                {...stylex.props(styles.control, ui.focusRing)}
              />
            </Field>
          </fieldset>
        ))}

        <fieldset {...stylex.props(styles.group)}>
          <legend {...stylex.props(styles.legend)}>Labelled points</legend>
          <p {...stylex.props(styles.hint)}>
            Words in braces, like {'{us_rank}'}, are filled from the data. A new line starts a second line.
          </p>
          {(config?.labels ?? []).map((label, index) => {
            const target = template && config ? labelRows(rows, label).map((r) => nameOf(r, config)) : []
            return (
              <div key={index} {...stylex.props(styles.labelBox)}>
                {label.match ? (
                  <Field
                    label={`Point ${index + 1}${label.highlight ? ' (standout)' : ''}`}
                    htmlFor={`${id}-label-row-${index}`}
                  >
                    <select
                      id={`${id}-label-row-${index}`}
                      value={target[0] ?? ''}
                      onChange={(e) =>
                        config && setLabel(index, { match: { [config.name_column ?? 'app']: e.target.value } })
                      }
                      {...stylex.props(styles.control, ui.focusRing)}
                    >
                      {names.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : (
                  <p {...stylex.props(styles.hint)}>
                    Point {index + 1}: number {(label.skip ?? 0) + 1} by {humanise(label.top_by ?? '')} (
                    {target.join(', ')})
                  </p>
                )}
                <Field label={`Label ${index + 1}`} htmlFor={`${id}-label-${index}`}>
                  <textarea
                    id={`${id}-label-${index}`}
                    rows={2}
                    maxLength={160}
                    value={label.text}
                    onChange={(e) => setLabel(index, { text: e.target.value })}
                    {...stylex.props(styles.control, styles.textarea, ui.focusRing)}
                  />
                </Field>
              </div>
            )
          })}
        </fieldset>

        <fieldset {...stylex.props(styles.group)}>
          <legend {...stylex.props(styles.legend)}>Footnote</legend>
          <Field label="Source" htmlFor={`${id}-source`} hint="Fills {source} in the first line.">
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
            <Field key={index} label={`Line ${index + 1}`} htmlFor={`${id}-foot-${index}`}>
              <textarea
                id={`${id}-foot-${index}`}
                rows={2}
                maxLength={180}
                value={line}
                onChange={(e) => setFootnote(index, e.target.value)}
                {...stylex.props(styles.control, styles.textarea, ui.focusRing)}
              />
            </Field>
          ))}
        </fieldset>

        <Field label="Points" htmlFor={`${id}-points`}>
          <select
            id={`${id}-points`}
            value={pointStyle}
            onChange={(e) => setPointStyle(e.target.value as 'icons' | 'initials')}
            {...stylex.props(styles.control, ui.focusRing)}
          >
            <option value="icons">App icons</option>
            <option value="initials">Initials</option>
          </select>
        </Field>

        <fieldset {...stylex.props(styles.group)}>
          <legend {...stylex.props(styles.legend)}>Size</legend>
          {chartSizes.map((option) => (
            <label key={option.id} {...stylex.props(styles.check)}>
              <input
                type="radio"
                name={`${id}-size`}
                value={option.id}
                checked={size.id === option.id}
                onChange={() => setSize(option)}
                {...stylex.props(ui.focusRing)}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
        <fieldset {...stylex.props(styles.group)}>
          <legend {...stylex.props(styles.legend)}>PNG resolution</legend>
          {[2, 1].map((factor) => (
            <label key={factor} {...stylex.props(styles.check)}>
              <input
                type="radio"
                name={`${id}-scale`}
                value={factor}
                checked={scale === factor}
                onChange={() => setScale(factor)}
                {...stylex.props(ui.focusRing)}
              />
              {factor === 2
                ? `2x, ${size.width * 2} × ${size.height * 2} (sharper)`
                : `1x, ${size.width} × ${size.height}`}
            </label>
          ))}
        </fieldset>
      </form>
    </div>
  )
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div {...stylex.props(styles.field)}>
      <label htmlFor={htmlFor} {...stylex.props(styles.label)}>
        {label}
      </label>
      {children}
      {hint ? <p {...stylex.props(styles.hint)}>{hint}</p> : null}
    </div>
  )
}

const styles = stylex.create({
  layout: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) 320px', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    gap: { default: '2.5rem', [breakpoints.tablet]: '2rem' },
    alignItems: 'start',
  },
  preview: { position: { default: 'sticky', [breakpoints.tablet]: 'static' }, top: '1.5rem' },
  canvas: {
    display: 'block',
    width: '100%',
    height: 'auto',
    borderRadius: '10px',
    backgroundColor: '#151515',
    boxShadow: `0 0 0 1px ${colors.line}`,
  },
  status: { minHeight: '1.6em', marginTop: '0.6rem', color: colors.muted, fontSize: '0.95rem' },
  problems: {
    marginTop: '0.4rem',
    marginBottom: '0.8rem',
    paddingBlock: '0.8rem',
    paddingInline: '1rem',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.line,
    backgroundColor: colors.soft,
    fontSize: '0.95rem',
  },
  problemsTitle: { fontWeight: 500 },
  problemList: { marginTop: '0.4rem', paddingLeft: '1.2rem', color: colors.muted },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.4rem' },
  meta: { marginTop: '0.9rem', color: colors.muted, fontSize: '0.9rem' },
  button: {
    appearance: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '2.6rem',
    paddingInline: '1.05rem',
    borderRadius: '999px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: colors.text,
    color: colors.text,
    backgroundColor: { default: 'transparent', ':hover': colors.soft },
    font: 'inherit',
    fontSize: '0.95rem',
    fontWeight: 500,
    cursor: { default: 'pointer', ':disabled': 'not-allowed' },
    opacity: { default: 1, ':disabled': 0.5 },
    transitionProperty: 'background-color, color',
    transitionDuration: '0.15s',
  },
  primary: { color: colors.bg, backgroundColor: { default: colors.text, ':hover': colors.muted } },
  form: { display: 'grid', gap: '1.1rem' },
  group: {
    display: 'grid',
    gap: '0.8rem',
    margin: 0,
    padding: 0,
    borderWidth: 0,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
    paddingTop: '0.9rem',
    minWidth: 0,
  },
  firstGroup: { borderTopWidth: 0, paddingTop: 0 },
  legend: { float: 'left', width: '100%', padding: 0, fontWeight: 500, fontSize: '0.95rem' },
  templates: { display: 'grid', gap: '0.5rem' },
  template: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'flex-start',
    paddingBlock: '0.6rem',
    paddingInline: '0.75rem',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: colors.line, ':hover': colors.diagramEdge },
    cursor: 'pointer',
  },
  templateOn: { borderColor: colors.text, backgroundColor: colors.soft },
  radio: { marginTop: '0.3rem', flexShrink: 0 },
  templateName: { display: 'block', fontWeight: 500, fontSize: '0.95rem', lineHeight: 1.4 },
  templateText: { display: 'block', marginTop: '0.15rem', color: colors.muted, fontSize: '0.85rem', lineHeight: 1.45 },
  labelBox: { display: 'grid', gap: '0.6rem' },
  field: { display: 'grid', gap: '0.35rem', minWidth: 0 },
  label: { fontSize: '0.9rem', color: colors.muted },
  hint: { fontSize: '0.85rem', color: colors.muted, lineHeight: 1.45 },
  control: {
    width: '100%',
    minHeight: '2.5rem',
    paddingBlock: '0.45rem',
    paddingInline: '0.7rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: { default: colors.line, ':hover': colors.diagramEdge },
    borderRadius: '6px',
    backgroundColor: colors.bg,
    color: colors.text,
    font: 'inherit',
    fontSize: '0.95rem',
    lineHeight: 1.4,
  },
  textarea: { resize: 'vertical' },
  check: { display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.95rem' },
})

import type { ChartConfig, Row } from './config.ts'
import { parseCsv } from './csv.ts'

/**
 * Where the chart builder gets its templates. The page only talks to a
 * ChartDataSource, so the static files can be joined by a live source (see
 * api.ts) without changing the builder.
 */
export interface ChartDataSource {
  listTemplates(): Promise<TemplateSummary[]>
  loadTemplate(id: string): Promise<ChartTemplate>
}

export interface TemplateSummary {
  id: string
  name: string
  /** What one point is, with the count: "30 iOS apps". */
  sample: string
  /** The source in a few words. */
  sourceShort: string
  /** Snapshot date, YYYY-MM-DD. */
  date: string
  source: string
  extra?: boolean
}

export interface ChartTemplate {
  config: ChartConfig
  rows: Row[]
  /** App icons in one image, ICON_CELL px square each, ICON_COLUMNS to a row. */
  iconSprite?: string
}

/** Icon size in the sprites, the size the original charts scale their icons from. */
export const ICON_CELL = 128
export const ICON_COLUMNS = 10

type Fetcher = (url: string) => Promise<{ ok: boolean; status: number; text(): Promise<string> }>

async function getText(fetcher: Fetcher, url: string): Promise<string> {
  const response = await fetcher(url)
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`)
  return response.text()
}

export function summaryOf(config: ChartConfig): TemplateSummary {
  return {
    id: config.id,
    name: config.template?.name ?? config.title,
    sample: config.template?.sample ?? '',
    sourceShort: config.template?.source_short ?? config.template?.source ?? config.source_default ?? '',
    date: config.template?.date ?? config.staleness?.as_of ?? '',
    source: config.template?.source ?? config.source_default ?? '',
    extra: config.template?.extra,
  }
}

/** Reads the templates copied to public/lab/charts/data/ by scripts/lab-charts-data.ts. */
export function createLocalSource(base = '/lab/charts/data/', fetcher: Fetcher = (url) => fetch(url)): ChartDataSource {
  const configs = new Map<string, Promise<ChartConfig>>()
  const config = (id: string) => {
    if (!/^[a-z0-9-]+$/.test(id)) return Promise.reject(new Error(`Unknown template: ${id}`))
    let found = configs.get(id)
    if (!found) {
      found = getText(fetcher, `${base}${id}.json`).then((text) => JSON.parse(text) as ChartConfig)
      configs.set(id, found)
    }
    return found
  }
  return {
    async listTemplates() {
      const ids = JSON.parse(await getText(fetcher, `${base}index.json`)) as string[]
      return Promise.all(ids.map(async (id) => summaryOf(await config(id))))
    },
    async loadTemplate(id) {
      const [cfg, csv] = await Promise.all([config(id), getText(fetcher, `${base}${id}.csv`)])
      const rows = parseCsv(csv).rows
      const hasIcons = rows.some((r) => (r[cfg.icon_column ?? 'icon'] ?? '') !== '')
      return { config: structuredClone(cfg), rows, iconSprite: hasIcons ? `${base}${id}-icons.webp` : undefined }
    },
  }
}

export const localSource = createLocalSource()

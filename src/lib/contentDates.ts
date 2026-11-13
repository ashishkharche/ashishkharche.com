// Node only: used by the build (Vite plugin and post-build step), never in the browser.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { readFrontmatter } from '../../plugins/content.ts'
import { sitemapPaths } from '../content/site.ts'

const day = /^\d{4}-\d{2}-\d{2}$/

/** Source files whose last change is the last change of each page (paths relative to the repo root). */
export function pageSources(path: string): string[] {
  const note = /^\/notes\/([a-z0-9-]+)\/$/.exec(path)
  if (note) return [`content/notes/${note[1]}.mdx`]
  const sources: Record<string, string[]> = {
    '/': ['src/routes/index.tsx', 'src/content/site.ts', 'content/notes'],
    '/work/': ['src/routes/work.tsx', 'src/content/work.ts'],
    '/projects/': ['src/routes/projects.index.tsx', 'src/content/projects.ts'],
    '/projects/workout-director/': [
      'src/routes/projects.workout-director.tsx',
      'content/projects/workout-director.mdx',
      'src/content/workoutDirectorScreens.ts',
    ],
    '/notes/': ['src/routes/notes.index.tsx', 'src/content/notes.ts', 'content/notes'],
    '/about/': ['src/routes/about.tsx'],
    '/credits/': ['src/routes/credits.tsx'],
    '/lab/charts/': ['src/routes/lab.charts.tsx', 'src/components/ChartBuilder.tsx', 'public/lab/charts/data'],
  }
  const files = sources[path]
  if (!files) throw new Error(`No source files are listed for ${path}`)
  return files
}

/** Returns the date (YYYY-MM-DD) of the last commit that touched any of the files, or undefined without git. */
export type GitDate = (files: string[], cwd: string) => string | undefined

export const gitDate: GitDate = (files, cwd) => {
  try {
    const run = (args: string[]) =>
      execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    // Files with uncommitted edits changed today, whatever the last commit says.
    if (run(['status', '--porcelain', '--', ...files])) return new Date().toISOString().slice(0, 10)
    const date = run(['log', '-1', '--format=%cs', '--', ...files])
    return day.test(date) ? date : undefined
  } catch {
    return undefined
  }
}

function later(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b
  if (!b) return a
  return a > b ? a : b
}

export interface NoteDates {
  published: string
  updated: string
}

/** A note's first published date (frontmatter `date`) and last change (frontmatter `updated` or git, whichever is later). */
export function noteDates(slug: string, root: string, git: GitDate = gitDate): NoteDates {
  const file = `content/notes/${slug}.mdx`
  const frontmatter = readFrontmatter(readFileSync(join(root, file), 'utf8'))
  const published = frontmatter.date
  if (typeof published !== 'string' || !day.test(published)) throw new Error(`Note ${slug} has no valid date`)
  const declared =
    typeof frontmatter.updated === 'string' && day.test(frontmatter.updated) ? frontmatter.updated : undefined
  const updated = later(later(published, declared), git([file], root)) ?? published
  return { published, updated }
}

/**
 * Last-modified date for every sitemap page, from content dates and git
 * history. Never the build time: a page with no date is left out.
 */
export function contentDates(
  root: string,
  git: GitDate = gitDate,
  paths: readonly string[] = sitemapPaths,
): Record<string, string> {
  const dates: Record<string, string> = {}
  for (const path of paths) {
    const note = /^\/notes\/([a-z0-9-]+)\/$/.exec(path)
    const files = pageSources(path)
    for (const file of files)
      if (!existsSync(join(root, file))) throw new Error(`${path}: source ${file} does not exist`)
    const date = note?.[1] ? noteDates(note[1], root, git).updated : git(files, root)
    if (date) dates[path] = date
  }
  return dates
}

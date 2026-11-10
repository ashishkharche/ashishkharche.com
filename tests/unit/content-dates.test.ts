import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import dates from 'virtual:content-dates'
import { notes } from '~/content/notes'
import { sitemapPaths } from '~/content/site'
import { contentDates, noteDates, pageSources, type GitDate } from '~/lib/contentDates'

const root = fileURLToPath(new URL('../../', import.meta.url))
const noGit: GitDate = () => undefined
const fixedGit =
  (date: string): GitDate =>
  () =>
    date

describe('content dates', () => {
  it('lists existing source files for every sitemap page', () => {
    expect(() => contentDates(root, noGit)).not.toThrow()
    for (const path of sitemapPaths) expect(pageSources(path).length).toBeGreaterThan(0)
  })

  it('uses a note date from its frontmatter when there is no git history', () => {
    const result = contentDates(root, noGit)
    expect(result['/notes/workout-director-1/']).toBe('2026-10-30')
    // Pages without a content date get no lastmod rather than the build time.
    expect(result['/work/']).toBeUndefined()
    // A note published today may carry today's date; any other value must not be the build day.
    const published = new Set(notes.map((note) => note.date))
    expect(Object.values(result).filter((date) => !published.has(date))).not.toContain(
      new Date().toISOString().slice(0, 10),
    )
  })

  it('uses the last commit date when it is later than the published date', () => {
    expect(noteDates('workout-director-1', root, fixedGit('2026-11-02'))).toEqual({
      published: '2026-10-30',
      updated: '2026-11-02',
    })
    expect(contentDates(root, fixedGit('2026-11-02'))['/work/']).toBe('2026-11-02')
  })

  it('never moves a note before its published date', () => {
    expect(noteDates('workout-director-1', root, fixedGit('2020-01-01')).updated).toBe('2026-10-30')
  })

  it('gives the build a date for every page and note', () => {
    for (const path of sitemapPaths) expect(dates.pages[path]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Object.keys(dates.notes).sort()).toEqual(['reflex', 'workout-director-1', 'workout-director-2'])
  })
})

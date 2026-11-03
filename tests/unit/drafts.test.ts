import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { draftPosts, draftsPath, draftsSlug, lengthOf } from '~/content/drafts'
import { sitemapPaths } from '~/content/site'
import { arrange, filtersToSearch, matches, parseFilters } from '~/lib/drafts'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

describe('the private drafts board', () => {
  it('lives at an unguessable path', () => {
    expect(draftsSlug).toMatch(/^[a-z]{8,10}$/)
    expect(draftsPath).toBe(`/drafts/${draftsSlug}/`)
  })

  it('is not in the sitemap, robots.txt or the web manifest', () => {
    expect(sitemapPaths.some((p) => p.startsWith('/drafts'))).toBe(false)
    expect(readFileSync('public/robots.txt', 'utf8')).not.toMatch(/drafts/i)
    expect(readFileSync('public/site.webmanifest', 'utf8')).not.toMatch(/drafts/i)
  })

  it('is not linked from any other source file', () => {
    const allowed = ['src/content/drafts.ts', 'src/routeTree.gen.ts']
    const linking = [...files('src'), ...files('content'), ...files('public')]
      .filter((f) => /\.(ts|tsx|mdx|md|txt|xml|json|webmanifest)$/.test(f) && !allowed.includes(f))
      .filter((f) => readFileSync(f, 'utf8').includes(draftsSlug))
    expect(linking).toEqual([])
  })

  it('sends X-Robots-Tag noindex, nofollow for its path', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
      headers: { source: string; headers: { key: string; value: string }[] }[]
    }
    const rule = config.headers.find((h) => h.source === '/drafts/(.*)')
    expect(rule?.headers).toContainEqual({ key: 'X-Robots-Tag', value: 'noindex, nofollow' })
  })

  it('shows one version of each post, with real images', () => {
    const ids = draftPosts.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(16)
    for (const post of draftPosts) {
      for (const img of post.images) expect(existsSync(join('public', img.src)), img.src).toBe(true)
      // A post with no image either waits for media or is text only on purpose (D2, D3 since the 3 Nov cross-check).
      if (post.status === 'waiting') expect(post.images, post.id).toHaveLength(0)
      if (post.images.length === 0)
        expect(post.status === 'waiting' || post.media.join() === 'text', post.id).toBe(true)
      expect(post.length).toBe(lengthOf(post.chars))
    }
  })

  it('keeps out the details that must not be posted', () => {
    const all = JSON.stringify(draftPosts)
    expect(all).not.toMatch(/shelgaon/i)
    expect(all).not.toMatch(/part[\s-]?time/i)
    expect(all).not.toMatch(/github\.com\/\S*workout-director/i)
    expect(all).not.toMatch(/\+44|\b07\d{3}\s?\d{6}\b/)
  })
})

describe('drafts filters', () => {
  it('round-trips through the query string', () => {
    const f = parseFilters(
      '?topic=coach,rep-counter&length=short&media=diagram&status=ready&q=deadlift&sort=topic&view=phone',
    )
    expect(f).toEqual({
      topic: ['coach', 'rep-counter'],
      length: ['short'],
      media: ['diagram'],
      status: ['ready'],
      q: 'deadlift',
      sort: 'topic',
      view: 'mobile',
    })
    expect(parseFilters(filtersToSearch(f))).toEqual(f)
    expect(filtersToSearch(parseFilters(''))).toBe('')
    expect(parseFilters('?topic=nope&sort=x').topic).toEqual([])
  })

  it('filters by topic, status and text, and groups by topic', () => {
    const none = parseFilters('')
    expect(draftPosts.every((p) => matches(p, none))).toBe(true)
    const coach = draftPosts.filter((p) => matches(p, parseFilters('?topic=coach')))
    expect(coach.map((p) => p.id).sort()).toEqual(['wd-b2-1', 'wd-b3-4', 'wd-b3-5'])
    const checked = draftPosts.filter((p) => matches(p, parseFilters('?status=checked')))
    expect(checked.map((p) => p.id).sort()).toEqual(
      [
        'd1',
        'd2',
        'd3',
        'sample-a',
        'wd-b2-2',
        'wd-b2-4',
        'wd-b2-5',
        'wd-b3-1',
        'wd-b3-2',
        'wd-b3-4',
        'wd-b3-5',
        'wd-b3-6',
      ].sort(),
    )
    const waiting = draftPosts.filter((p) => matches(p, parseFilters('?status=waiting')))
    expect(waiting.map((p) => p.id).sort()).toEqual(['wd-b2-1', 'wd-b2-3', 'wd-b3-3'])
    expect(draftPosts.filter((p) => matches(p, parseFilters('?q=Time+to+update'))).map((p) => p.id)).toEqual([
      'wd-b2-2',
    ])
    const grouped = arrange(draftPosts, parseFilters('?sort=topic'))
    expect(grouped.reduce((n, g) => n + g.posts.length, 0)).toBe(16)
    const newest = arrange(draftPosts, none)[0]?.posts ?? []
    expect((newest[0]?.updated ?? '') >= (newest.at(-1)?.updated ?? '')).toBe(true)
  })
})

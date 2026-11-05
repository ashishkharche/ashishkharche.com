import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { draftPosts, draftsImagesPath, draftsPath, draftsSlug, lengthOf, statuses } from '~/content/drafts'
import { compactBannedPhrases, compactTexts, compactWithheld, oxfordCommaAllowlist } from '~/content/linkedinCompact'
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
    expect(ids).toHaveLength(41)
    // Dropped as duplicates in the 3 Nov audit (source files kept).
    expect(ids).not.toContain('wd-b2-1')
    expect(ids).not.toContain('wd-b2-5')
    for (const post of draftPosts) {
      for (const img of post.images) expect(existsSync(join('public', img.src)), img.src).toBe(true)
      // A post with no image either waits for media or is text only on purpose (D2, D3 since the 3 Nov cross-check).
      if (post.status === 'waiting') expect(post.images, post.id).toHaveLength(0)
      // An AI coding tools idea that still needs a check gets its media once the check is done.
      if (post.images.length === 0)
        expect(
          post.status === 'waiting' || post.status === 'needs-check' || post.media.join() === 'text',
          post.id,
        ).toBe(true)
      expect(post.length).toBe(lengthOf(post.chars))
    }
  })

  it('offers each page image as its lossless PNG under the noindex /drafts/ path', () => {
    const names = new Set<string>()
    const pngs = draftPosts.flatMap((p) => p.images)
    expect(pngs).toHaveLength(25)
    for (const img of pngs) {
      expect(img.png).toBe(`${draftsImagesPath}${img.pngName}`)
      expect(img.pngName, img.src).toMatch(/^[a-z0-9-]+\.png$/)
      expect(img.pngName, img.src).not.toMatch(/live/i)
      expect(names.has(img.pngName), img.pngName).toBe(false)
      names.add(img.pngName)
      const bytes = readFileSync(join('public', img.png))
      // PNG signature, then the IHDR width and height, which match the WebP shown on the page.
      expect(bytes.subarray(0, 8).toString('hex'), img.pngName).toBe('89504e470d0a1a0a')
      expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)], img.pngName).toEqual([img.w, img.h])
    }
    expect(readdirSync(join('public', draftsImagesPath)).sort()).toEqual([...names].sort())
    const p1 = draftPosts.find((p) => p.id === 'wd-b4-p1')
    expect(p1?.images.map((i) => i.pngName)).toEqual(['wd-b4-p1-rep-counter-v3.png'])
  })

  it('shows the goblet squat credit as a caption on the page, not in the post text', () => {
    const post = draftPosts.find((p) => p.id === 'wd-b2-4')
    expect(post?.images[0]?.caption).toMatch(
      /^Goblet squat reference .*Taco Fleur, Wikimedia Commons, CC BY-SA 4\.0\.$/,
    )
    expect(post?.images[1]?.caption).toBeUndefined()
    expect(post?.text).not.toMatch(/Taco Fleur|Wikimedia|CC BY/)
    expect(draftPosts.filter((p) => p.images.some((i) => i.caption)).map((p) => p.id)).toEqual([
      'wd-b2-4',
      'wd-b4-fig1',
    ])
  })

  it('keeps out the details that must not be posted', () => {
    const all = JSON.stringify(draftPosts)
    expect(all).not.toMatch(/shelgaon/i)
    expect(all).not.toMatch(/part[\s-]?time/i)
    expect(all).not.toMatch(/github\.com\/\S*workout-director/i)
    expect(all).not.toMatch(/\+44|\b07\d{3}\s?\d{6}\b/)
  })
})

describe('the Data posts (StatMuse-style tech and app stats)', () => {
  const data = draftPosts.filter((p) => p.topics.includes('data'))

  it('has data-1 to data-8 under the Data topic, as Data check, not Ready to post', () => {
    expect(data.map((p) => p.id)).toEqual([
      'data-1',
      'data-2',
      'data-3',
      'data-4',
      'data-5',
      'data-6',
      'data-7',
      'data-8',
    ])
    expect(statuses['data-check']).toBe('Data check')
    for (const post of data) {
      expect(post.status, post.id).toBe('data-check')
      expect(post.primary, post.id).toBe('data')
      expect(post.title, post.id).not.toBe('')
      expect(post.leastSure?.length, post.id).toBeGreaterThan(0)
      for (const l of post.leastSure ?? []) expect(post.notes, post.id).toContain(`Least sure: ${l}`)
      expect(post.freshUntil, post.id).toMatch(/^(Fresh until|No expiry)/)
      expect(post.images, post.id).toHaveLength(1)
      expect(post.images[0]?.pngName, post.id).toMatch(new RegExp(`^${post.id}-[a-z0-9-]+\\.png$`))
    }
    expect(draftPosts.filter((p) => matches(p, parseFilters('?status=data-check'))).map((p) => p.id)).toEqual(
      data.map((p) => p.id),
    )
    expect(draftPosts.filter((p) => matches(p, parseFilters('?topic=data')))).toHaveLength(8)
  })

  it('keeps the sources out of the post text and in the first comment', () => {
    for (const post of data) {
      expect(post.firstCommentSources, post.id).toMatch(/https:\/\//)
      expect(post.text, post.id).not.toMatch(/https?:\/\/|Sources|Least sure|^#/m)
      expect(post.text, post.id).not.toContain(post.firstCommentSources ?? '')
      expect(post.text.split('\n\n').length, post.id).toBe(1)
      expect(post.longerText?.split('\n\n').length ?? 0, post.id).toBeGreaterThan(3)
    }
  })

  it('marks the chart snapshots (01, 02, 04, 07, 08) for a refetch', () => {
    const stale = data.filter((p) => /refetch and re-run make_posts\.py/.test(p.freshUntil ?? '')).map((p) => p.id)
    expect(stale).toEqual(['data-1', 'data-2', 'data-4', 'data-7', 'data-8'])
    for (const id of stale)
      expect(draftPosts.find((p) => p.id === id)?.freshUntil).toMatch(/4 Nov 2026, 00:45 to 01:15 GMT/)
  })
})

describe('the AI coding tools ideas', () => {
  const ai = draftPosts.filter((p) => p.topics.includes('ai-tools'))

  it('has ai-1 to ai-7 in rank order, each with a title, text, media plan and status', () => {
    expect(ai.map((p) => p.id)).toEqual(['ai-1', 'ai-2', 'ai-3', 'ai-4', 'ai-5', 'ai-6', 'ai-7'])
    expect(ai.map((p) => p.rank)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(statuses['needs-check']).toBe('Needs check')
    expect(Object.fromEntries(ai.map((p) => [p.id, p.status]))).toEqual({
      'ai-1': 'waiting',
      'ai-2': 'needs-check',
      'ai-3': 'waiting',
      'ai-4': 'needs-check',
      'ai-5': 'needs-check',
      'ai-6': 'ready',
      'ai-7': 'waiting',
    })
    for (const post of ai) {
      expect(post.primary, post.id).toBe('ai-tools')
      expect(post.title, post.id).not.toBe('')
      expect(post.mediaPlan, post.id).not.toBe('')
      expect(post.freshUntil, post.id).not.toBe('')
      expect(post.firstCommentSources, post.id).not.toBe('')
      expect(post.images, post.id).toHaveLength(0)
      expect(post.text, post.id).not.toMatch(/https?:\/\/|Sources|^#/m)
      expect(post.length).toBe(lengthOf(post.chars))
    }
    // Newest first keeps the ranks together and in order, at the top of the board.
    const newest = arrange(draftPosts, parseFilters('')).flatMap((s) => s.posts.map((p) => p.id))
    expect(newest.slice(0, 7)).toEqual(ai.map((p) => p.id))
  })

  it('flags the Grok posts and leads idea 1 with the fact', () => {
    expect(ai.filter((p) => p.caution).map((p) => p.id)).toEqual(['ai-4', 'ai-5'])
    expect(ai[0]?.text).toMatch(/^Codex and Grok Build ship as static Rust binaries/)
    expect(ai[0]?.text).not.toMatch(/\bI unpacked\b/)
    expect(ai[0]?.longerText).toMatch(/^Five AI coding CLIs, unpacked from their Linux builds\./)
  })

  it('cites public sources only and names nothing from the private repo', () => {
    const all = JSON.stringify(ai)
    expect(all).not.toMatch(/manager-production|github\.com\/androiddevnotes/i)
    for (const post of ai)
      for (const url of (post.firstCommentSources ?? '').match(/https:\/\/\S+/g) ?? [])
        expect(url, post.id).toMatch(
          /^https:\/\/(github\.com\/google-gemini\/gemini-cli\/|www\.npmjs\.com\/package\/|code\.claude\.com\/docs\/|developers\.googleblog\.com\/)/,
        )
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

  it('keeps the batch 6 product posts to the availability and wording rules', () => {
    const b6 = draftPosts.filter((p) => p.id.startsWith('wd-b6-'))
    expect(b6).toHaveLength(3)
    for (const post of b6) {
      expect(post.topics, post.id).toContain('product')
      expect(post.text.trim().endsWith('Free on the App Store.'), post.id).toBe(true)
      expect(post.text, post.id).not.toMatch(
        /\bPro\b|£|\$|Play Store|Google Play|Android|GitHub|Shelgaon|part-time|sponsor|\b\d+\.\d+\.\d+\b|—|–|#/,
      )
    }
  })

  it('keeps the audit wording rules: no "my app", no show-off lines, no version numbers, no repeats', () => {
    for (const post of draftPosts) {
      expect(post.text, post.id).not.toMatch(
        /\bmy (own )?app\b|\bmy own\b|\bour own\b|own artwork|own figures|\bmy (rep |row )?counter\b|\bmy row\b|Android version I'm porting/i,
      )
      expect(post.text, post.id).not.toMatch(/\b\d+\.\d+\.\d+\b|\bversion \d/i)
      expect(post.text, post.id).not.toMatch(/part \d of \d/i)
    }
    const p1 = draftPosts.find((p) => p.id === 'wd-b4-p1')
    expect(p1?.text.startsWith('Workout Director counts squats')).toBe(true)
    expect(p1?.text).not.toMatch(/RDL|Skull Crusher/)
    expect(draftPosts.find((p) => p.id === 'wd-b4-tech1')?.text).not.toMatch(/recorded, saved or uploaded/)
    // The first-rep wait is told in wd-b3-6 only.
    const wait = draftPosts.filter((p) =>
      /first rep (the counter accepts )?waits|holds the first rep|held for up to 8|waits 5\.48/.test(p.text),
    )
    expect(wait.map((p) => p.id)).toEqual(['wd-b3-6'])
    // Every engineering post carries the Technical tag; product, figures and charts posts don't need it.
    for (const post of draftPosts)
      if (post.topics.some((t) => ['rep-counter', 'pose-model', 'coach', 'releases', 'trainer-chat'].includes(t)))
        expect(post.topics.includes('technical') || post.topics.includes('product'), post.id).toBe(true)
  })

  it('filters by topic, status and text, and groups by topic', () => {
    const none = parseFilters('')
    expect(draftPosts.every((p) => matches(p, none))).toBe(true)
    const coach = draftPosts.filter((p) => matches(p, parseFilters('?topic=coach')))
    expect(coach.map((p) => p.id).sort()).toEqual(['wd-b3-4', 'wd-b3-5'])
    // One status for every cross-checked post: Ready to post. The rest wait for media.
    expect(parseFilters('?status=checked').status).toEqual([])
    // After the 3 Nov audit pass and its re-check, every post not waiting for media is Ready; no cross-check status is left.
    // The Data posts (not Workout Director posts, so no WD cross-check) have their own status, Data check.
    expect(Object.keys(statuses).sort()).toEqual(['data-check', 'needs-check', 'ready', 'waiting'])
    expect(parseFilters('?status=checking').status).toEqual([])
    const ready = draftPosts.filter((p) => matches(p, parseFilters('?status=ready')))
    expect(ready).toHaveLength(26)
    expect(ready.map((p) => p.id)).not.toContain('wd-b2-3')
    for (const post of draftPosts) expect(post.version, post.id).not.toMatch(/awaiting/)
    const waiting = draftPosts.filter((p) => matches(p, parseFilters('?status=waiting')))
    expect(waiting.map((p) => p.id).sort()).toEqual(['ai-1', 'ai-3', 'ai-7', 'wd-b2-3'])
    expect(draftPosts.filter((p) => matches(p, parseFilters('?q=app_update_required'))).map((p) => p.id)).toEqual([
      'wd-b2-2',
    ])
    const grouped = arrange(draftPosts, parseFilters('?sort=topic'))
    expect(grouped.reduce((n, g) => n + g.posts.length, 0)).toBe(41)
    const newest = arrange(draftPosts, none)[0]?.posts ?? []
    expect((newest[0]?.updated ?? '') >= (newest.at(-1)?.updated ?? '')).toBe(true)
  })
})

describe('compact LinkedIn paste text', () => {
  it('every post with real text uses a compact paste body and keeps the longer version', () => {
    for (const post of draftPosts) {
      if (post.textNote || compactWithheld.has(post.id)) {
        expect(post.longerText, post.id).toBeUndefined()
        continue
      }
      expect(compactTexts[post.id], post.id).toBe(post.text)
      expect(post.longerText, post.id).toBeTruthy()
      expect(post.longerText, post.id).not.toBe(post.text)
      expect(post.chars, post.id).toBe([...post.text].length)
      expect(post.length, post.id).toBe(lengthOf(post.chars))
      expect(post.text, post.id).not.toMatch(/alongside/i)
      // StatMuse stacks use a few blank-line blocks; TechDevNotes is usually one.
      expect(post.text.split('\n\n').length, post.id).toBeLessThanOrEqual(2)
    }
  })

  it('covers every board id except withheld placeholders', () => {
    const ids = draftPosts.filter((p) => !p.textNote && !compactWithheld.has(p.id)).map((p) => p.id)
    expect(Object.keys(compactTexts).sort()).toEqual([...ids].sort())
  })

  it('rejects wrap-up phrases that read like AI mannerisms', () => {
    for (const post of draftPosts) {
      if (post.textNote || compactWithheld.has(post.id)) continue
      const lower = post.text.toLowerCase()
      for (const phrase of compactBannedPhrases) {
        expect(lower.includes(phrase), `${post.id} contains "${phrase}"`).toBe(false)
      }
    }
  })
})

describe('post voice: apostrophes and Oxford commas', () => {
  const bodies = (): { id: string; kind: string; text: string }[] => {
    const out: { id: string; kind: string; text: string }[] = []
    for (const [id, text] of Object.entries(compactTexts)) out.push({ id, kind: 'compact', text })
    for (const post of draftPosts) {
      if (post.textNote || compactWithheld.has(post.id)) continue
      out.push({ id: post.id, kind: 'compact-paste', text: post.text })
      if (post.longerText) out.push({ id: post.id, kind: 'longer', text: post.longerText })
    }
    return out
  }

  it('uses a curly apostrophe inside words, never a straight one', () => {
    const straight = /[A-Za-z]'[A-Za-z]/
    for (const { id, kind, text } of bodies()) {
      expect(text, `${kind} ${id}`).not.toMatch(straight)
    }
  })

  it('has no Oxford comma before the final and/or in a list', () => {
    const oxford = /, (and|or) /g
    for (const { id, kind, text } of bodies()) {
      for (const match of text.matchAll(oxford)) {
        const at = match.index ?? -1
        expect(at, `${kind} ${id}`).toBeGreaterThanOrEqual(0)
        const from = text.slice(at)
        const allowed = oxfordCommaAllowlist.some((prefix) => from.startsWith(prefix))
        expect(allowed, `${kind} ${id}: ${JSON.stringify(from.slice(0, 60))}`).toBe(true)
      }
    }
  })
})

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { renderDiagram, readFrontmatter } from '../../plugins/content'
import { findBanned, loadLocalTerms, localTermsFile } from '~/content/rules'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : [path]
  })
}

const sources = [...files('content'), ...files('src'), ...files('public'), 'README.md', 'DEPLOY.md', 'STACK.md'].filter(
  (f) => /\.(mdx|mmd|ts|tsx|css|md)$/.test(f) && !f.endsWith('rules.ts') && !f.endsWith('routeTree.gen.ts'),
)

describe('content rules', () => {
  it('flags the things that must not appear', () => {
    expect(findBanned('a realtime model from OpenAI', [])).not.toEqual([])
    expect(findBanned('worked at xAI', [])).not.toEqual([])
    expect(findBanned('SpaceXSI (formerly xAI)', [])).toEqual([])
    expect(findBanned('cut costs by 20%', [])).not.toEqual([])
    expect(findBanned('call +44 1234 567890', [])).not.toEqual([])
    expect(findBanned('date of birth', [])).not.toEqual([])
    expect(findBanned('published on the App Store', [])).toEqual([])
  })

  it('reads extra terms from a local list', () => {
    expect(findBanned('alpha beta', [/beta/i])).toEqual(['matches line 1 of the local terms list'])
    expect(findBanned('alpha', [/beta/i])).toEqual([])
  })

  it.each(sources)('%s has none of them', (file) => {
    expect(findBanned(readFileSync(file, 'utf8'))).toEqual([])
  })

  it('shows the SpaceXSI role as Quality Assurance Engineer, Jan 2026 to Oct 2026, with no employment type', async () => {
    const { roles } = await import('~/content/work')
    const role = roles.find((r) => r.org.includes('SpaceXSI'))
    expect(role?.when).toBe('Jan 2026 to Oct 2026')
    expect(role?.role).toBe('Quality Assurance Engineer')
  })

  it.each(sources)('%s never calls any role part-time', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/part[\s-]?time/i)
  })

  const localTerms = loadLocalTerms()
  it.skipIf(!localTerms)('sources match none of the local terms', () => {
    const all = sources.map((f) => readFileSync(f, 'utf8')).join('\n')
    expect(findBanned(all, localTerms ?? [])).toEqual([])
  })
  if (!localTerms) console.info(`Local terms list not found at ${localTermsFile}; skipping that check.`)
})

describe('diagrams', () => {
  it.each(files('content/diagrams'))('%s renders without inline styles and with a title', (file) => {
    const diagram = renderDiagram(readFileSync(file, 'utf8'), 'dx')
    expect(diagram.svg).not.toMatch(/style=|<style|<script/i)
    expect(diagram.svg).toMatch(/role="img" aria-labelledby="dx-title"/)
    expect(diagram.svg).toContain('<title id="dx-title">')
    expect(diagram.width).toBeGreaterThan(100)
  })
})

describe('readFrontmatter', () => {
  it('reads YAML at the top of an MDX file', () => {
    expect(readFrontmatter('---\ntitle: Hello\npart: 2\n---\n\nBody')).toEqual({ title: 'Hello', part: 2 })
    expect(readFrontmatter('No frontmatter')).toEqual({})
  })
})

describe('brand rules', () => {
  const prose = [
    ...files('content'),
    ...files('src/content'),
    ...files('src/routes'),
    ...files('src/components'),
  ].filter((f) => /\.(mdx|mmd|ts|tsx)$/.test(f))

  it.each(prose)('%s has no em or en dashes', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/[\u2013\u2014]/)
  })

  it.each(prose)('%s has no job-seeking or visa wording', (file) => {
    expect(readFileSync(file, 'utf8')).not.toMatch(/sponsor|\bvisa\b|open to work|available now|available immediately/i)
  })

  it.each(files('content').filter((f) => f.endsWith('.mdx')))('%s uses the word AI at most once', (file) => {
    expect(readFileSync(file, 'utf8').match(/\bAI\b/g)?.length ?? 0).toBeLessThanOrEqual(1)
  })

  it('leads the Workout Director screens with the push-up set on the live camera', async () => {
    const { shownScreenIds } = await import('~/content/workoutDirectorScreens')
    const { workoutDirectorHero } = await import('~/content/projects')
    expect(shownScreenIds[0]).toBe('02-voice')
    expect(workoutDirectorHero.ipad).toBe('02-voice')
  })

  it('credits the stock footage wherever a camera screen is shown', async () => {
    const { hasFootage, footageCredit } = await import('~/content/workoutDirectorScreens')
    expect(hasFootage(['02-voice'])).toBe(true)
    expect(hasFootage(['04-manual', '07-progress'])).toBe(false)
    expect(footageCredit(['02-voice', '04-manual'])).toBe('Footage: Mixkit, free licence.')
    expect(footageCredit(['02-voice-pexels', '04-manual', '07-progress'])).toBe('Footage: cottonbro studio on Pexels.')
    expect(footageCredit(['02-voice', '02-voice-pexels'])).toBe(
      'Footage: Mixkit, free licence; cottonbro studio on Pexels.',
    )
    expect(footageCredit(['04-manual', '07-progress'])).toBe('')
    expect(footageCredit(['pushup-mixkit', 'deadlift-pexels'])).toBe(
      'Footage: Mixkit, free licence; cottonbro studio on Pexels.',
    )
  })

  it('shows no light Kalo screenshots next to the dark Workout Director screens', async () => {
    const { kaloCard } = await import('~/content/projects')
    expect(kaloCard.shots ?? []).toEqual([])
  })

  it('shows the MSc dates and when the Paythru role ended', async () => {
    const { roles } = await import('~/content/work')
    expect(roles.find((r) => r.org.startsWith('Kingston'))?.when).toBe('Sep 2021 to Sep 2022')
    expect(roles.find((r) => r.org.startsWith('Paythru'))?.paragraphs.join(' ')).toContain(
      'My role at Paythru ended in October 2026.',
    )
  })
})

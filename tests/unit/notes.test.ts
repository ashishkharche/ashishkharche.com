import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { comingNotes, noteListSummary, sortNotes, toNote, type Note, noteSummary } from '~/content/notes'

const base = { title: 'T', date: '2026-10-30', series: 'S', part: 1, listLabel: 'L', description: 'D' }

describe('toNote', () => {
  it('derives the slug and path from the file name', () => {
    const note = toNote('../../content/notes/workout-director-1.mdx', base)
    expect(note.slug).toBe('workout-director-1')
    expect(note.path).toBe('/notes/workout-director-1/')
  })
  it('rejects missing or malformed frontmatter', () => {
    expect(() => toNote('a/b.mdx', { ...base, title: '' })).toThrow(/title/)
    expect(() => toNote('a/b.mdx', { ...base, date: '30 Oct 2026' })).toThrow(/date/)
    expect(() => toNote('a/b.mdx', { ...base, part: '1' })).toThrow(/part/)
    expect(() => toNote('a/Bad Name.mdx', base)).toThrow(/file name/)
  })
})

describe('sortNotes', () => {
  it('puts the newest first, then by part', () => {
    const make = (slug: string, date: string, part: number): Note => ({
      ...base,
      slug,
      path: `/notes/${slug}/`,
      date,
      part,
    })
    const sorted = sortNotes([make('a', '2026-01-01', 1), make('c', '2026-03-01', 2), make('b', '2026-03-01', 1)])
    expect(sorted.map((n) => n.slug)).toEqual(['b', 'c', 'a'])
  })
})

describe('notes in content/notes', () => {
  it('all load with valid frontmatter', async () => {
    const { notes } = await import('~/content/notes')
    expect(notes.length).toBeGreaterThan(0)
    expect(notes[0]?.slug).toBe('reflex')
  })
})

describe('noteSummary', () => {
  it('keeps the first sentence', () => {
    expect(noteSummary({ description: 'Part 1: one thing. Then more detail.' })).toBe('Part 1: one thing.')
  })
  it('returns the whole text when there is one sentence', () => {
    expect(noteSummary({ description: 'No full stop here' })).toBe('No full stop here')
  })
})

describe('the Workout Director series', () => {
  it('lists the same coming parts in part 1 as on the notes page', () => {
    const body = readFileSync('content/notes/workout-director-1.mdx', 'utf8')
    const section = body.slice(body.indexOf('## Next in the series'))
    const listed = [...section.matchAll(/^- Part \d+: (.+)$/gm)].map((match) => match[1])
    expect(listed).toEqual(comingNotes)
  })
})

describe('noteListSummary', () => {
  it('drops the series label and capitalises the rest', () => {
    const note = {
      listLabel: 'Workout Director, part 1',
      description: 'Workout Director, part 1: the camera feed never leaves the iPhone. More text.',
    }
    expect(noteListSummary(note)).toBe('The camera feed never leaves the iPhone.')
  })

  it('keeps a summary without the label as it is', () => {
    expect(noteListSummary({ listLabel: 'Part 1', description: 'Something else. More.' })).toBe('Something else.')
  })
})

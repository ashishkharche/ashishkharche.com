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
    expect(notes[0]?.slug).toBe('workout-director-1')
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

const noteFiles = ['content/notes/workout-director-1.mdx', 'content/notes/workout-director-2.mdx'] as const

/** Prose of a note MDX file: frontmatter and body with fenced code removed. */
function noteProse(path: string): string {
  return readFileSync(path, 'utf8').replace(/```[\s\S]*?```/g, '\n')
}

/**
 * Clause-joining ", and " / ", or " in the Workout Director notes that are not
 * Oxford list commas. Mirrored from the drafts voice tests.
 */
const noteOxfordAllowlist = [
  ', and 3D "world" landmarks i',
  ', and MediaPipe has a switch',
  ', and MediaPipe’s Pose Landm',
  ', and a barbell row is not r',
  ', and a few behaviours aroun',
  ', and a pole vector says whi',
  ', and a setup check before t',
  ', and always if the user men',
  ', and at first a single move',
  ', and changes to the counter',
  ', and compared with the refe',
  ', and corrective shape keys ',
  ', and counting keeps going f',
  ', and each function is bundl',
  ', and each line set picks so',
  ', and every rep would depend',
  ', and ids written with under',
  ', and it does not go into th',
  ', and it has not been adopte',
  ', and it is given the last f',
  ', and it tries again about a',
  ', and its data is in Postgre',
  ', and its render still faile',
  ', and later reps are judged ',
  ', and only the measurements ',
  ', and secondary muscles get ',
  ', and so is talking with you',
  ', and spec variants can be s',
  ', and the 2D joint angles ar',
  ', and the cut is pushed in b',
  ', and the model can only req',
  ', and the reply is spoken.\n\n',
  ', and they rarely have a mat',
  ', and use photos only to mea',
  ', and which data goes over t',
  ', or runs below 12 frames a ',
  ', or the hips are already up',
  ', or when the set ends with ',
] as const

describe('note voice: apostrophes, Oxford commas and banned words', () => {
  it('uses a curly apostrophe inside words, never a straight one', () => {
    const straight = /[A-Za-z]'[A-Za-z]/
    for (const path of noteFiles) {
      expect(noteProse(path), path).not.toMatch(straight)
    }
  })

  it('has no Oxford comma before the final and/or in a list', () => {
    const oxford = /, (and|or) /g
    for (const path of noteFiles) {
      const text = noteProse(path)
      for (const match of text.matchAll(oxford)) {
        const at = match.index ?? -1
        expect(at, path).toBeGreaterThanOrEqual(0)
        const from = text.slice(at)
        const allowed = noteOxfordAllowlist.some((prefix) => from.startsWith(prefix))
        expect(allowed, `${path}: ${JSON.stringify(from.slice(0, 60))}`).toBe(true)
      }
    }
  })

  it('never says alongside', () => {
    for (const path of noteFiles) {
      expect(noteProse(path), path).not.toMatch(/alongside/i)
    }
  })
})

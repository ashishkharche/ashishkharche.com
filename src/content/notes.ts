export interface NoteFrontmatter {
  title: string
  date: string
  series: string
  part: number
  listLabel: string
  description: string
}

export interface Note extends NoteFrontmatter {
  slug: string
  path: string
}

/** Checks a note's frontmatter and fills in its slug and path. */
export function toNote(file: string, frontmatter: Record<string, unknown>): Note {
  const slug = file
    .split('/')
    .pop()
    ?.replace(/\.mdx$/, '')
  if (!slug || !/^[a-z0-9-]+$/.test(slug)) throw new Error(`Bad note file name: ${file}`)
  const required = ['title', 'date', 'series', 'listLabel', 'description'] as const
  for (const key of required) {
    if (typeof frontmatter[key] !== 'string' || frontmatter[key] === '') {
      throw new Error(`Note ${slug} is missing "${key}" in its frontmatter`)
    }
  }
  if (typeof frontmatter.part !== 'number') throw new Error(`Note ${slug} is missing "part"`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.date as string)) {
    throw new Error(`Note ${slug} has a date that is not YYYY-MM-DD`)
  }
  return { ...(frontmatter as unknown as NoteFrontmatter), slug, path: `/notes/${slug}/` }
}

/** Newest first; notes on the same day are ordered by series part. */
export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.date.localeCompare(a.date) || a.part - b.part)
}

// Only the frontmatter is imported here, so listing pages do not pull in note bodies.
const frontmatters = import.meta.glob<Record<string, unknown>>('../../content/notes/*.mdx', {
  eager: true,
  query: '?frontmatter',
  import: 'default',
})

export const notes: Note[] = sortNotes(
  Object.entries(frontmatters).map(([file, frontmatter]) => toNote(file, frontmatter)),
)

/** The first sentence of a note's description, for one-line lists. */
export function noteSummary(note: Pick<Note, 'description'>): string {
  const end = note.description.search(/[.!?](\s|$)/)
  return end === -1 ? note.description : note.description.slice(0, end + 1)
}

/**
 * The summary for a note in a list that already shows its series label: the
 * first sentence of the description without the leading "Workout Director,
 * part 1: ", starting with a capital letter.
 */
export function noteListSummary(note: Pick<Note, 'description' | 'listLabel'>): string {
  const summary = noteSummary(note)
  const prefix = `${note.listLabel}: `
  if (!summary.startsWith(prefix)) return summary
  const rest = summary.slice(prefix.length)
  return rest.charAt(0).toUpperCase() + rest.slice(1)
}

export function getNote(slug: string): Note | undefined {
  return notes.find((note) => note.slug === slug)
}

/** Parts of the Workout Director series that are planned but not written yet. */
export const comingNotes = [
  'Comparing pose models for on-device tracking on the iPhone',
  'How the rep counter rejects movements that are not reps',
  'How changes to rep counting are tested before release',
  'How the voice coach requests workout changes through tool calls',
  'How the TypeScript backend on AWS Lambda is structured',
  'Releasing updates without breaking older phones',
  'Design decisions to revisit in Workout Director',
]

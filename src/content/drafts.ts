import type { LiImage } from '~/content/linkedinV11Li'
import { liDrafts } from '~/content/linkedinV11Li'
import { liSamples } from '~/content/linkedinSamples'
import { wdBatch2, type WdBatchPost } from '~/content/linkedinWdBatch2'
import { wdBatch3 } from '~/content/linkedinWdBatch3'

/**
 * The private drafts board: one current version of each LinkedIn draft, with what the filters need.
 * The page lives at an unlinked path (draftsPath), is not in the sitemap, the feed or robots.txt, and tells
 * search engines not to index it (a robots meta tag here and an X-Robots-Tag header in vercel.json).
 * Earlier versions (v1 to v11 of D1 to D3, Sample B, the Side Bridge sample and the rejected batch 2
 * variants) are not shown; they stay in git history.
 */
export const draftsSlug = 'ixixlepdu'
export const draftsPath = `/drafts/${draftsSlug}/`

export const topics = {
  'workout-director': 'Workout Director',
  'rep-counter': 'Rep counter',
  'pose-model': 'Pose model',
  coach: 'Voice coach',
  'trainer-chat': 'Trainer chat',
  releases: 'Releases and updates',
  figures: 'Exercise figures',
  charts: 'App Store charts',
} as const
export type Topic = keyof typeof topics
export const topicOrder = Object.keys(topics) as Topic[]

export const mediaTypes = { image: 'Image', diagram: 'Diagram or chart', text: 'Text only' } as const
export type Media = keyof typeof mediaTypes

export const lengths = {
  short: 'Short (under 800)',
  medium: 'Medium (800 to 1,500)',
  long: 'Long (over 1,500)',
} as const
export type Length = keyof typeof lengths

export const statuses = { ready: 'Ready', waiting: 'Waiting for media' } as const
export type Status = keyof typeof statuses

/** Length bands, in characters of the paste text. */
export function lengthOf(chars: number): Length {
  return chars < 800 ? 'short' : chars <= 1500 ? 'medium' : 'long'
}

export interface DraftPost {
  /** Anchor on the page, such as wd-b3-1. */
  id: string
  /** Short name used in the index. */
  title: string
  /** Where the post comes from, such as "WD batch 3, post 1". */
  series: string
  /** The version shown, such as "v12e". */
  version: string
  /** When this version was last changed, ISO UTC, for sorting. */
  updated: string
  /** The same time for people, London time. */
  updatedLabel: string
  topics: Topic[]
  /** The first topic after Workout Director, used to group the list when sorting by topic. */
  primary: Topic
  media: Media[]
  status: Status
  chars: number
  length: Length
  text: string
  /** Set when the card shows a note in place of the real text. */
  textNote?: string
  images: LiImage[]
  concept?: string
  mediaNote?: string
  firstComment?: string
  sources: string[]
  /** Review notes: what this version replaces, overlaps with other posts, what is still open. */
  notes: string[]
}

type Extra = Pick<DraftPost, 'title' | 'series' | 'version' | 'updated' | 'updatedLabel' | 'topics' | 'media'> & {
  notes?: string[]
}

function make(
  base: Omit<DraftPost, 'primary' | 'length' | 'status' | 'notes'> & { notes?: string[]; waiting?: boolean },
): DraftPost {
  const primary = base.topics.find((t) => t !== 'workout-director') ?? base.topics[0] ?? 'workout-director'
  const { waiting, notes, ...rest } = base
  return {
    ...rest,
    primary,
    length: lengthOf(base.chars),
    status: waiting ? 'waiting' : 'ready',
    notes: notes ?? [],
  }
}

const nov2 = (time: string) => ({ updated: `2026-11-02T${time}:00Z`, updatedLabel: `2 Nov 2026, ${time} GMT` })
const nov3 = (time: string) => ({ updated: `2026-11-03T${time}:00Z`, updatedLabel: `3 Nov 2026, ${time} GMT` })

const dExtra: Record<(typeof liDrafts)[number]['id'], Extra> = {
  'tue-3-nov': {
    title: 'D1: a deadlift counted from one hip angle',
    series: 'D1, slot Tue 3 Nov',
    version: 'v12e',
    ...nov2('18:27'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: [
      'Replaces v1, v1.1, v3, v4, v6.1, v7, v7.1, v7.2, v8, v9, v11 and v12 to v12d of D1.',
      'Overlaps with WD batch 3, post 1 on the 12 % top line rule.',
    ],
  },
  'thu-5-nov': {
    title: 'D2: picking a pose model for a phone',
    series: 'D2, slot Thu 5 Nov',
    version: 'v12e',
    ...nov2('18:27'),
    topics: ['workout-director', 'pose-model', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: ['Replaces v1, v1.1, v2, v2.1, v3, v4, v6.1, v7, v7.1, v7.2, v8, v9, v11 and v12 to v12d of D2.'],
  },
  'mon-9-nov': {
    title: 'D3: cutting false reps, part 3 of 3',
    series: 'D3, slot Mon 9 Nov',
    version: 'v11 (unchanged in v12)',
    ...nov2('14:37'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: [
      'Replaces v1 to v9 of D3. v12 changed only D1 and D2, so v11 is the latest D3 text.',
      'The planned 11 slide document is not made yet; until then it is a two image post.',
      'Overlaps with WD batch 3, post 6 on the 8 s first rep hold.',
    ],
  },
}

const fromV11 = liDrafts.map((d) =>
  make({
    id: `d${d.n}`,
    chars: d.chars,
    text: d.text,
    images: d.images,
    mediaNote: d.why,
    sources: d.images.flatMap((img) => (img.note ? [`${img.name}: ${img.note}`] : [])),
    ...dExtra[d.id],
  }),
)

const sampleA = liSamples.map((s) =>
  make({
    id: s.id,
    title: 'Sample A: two apps on the US Top Free chart',
    series: 'Sample A',
    version: 'v12c',
    ...nov2('17:17'),
    topics: ['charts'],
    media: ['diagram'],
    chars: s.chars ?? 0,
    text: s.text,
    textNote: 'The real text is not shown here (its data source is on the blocked terms list).',
    images: s.images,
    firstComment: s.firstComment,
    sources: ['/workspace/linkedin-samples/personal/SOURCES.md (Sample A).'],
    notes: [
      'Paste the text from /workspace/linkedin-samples/personal/sample-a-post.txt.',
      'Replaces the v12 and v12b images (re-rendered in v12c without the Source and Fetched lines).',
    ],
  }),
)

const batchExtra: Record<string, Extra> = {
  'wd-b2-1': {
    title: 'When the voice coach may talk',
    series: 'WD batch 2, post 1',
    version: 'batch 2, rewritten from code',
    ...nov3('14:45'),
    topics: ['workout-director', 'coach'],
    media: ['text'],
    notes: [
      'Replaces the rejected v1 ("one line per set", wrong) and its designed card.',
      'Overlaps with WD batch 3, post 5: the same gap and per-set cap numbers. Batch 3 post 5 is newer and has an image; this one adds the recorded clips, the quiet last three reps and the rest tip. Pick one.',
    ],
  },
  'wd-b2-2': {
    title: 'How an old build is asked to update',
    series: 'WD batch 2, post 2',
    version: 'batch 2, Pele diagram',
    ...nov3('14:45'),
    topics: ['workout-director', 'releases'],
    media: ['diagram'],
    notes: ['Replaces the rejected designed diagram.'],
  },
  'wd-b2-3': {
    title: 'What one trainer chat message carries',
    series: 'WD batch 2, post 3',
    version: 'batch 2',
    ...nov3('14:03'),
    topics: ['workout-director', 'trainer-chat'],
    media: ['text'],
    notes: ['Replaces the rejected designed bento.'],
  },
  'wd-b2-4': {
    title: 'Exercise figures from one 3D body',
    series: 'WD batch 2, post 4',
    version: 'batch 2, shipped figures',
    ...nov3('14:45'),
    topics: ['workout-director', 'figures'],
    media: ['image'],
    notes: ['Replaces the rejected designed figure images and in-app mock.'],
  },
  'wd-b2-5': {
    title: 'The side-on deadlift fix, before and after',
    series: 'WD batch 2, post 5',
    version: 'batch 2, WD Marketing image, trimmed 3 Nov',
    ...nov3('17:30'),
    topics: ['workout-director', 'rep-counter', 'pose-model'],
    media: ['image', 'diagram'],
    notes: [
      'Trimmed 3 Nov 17:30 GMT: the paragraphs that repeated the image in numbers were replaced by one line that points at the image.',
      'Replaces the rejected v1 text and its recall chart.',
      'Overlaps with WD batch 3, post 2 (the 3 s ankle hold) and post 3 (the same Lite and Full recall numbers).',
    ],
  },
  'wd-b2-6': {
    title: 'One deadlift set as the counter sees it',
    series: 'WD batch 2, post 6',
    version: 'batch 2, WD Marketing image, trimmed 3 Nov',
    ...nov3('17:30'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: [
      'Trimmed 3 Nov 17:30 GMT: the paragraphs that repeated the image in numbers were replaced by one line that points at the image.',
      'Replaces the rejected v1 text and its hip trace.',
      'Overlaps with WD batch 3, post 6: the same clip and times (12.40 s, 17.88 s, count 2).',
    ],
  },
  'wd-b3-1': {
    title: 'The counting lines for each move',
    series: 'WD batch 3, post 1',
    version: 'batch 3',
    ...nov3('15:52'),
    topics: ['workout-director', 'rep-counter'],
    media: ['diagram'],
  },
  'wd-b3-2': {
    title: 'When the plate hides the ankle',
    series: 'WD batch 3, post 2',
    version: 'batch 3, trimmed 3 Nov',
    ...nov3('17:30'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: [
      'Trimmed 3 Nov 17:30 GMT: the paragraphs that repeated the image in numbers were replaced by one line that points at the image.',
    ],
  },
  'wd-b3-4': {
    title: 'When the voice coach drops',
    series: 'WD batch 3, post 4',
    version: 'batch 3, trimmed 3 Nov',
    ...nov3('17:30'),
    topics: ['workout-director', 'coach'],
    media: ['diagram'],
    notes: [
      'Trimmed 3 Nov 17:30 GMT: the paragraphs that repeated the image in numbers were replaced by one line that points at the image.',
      'Replaces Sample B (the coach reconnect sample, never posted). Sample B said the app shows no reconnecting message; the code at a0d27a7e shows "Coach reconnecting · counts still on".',
    ],
  },
  'wd-b3-5': {
    title: 'How often the voice coach speaks up',
    series: 'WD batch 3, post 5',
    version: 'batch 3, rewritten from the corrected README, trimmed 3 Nov',
    ...nov3('17:30'),
    topics: ['workout-director', 'coach'],
    media: ['diagram'],
    notes: [
      'Trimmed 3 Nov 17:30 GMT: the paragraphs that repeated the image in numbers were replaced by one line that points at the image.',
      'Overlaps with WD batch 2, post 1 (see there).',
    ],
  },
  'wd-b3-6': {
    title: 'A first rep waits for a second',
    series: 'WD batch 3, post 6',
    version: 'batch 3, trimmed 3 Nov',
    ...nov3('17:30'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: [
      'Trimmed 3 Nov 17:30 GMT: the paragraphs that repeated the image in numbers were replaced by one line that points at the image.',
    ],
  },
}

function fromBatch(post: WdBatchPost): DraftPost {
  const extra = batchExtra[post.id]
  if (!extra) throw new Error(`No board details for ${post.id}`)
  return make({
    id: post.id,
    chars: post.chars,
    text: post.text,
    images: post.images,
    concept: post.concept,
    mediaNote: post.mediaPending ?? post.media,
    sources: [...post.sources, ...post.images.flatMap((img) => (img.note ? [`${img.name}: ${img.note}`] : []))],
    waiting: post.mediaPending !== undefined,
    ...extra,
  })
}

const liteVsFull =
  "Same deadlift reps, same counter, two pose models. On the MyDeadlift clips (CC BY 4.0), BlazePose Full found 115 of 191 barbell deadlift reps (0.602) and Lite found 106 (0.555). Neither added a rep that wasn't there.\n\nRecall is low for both partly because the clips are single reps joined end to end, with a cut between reps.\n\nThis was measured on the counter build after the deadlift fix and hasn't been re-run since."

/** Batch 3 post 3 has no image (WD Marketing dropped it), so it waits for media. Text from post-03-lite-vs-full.txt. */
const b3post3 = make({
  id: 'wd-b3-3',
  title: 'Lite against Full on the same deadlift reps',
  series: 'WD batch 3, post 3',
  version: 'batch 3',
  ...nov3('15:38'),
  topics: ['workout-director', 'pose-model', 'rep-counter'],
  media: ['text'],
  chars: [...liteVsFull].length,
  text: liteVsFull,
  images: [],
  concept: 'Two pose models on the same deadlift reps: recall for BlazePose Full and Lite after the deadlift fix',
  mediaNote: 'Media pending: WD Marketing dropped the image for this post.',
  waiting: true,
  sources: [
    'wd-share/blog-data/batch-3/03-lite-vs-full/README.md:4 (Full 0.602, 115 of 191; Lite 0.555, 106 of 191; barbell, counter after PR #322), :2 (no extra reps either way), :11 (single rep clips joined with a cut), :7 (not re-run at main).',
    'Caveats kept: no timing comparison (Mac times only), the Romanian row left out, MyDeadlift credited as CC BY 4.0.',
  ],
  notes: ['Shares its recall numbers with WD batch 2, post 5.'],
})

const b2 = wdBatch2.map(fromBatch)
const b3 = wdBatch3.map(fromBatch)
const b3Ordered = [...b3.slice(0, 2), b3post3, ...b3.slice(2)]

/** Every post on the board, in the order they were written. */
export const draftPosts: DraftPost[] = [...fromV11, ...sampleA, ...b2, ...b3Ordered]

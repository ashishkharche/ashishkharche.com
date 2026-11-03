import type { LiImage } from '~/content/linkedinV11Li'
import { liDrafts } from '~/content/linkedinV11Li'
import { liSamples } from '~/content/linkedinSamples'
import { wdBatch2, type WdBatchPost } from '~/content/linkedinWdBatch2'
import { wdBatch3 } from '~/content/linkedinWdBatch3'
import { wdBatch4 } from '~/content/linkedinWdBatch4'

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
  product: 'Product',
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

/** Ready to post means cross-checked by WD Engineering and WD Marketing (3 Nov); every post not waiting for media is. */
export const statuses = {
  ready: 'Ready to post',
  waiting: 'Waiting for media',
} as const
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
  images: DraftImage[]
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

/**
 * Posts revised on 3 Nov from /workspace/linkedin-samples/personal/revised-2026-11-03 after the WD Engineering and
 * WD Marketing cross-checks, the three batch 4 posts (wd-batch-4, cross-checked the same day), and wd-b2-6, which
 * passed both reviews unchanged. They show as ready to post unless they still wait for media.
 */
const crossChecked = new Set([
  'd1',
  'd2',
  'd3',
  'sample-a',
  'wd-b2-1',
  'wd-b2-2',
  'wd-b2-4',
  'wd-b2-5',
  'wd-b2-6',
  'wd-b3-1',
  'wd-b3-2',
  'wd-b3-4',
  'wd-b3-5',
  'wd-b3-6',
  'wd-b4-p1',
  'wd-b4-fig1',
  'wd-b4-tech1',
])
const checkedNote = 'Cross-checked by WD Engineering and WD Marketing, 3 Nov; see revised-2026-11-03/CHANGES.md.'
/** Every post's text was replaced on 3 Nov 19:57 GMT by its human-voice rewrite. */
const humanNote =
  'Text replaced 3 Nov 19:57 GMT with the human-voice rewrite (linkedin-samples/personal/human-2026-11-03/, with the WD Engineering and WD Marketing fixes and the Eng rulings; see its CHANGES.md). Older notes below describe earlier versions.'

/** Posts whose credit lines (video, pose landmarks, Pele, the goblet squat reference) were taken out of the text. */
const creditsRemoved = new Set([
  'd1',
  'wd-b2-2',
  'wd-b2-4',
  'wd-b2-5',
  'wd-b2-6',
  'wd-b3-1',
  'wd-b3-2',
  'wd-b3-6',
  'wd-b4-p1',
  'wd-b4-tech1',
])
const creditsNote =
  'Credit lines taken out of the post text on 3 Nov 19:15 GMT (Ashish’s call), so Copy for LinkedIn copies none. The credits stay in the sources below.'

/**
 * Full quality PNG copies of the page images, the files to upload to LinkedIn (the page shows smaller WebP copies).
 * They live in public/drafts/<slug>/img/, under the /drafts/ X-Robots-Tag noindex rule and out of the sitemap.
 * Each is the lossless original named in the image's upload path, copied byte for byte.
 */
export const draftsImagesPath = `${draftsPath}img/`
const pngNames: Record<string, string> = {
  '/assets/img/preview/d1-joints-and-hip-angle-nocount-v2.webp': 'd1-joints-and-hip-angle.png',
  '/assets/img/preview/v12c-sample-a-1-chart.webp': 'sample-a-chart.png',
  '/assets/img/preview/wd-b2-2-forced-update-v2.webp': 'wd-b2-2-forced-update.png',
  '/assets/img/preview/wd-b2-4-f1-goblet-squat-built-not-traced-v2.webp': 'wd-b2-4-1-goblet-squat.png',
  '/assets/img/preview/wd-b2-4-f2-deadlift-fixed-gates.webp': 'wd-b2-4-2-deadlift-fixed-gates.png',
  '/assets/img/preview/wd-b2-5-deadlift-fix-before-after-v4.webp': 'wd-b2-5-deadlift-fix-before-after.png',
  '/assets/img/preview/wd-b2-6-deadlift-rep1-refused.webp': 'wd-b2-6-deadlift-rep1-refused.png',
  '/assets/img/preview/wd-b3-1-one-angle-per-move-v3.webp': 'wd-b3-1-one-angle-per-move.png',
  '/assets/img/preview/wd-b3-2-plate-hides-the-ankle-v2.webp': 'wd-b3-2-plate-hides-the-ankle.png',
  '/assets/img/preview/wd-b3-4-coach-reconnect-backoff-v3.webp': 'wd-b3-4-coach-reconnect-backoff.png',
  '/assets/img/preview/wd-b3-5-coach-two-limits-v2.webp': 'wd-b3-5-coach-two-limits.png',
  '/assets/img/preview/wd-b3-6-first-rep-waits-v3.webp': 'wd-b3-6-first-rep-waits.png',
  '/assets/img/preview/wd-b4-p1-rep-counter-v2.webp': 'wd-b4-p1-rep-counter.png',
  '/assets/img/preview/wd-b4-fig1-bodyweight-squat-light-dark.webp': 'wd-b4-fig1-bodyweight-squat.png',
  '/assets/img/preview/wd-b4-tech1-counted-on-the-phone-v2.webp': 'wd-b4-tech1-counted-on-the-phone.png',
}
/** Shown under an image on this page only, never in the post text. */
const captions: Record<string, string> = {
  '/assets/img/preview/wd-b2-4-f1-goblet-squat-built-not-traced-v2.webp':
    "Goblet squat reference (one of several): 'Kettlebell Goblet Squat' by Taco Fleur, Wikimedia Commons, CC BY-SA 4.0.",
}

/** A page image with its full quality PNG download. */
export interface DraftImage extends LiImage {
  /** Where the PNG is served, under draftsImagesPath. */
  png: string
  /** The file name the browser saves it as. */
  pngName: string
  /** A credit or note shown under the image on this page, not part of the post. */
  caption?: string
}

function withPng(img: LiImage): DraftImage {
  const pngName = pngNames[img.src]
  if (!pngName) throw new Error(`No full quality PNG for ${img.src}`)
  const caption = captions[img.src]
  return { ...img, png: `${draftsImagesPath}${pngName}`, pngName, ...(caption ? { caption } : {}) }
}

function make(
  base: Omit<DraftPost, 'primary' | 'length' | 'status' | 'notes' | 'images'> & {
    images: LiImage[]
    notes?: string[]
    waiting?: boolean
  },
): DraftPost {
  const primary = base.topics.find((t) => t !== 'workout-director') ?? base.topics[0] ?? 'workout-director'
  const { waiting, notes, images, ...rest } = base
  if (!waiting && !crossChecked.has(base.id))
    throw new Error(`${base.id} is not waiting for media but not cross-checked`)
  const lead = [
    humanNote,
    ...(crossChecked.has(base.id) ? [checkedNote] : []),
    ...(creditsRemoved.has(base.id) ? [creditsNote] : []),
  ]
  return {
    ...rest,
    images: images.map(withPng),
    primary,
    length: lengthOf(base.chars),
    status: waiting ? 'waiting' : 'ready',
    notes: [...lead, ...(notes ?? [])],
  }
}

const nov3 = (time: string) => ({ updated: `2026-11-03T${time}:00Z`, updatedLabel: `3 Nov 2026, ${time} GMT` })

const dExtra: Record<(typeof liDrafts)[number]['id'], Extra> = {
  'tue-3-nov': {
    title: 'D1: a deadlift counted from one hip angle',
    series: 'D1, slot Tue 3 Nov',
    version: 'v13, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: [
      'v13: a rep that ends less than 1 s after the last one is refused; the lines adjust only once a rep of at least 15° has saved your range; an image and credit line added at the end.',
      'One image now: the v2 joints and hip angle render from saved landmark data. Image 2 (camera to reps) dropped.',
      'Replaces v1, v1.1, v3, v4, v6.1, v7, v7.1, v7.2, v8, v9, v11 and v12 to v12e of D1.',
      'Overlaps with WD batch 3, post 1 on the 12% top line rule.',
    ],
  },
  'thu-5-nov': {
    title: 'D2: picking a pose model for a phone',
    series: 'D2, slot Thu 5 Nov',
    version: 'v13, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'pose-model', 'rep-counter'],
    media: ['text'],
    notes: [
      'v13: says what the 72, 79 and 84 scores measure (joints within 5% of the person’s size on 156 COCO photos), that the 4 ms is on a desktop CPU, the 2 s warm-up, and that the Vision fallback lasts the rest of that workout.',
      'Text only now: both images dropped.',
      'Replaces v1, v1.1, v2, v2.1, v3, v4, v6.1, v7, v7.1, v7.2, v8, v9, v11 and v12 to v12e of D2.',
    ],
  },
  'mon-9-nov': {
    title: 'D3: cutting false reps, part 3 of 3',
    series: 'D3, slot Mon 9 Nov',
    version: 'v13 (trimmed), cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'rep-counter'],
    media: ['text'],
    notes: [
      'v13: trimmed to WD Marketing’s shorter version, with WD Engineering’s fix (under 0.5 s for squats and push-ups). The headings, references and several details were cut; WD Engineering verified them, so they could come back in a longer part 3.',
      'Text only for now: the checks bento dropped; the two rep trace waits for its Pexels creator.',
      'Replaces v1 to v11 of D3.',
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
    version: 'v13, cross-checked',
    ...nov3('19:57'),
    topics: ['charts'],
    media: ['diagram'],
    chars: s.chars ?? 0,
    text: s.text,
    textNote: 'The real text is not shown here (its data source is on the blocked terms list).',
    images: s.images,
    firstComment: s.firstComment,
    sources: [
      '/workspace/linkedin-samples/personal/SOURCES.md (Sample A).',
      '/workspace/linkedin-samples/personal/revised-2026-11-03/CHANGES.md (sample-a).',
    ],
    notes: [
      'Paste the text from /workspace/linkedin-samples/personal/human-2026-11-03/sample-a.txt.',
      'v13: the chart builder sentence names one store only, and the line pointing at the second image is gone.',
      'One image now: the v12c chart. Image 2 (the numbers table) dropped.',
    ],
  }),
)

const batchExtra: Record<string, Extra> = {
  'wd-b2-1': {
    title: 'When the voice coach may talk',
    series: 'WD batch 2, post 1',
    version: 'batch 2, revised 3 Nov, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'coach'],
    media: ['text'],
    notes: [
      'Revised 3 Nov: the cue list is given as examples, and the gap is for the standard talk setting, with what talk less and talk more do and what skips the gap.',
      'Replaces the rejected v1 ("one line per set", wrong) and its designed card.',
      'Overlaps with WD batch 3, post 5: the same gap and per-set cap numbers. Batch 3 post 5 is newer and has an image; this one adds the recorded clips, the quiet last three reps and the rest tip. Pick one.',
    ],
  },
  'wd-b2-2': {
    title: 'How an old build is asked to update',
    series: 'WD batch 2, post 2',
    version: 'batch 2, Pele diagram v2, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'releases'],
    media: ['diagram'],
    notes: [
      'Revised 3 Nov: the second paragraph no longer repeats the image (both paths, the saved answer, the offline relaunch); Pele credit added. Image is the v2 Pele render.',
      'Replaces the rejected designed diagram and the first Pele render.',
    ],
  },
  'wd-b2-3': {
    title: 'What one trainer chat message carries',
    series: 'WD batch 2, post 3',
    version: 'batch 2',
    ...nov3('19:57'),
    topics: ['workout-director', 'trainer-chat'],
    media: ['text'],
    notes: ['Replaces the rejected designed bento.'],
  },
  'wd-b2-4': {
    title: 'Exercise figures from one 3D body',
    series: 'WD batch 2, post 4',
    version: 'batch 2, revised 3 Nov, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'figures'],
    media: ['image'],
    notes: [
      'Revised 3 Nov: four claims WD Engineering could not verify were removed (no add-on, the JSON spec, the re-checks on backgrounds and crops, fingers through a handle); 115 exercises in light and dark added.',
      'Two images: the f1 v2 goblet squat figure (approved by Ashish 3 Nov, its CC BY-SA pose reference credit is a caption under the image on this page, not in the post text), then the f2 deadlift figure. The earlier 4a to 4e images are removed.',
      'Replaces the rejected designed figure images and in-app mock.',
    ],
  },
  'wd-b2-5': {
    title: 'The side-on deadlift fix, before and after',
    series: 'WD batch 2, post 5',
    version: 'batch 2, WD Marketing image v4, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'rep-counter', 'pose-model'],
    media: ['image', 'diagram'],
    notes: [
      'Revised 3 Nov: the far plate hides the near ankle; the hold lasts up to 3 s after the ankle was last seen clearly; the image pointer, the recall paragraph and the MyDeadlift credit were removed. Image is v4, with the stepped rest line.',
      'Replaces the rejected v1 text and its recall chart.',
      'Overlaps with WD batch 3, post 2 (the 3 s ankle hold).',
    ],
  },
  'wd-b2-6': {
    title: 'One deadlift set as the counter sees it',
    series: 'WD batch 2, post 6',
    version: 'batch 2, WD Marketing image, trimmed 3 Nov, cross-checked',
    ...nov3('19:57'),
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
    version: 'batch 3, image v3, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: [
      'Revised 3 Nov: no space before the percent signs, and a video and landmark credit for the new image (v3: a deadlift frame, the hip trace and the joint per move).',
    ],
  },
  'wd-b3-2': {
    title: 'When the plate hides the ankle',
    series: 'WD batch 3, post 2',
    version: 'batch 3, image v2, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: ['Image updated 3 Nov: the v2 caption says the hold is for up to 3 s. Text unchanged.'],
  },
  'wd-b3-4': {
    title: 'When the voice coach drops',
    series: 'WD batch 3, post 4',
    version: 'batch 3, image v3, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'coach'],
    media: ['diagram'],
    notes: [
      'Revised 3 Nov: the waits spelt out (1, 2, 4, 8 and 16 s, then 30 s), and the Pele credit removed because the v3 image is a plain step chart.',
      'Replaces Sample B (the coach reconnect sample, never posted). Sample B said the app shows no reconnecting message; the code at a0d27a7e shows "Coach reconnecting · counts still on".',
    ],
  },
  'wd-b3-5': {
    title: 'How often the voice coach speaks up',
    series: 'WD batch 3, post 5',
    version: 'batch 3, image v2, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'coach'],
    media: ['diagram'],
    notes: [
      'Revised 3 Nov: the opening names both limits, persona became coach style (the app’s label), and the talk less and talk more detail is left to the image.',
      'Overlaps with WD batch 2, post 1 (see there).',
    ],
  },
  'wd-b3-6': {
    title: 'A first rep waits for a second',
    series: 'WD batch 3, post 6',
    version: 'batch 3, image v3, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'rep-counter'],
    media: ['image', 'diagram'],
    notes: [
      'Revised 3 Nov: waiting for the next rep (not a second one, which could read as 1 s), and the image pointer replaced by the 5.48 s wait. Image is v3, with the stepped rest line.',
    ],
  },
  'wd-b4-p1': {
    title: 'What Workout Director is',
    series: 'WD batch 4, product post 1',
    version: 'batch 4, image p1 v2, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'product', 'rep-counter'],
    media: ['image'],
    notes: [
      'New 3 Nov: the product post (p1.txt). Image is p1 v2, the app counting a Pexels clip played in place of the camera, The video credit was taken out of the post text on 3 Nov. The first p1 image is not used.',
      'WD Engineering fix: "six" programs dropped (the code has at least 7).',
      'Open: the image is a 1.0.94 frame; a shoe brand print is mostly hidden but can be recognised zoomed in (WD Marketing; final call is Ashish’s).',
    ],
  },
  'wd-b4-fig1': {
    title: '115 figures for 869 catalogue exercises',
    series: 'WD batch 4, figures post 1',
    version: 'batch 4, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'figures'],
    media: ['image'],
    notes: [
      'New 3 Nov: the figures post (fig1.txt), with the shipped bodyweight squat figures in dark and light. No credit line.',
      'WD Engineering fixes: 750 not 754 (115 figures cover 119 entries); most have a start and an end pose; the app offers only moves with figures.',
      'Overlaps with WD batch 2, post 4 on the 115 figures in light and dark.',
    ],
  },
  'wd-b4-tech1': {
    title: 'Pose tracking and counting on the iPhone',
    series: 'WD batch 4, technical post 1',
    version: 'batch 4, Pele diagram v2, cross-checked',
    ...nov3('19:57'),
    topics: ['workout-director', 'pose-model', 'rep-counter'],
    media: ['diagram'],
    notes: [
      'New 3 Nov: the technical post (tech1.txt). Image is the v2 Pele diagram, whose caption says the pose model ships inside the app; The Pele credit was taken out of the post text on 3 Nov.',
      'Overlaps with D2 (pose models and the Vision fallback).',
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
  "I wanted to know what the bigger pose model actually buys on real lifts, so I ran the same deadlift reps through the same counter with BlazePose Full and with Lite.\n\nOn the MyDeadlift clips, Full found 115 of 191 barbell deadlift reps and Lite found 106. Neither counted more reps than a clip actually had.\n\nBoth numbers look low, and part of that is the clips themselves: they're single reps joined end to end, with a cut between each one.\n\nI measured this on the counter build after the deadlift fix and haven't re-run it since, so treat it as a snapshot."

/** Batch 3 post 3 has no image (WD Marketing dropped it), so it waits for media. Text from post-03-lite-vs-full.txt. */
const b3post3 = make({
  id: 'wd-b3-3',
  title: 'Lite against Full on the same deadlift reps',
  series: 'WD batch 3, post 3',
  version: 'batch 3',
  ...nov3('19:57'),
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
    'Caveats kept: no timing comparison (Mac times only), the Romanian row left out. The MyDeadlift CC BY 4.0 credit was taken out of the post text on 3 Nov 19:15 GMT (Ashish’s call).',
  ],
  notes: ['Shares its recall numbers with WD batch 2, post 5.'],
})

const b2 = wdBatch2.map(fromBatch)
const b3 = wdBatch3.map(fromBatch)
const b3Ordered = [...b3.slice(0, 2), b3post3, ...b3.slice(2)]
const b4 = wdBatch4.map(fromBatch)

/** Every post on the board, in the order they were written. */
export const draftPosts: DraftPost[] = [...fromV11, ...sampleA, ...b2, ...b3Ordered, ...b4]

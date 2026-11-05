import type { LiImage } from '~/content/linkedinV11Li'
import { liDrafts } from '~/content/linkedinV11Li'
import { liSamples } from '~/content/linkedinSamples'
import { wdBatch2, type WdBatchPost } from '~/content/linkedinWdBatch2'
import { wdBatch3 } from '~/content/linkedinWdBatch3'
import { wdBatch4 } from '~/content/linkedinWdBatch4'
import { wdBatch5 } from '~/content/linkedinWdBatch5'
import { wdBatch6 } from '~/content/linkedinWdBatch6'
import { auditTexts, voiceRewritten } from '~/content/linkedinAudit'
import { dataBatch1, type DataPost } from '~/content/linkedinData'
import { aiIdeas, type AiIdea } from '~/content/linkedinAiTools'
import { compactTexts, compactWithheld } from '~/content/linkedinCompact'

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
  technical: 'Technical',
  coach: 'Voice coach',
  'trainer-chat': 'Trainer chat',
  releases: 'Releases and updates',
  figures: 'Exercise figures',
  charts: 'App Store charts',
  /** StatMuse-style tech and app stats (not Workout Director posts). */
  data: 'Data',
  /** Ranked post ideas about AI coding CLIs (5 Nov 2026), not Workout Director posts. */
  'ai-tools': 'AI coding tools',
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

/**
 * Ready to post means cross-checked by WD Engineering and WD Marketing (3 Nov); every WD post not waiting for media is.
 * Data check is for the Data posts, which are not Workout Director posts, so that cross-check does not apply: their
 * least-sure items and stale numbers are checked before posting.
 * The AI coding tools ideas use Ready to post once their public facts are checked and nothing else is needed,
 * Waiting for media when only the media is missing, and Needs check while a claim still needs a public source.
 */
export const statuses = {
  ready: 'Ready to post',
  waiting: 'Waiting for media',
  'data-check': 'Data check',
  'needs-check': 'Needs check',
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
  /** The previous detailed paste text, kept as a secondary Longer version on the card. */
  longerText?: string
  /** Set when the card shows a note in place of the real text. */
  textNote?: string
  images: DraftImage[]
  concept?: string
  mediaNote?: string
  firstComment?: string
  /** The sources, posted as the first comment; shown under the post, never in its text. */
  firstCommentSources?: string
  /** How long the numbers in the post stay current. */
  freshUntil?: string
  /** What the draft’s author is least sure of, checked before posting (Data posts). */
  leastSure?: string[]
  /** AI coding tools ideas: rank in the section, 1 first. */
  rank?: number
  /** AI coding tools ideas: the media to make, shown on the card. */
  mediaPlan?: string
  /** AI coding tools ideas: what was confirmed against public sources. */
  publicChecks?: string[]
  /** AI coding tools ideas: what is still open before posting. */
  checks?: string[]
  /** A flag shown on the card, such as a post that touches Grok internals. */
  caution?: string
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
  'wd-b2-2',
  'wd-b2-4',
  'wd-b2-6',
  'wd-b3-1',
  'wd-b3-2',
  'wd-b3-3',
  'wd-b3-4',
  'wd-b3-5',
  'wd-b3-6',
  'wd-b4-p1',
  'wd-b4-fig1',
  'wd-b4-tech1',
  'wd-b5-1',
  'wd-b5-2',
  'wd-b5-3',
  'wd-b5-4',
  'wd-b5-5',
  'wd-b5-6',
  'wd-b6-1',
  'wd-b6-2',
  'wd-b6-3',
])
/**
 * Taken off the board in the 3 Nov audit as duplicates (their source files stay; see audit-2026-11-03/CHANGES.md):
 * wd-b2-1 repeats wd-b3-5 (the coach’s gap and per-set cap), wd-b2-5 repeats wd-b3-2 (the hidden ankle hold).
 */
const dropped = new Set(['wd-b2-1', 'wd-b2-5'])
/**
 * Posts changed in the 3 Nov audit pass (23:00 GMT: plain wording, no "my app" or show-off lines, duplicates cut, number
 * stacking trimmed, image footers stripped) and then cross-checked again: their text is in auditTexts.
 */
const voiceNote =
  'Voice pass 4 Nov 2026: rewritten in a StatMuse-style voice (lead with the fact, little or no first person) from statmuse-tech/voice-rewrite/. Same facts and numbers as the cross-checked text; see VOICE-REWRITE-BEFORE-AFTER.md.'
const auditNote =
  'Changed in the 3 Nov audit pass (text from linkedin-samples/personal/audit-2026-11-03/, see its CHANGES.md) and cross-checked again by WD Engineering and WD Marketing, 3 Nov 23:28 GMT (wd-share/crosscheck/eng-verdicts-audit-2026-11-03.md and marketing-verdicts-audit-2026-11-03.md), with their fixes applied.'
const checkedNote = 'Cross-checked by WD Engineering and WD Marketing, 3 Nov; see revised-2026-11-03/CHANGES.md.'
/** Every post’s text was replaced on 3 Nov 19:57 GMT by its human-voice rewrite. */
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
 * Each is the lossless original named in the image’s upload path, copied byte for byte.
 */
export const draftsImagesPath = `${draftsPath}img/`
const pngNames: Record<string, string> = {
  '/assets/img/preview/d1-joints-and-hip-angle-nocount-v2.webp': 'd1-joints-and-hip-angle.png',
  '/assets/img/preview/v12c-sample-a-1-chart.webp': 'sample-a-chart.png',
  '/assets/img/preview/wd-b2-2-forced-update-v2.webp': 'wd-b2-2-forced-update.png',
  '/assets/img/preview/wd-b2-4-f1-goblet-squat-built-not-traced-v3.webp': 'wd-b2-4-1-goblet-squat.png',
  '/assets/img/preview/wd-b2-4-f2-deadlift-fixed-gates-v3.webp': 'wd-b2-4-2-deadlift-fixed-gates.png',
  '/assets/img/preview/wd-b2-6-deadlift-rep1-refused.webp': 'wd-b2-6-deadlift-rep1-refused.png',
  '/assets/img/preview/wd-b3-1-one-angle-per-move-v4.webp': 'wd-b3-1-one-angle-per-move.png',
  '/assets/img/preview/wd-b3-2-plate-hides-the-ankle-v2.webp': 'wd-b3-2-plate-hides-the-ankle.png',
  '/assets/img/preview/wd-b3-4-coach-reconnect-backoff-v4.webp': 'wd-b3-4-coach-reconnect-backoff.png',
  '/assets/img/preview/wd-b3-3-lite-vs-full-sharp.webp': 'wd-b3-3-1-lite-vs-full-sharp.png',
  '/assets/img/preview/wd-b5-1-plank-straight-seconds.webp': 'wd-b5-1-plank-straight-seconds.png',
  '/assets/img/preview/wd-b3-5-coach-two-limits-v3.webp': 'wd-b3-5-coach-two-limits.png',
  '/assets/img/preview/wd-b3-6-first-rep-waits-v4.webp': 'wd-b3-6-first-rep-waits.png',
  '/assets/img/preview/wd-b4-p1-rep-counter-v3.webp': 'wd-b4-p1-rep-counter-v3.png',
  '/assets/img/preview/wd-b4-fig1-bodyweight-squat-light-dark.webp': 'wd-b4-fig1-bodyweight-squat.png',
  '/assets/img/preview/wd-b4-tech1-counted-on-the-phone-v2.webp': 'wd-b4-tech1-counted-on-the-phone.png',
  '/assets/img/preview/wd-b6-2-search-rdl.webp': 'wd-b6-2-search-rdl.png',
  ...Object.fromEntries(dataBatch1.map((d) => [d.image.src, d.pngName])),
}
/** Shown under an image on this page only, never in the post text. */
const captions: Record<string, string> = {
  '/assets/img/preview/wd-b2-4-f1-goblet-squat-built-not-traced-v3.webp':
    "Goblet squat reference (one of several): 'Kettlebell Goblet Squat' by Taco Fleur, Wikimedia Commons, CC BY-SA 4.0.",
  '/assets/img/preview/wd-b4-fig1-bodyweight-squat-light-dark.webp':
    'Credit for first comment: Figure reference: Taco Fleur, Wikimedia Commons, CC BY-SA 4.0.',
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

/**
 * 3 Nov audit re-renders (/workspace/drafts-audit/rerender.py, which runs WD Marketing’s make_batch4.py unchanged and
 * only skips the footer text): the wd-b2-4 figures without the "form gates" line, and wd-b3-1 without the joint list.
 * Pixel diffs against the previous files touch only those footer rows.
 */
const imageSwaps: Record<string, Pick<LiImage, 'src' | 'upload' | 'name' | 'note'> & Partial<Pick<LiImage, 'alt'>>> = {
  '/assets/img/preview/wd-b4-p1-rep-counter-v2.webp': {
    src: '/assets/img/preview/wd-b4-p1-rep-counter-v3.webp',
    upload: '/workspace/wd-marketing/linkedin-batch-4/out/p1v3/p1-rep-counter-v3.png',
    name: 'p1-rep-counter-v3.png',
    alt: 'Workout Director counting 3 reps of a bodyweight squat on a phone',
    note: 'WD Marketing out/p1v3/p1-rep-counter-v3.png (4 Nov 2026), checked by WD Engineering and WD Marketing. Replaces p1 v2. Upload file is the 1080 x 1350 PNG; the site copy is a WebP of it.',
  },
  '/assets/img/preview/wd-b2-4-f1-goblet-squat-built-not-traced-v2.webp': {
    src: '/assets/img/preview/wd-b2-4-f1-goblet-squat-built-not-traced-v3.webp',
    upload: '/workspace/drafts-audit/img/figures/f1-goblet-squat-built-not-traced-v3.png',
    name: 'f1-goblet-squat-built-not-traced-v3.png',
    note: 'Audit re-render (3 Nov 23:10 GMT) of WD Marketing figures/f1-goblet-squat-built-not-traced-v2.png with the "form gates: 183 checks, 0 fails" footer left out; nothing else changed (diff confined to y 1167 to 1193). The shipped dark @3x goblet squat figures. Pose reference credit (CC BY-SA 4.0) shown as a caption under the image on this page only, not in the post text.',
  },
  '/assets/img/preview/wd-b2-4-f2-deadlift-fixed-gates-v2.webp': {
    src: '/assets/img/preview/wd-b2-4-f2-deadlift-fixed-gates-v3.webp',
    upload: '/workspace/drafts-audit/img/figures/f2-deadlift-fixed-gates-v3.png',
    name: 'f2-deadlift-fixed-gates-v3.png',
    note: 'Audit re-render (3 Nov 23:10 GMT) of WD Marketing figures/f2-deadlift-fixed-gates-v2.png with the "form gates: 242 checks, 0 fails" footer left out; nothing else changed (diff confined to y 1167 to 1193). Caption: "Posed in Blender to match joint angles from reference clips. Never traced."',
  },
  '/assets/img/preview/wd-b3-4-coach-reconnect-backoff-v3.webp': {
    src: '/assets/img/preview/wd-b3-4-coach-reconnect-backoff-v4.webp',
    upload: '/workspace/drafts-audit/img/review/04-coach-reconnect-backoff-v4.png',
    name: '04-coach-reconnect-backoff-v4.png',
    note: 'Verdict-pass re-render (3 Nov 23:29 GMT, WD Marketing image FIX) of WD Marketing review/04-coach-reconnect-backoff-v3.png with its one-line jitter footer left out; nothing else changed (diff confined to y 1282 to 1308). A plain step chart from batch-3 backoff-timeline.csv; WD Engineering: the steps, the 150 s budget and "gives up at 121 s, offers Retry" match the text.',
  },
  '/assets/img/preview/wd-b3-1-one-angle-per-move-v3.webp': {
    src: '/assets/img/preview/wd-b3-1-one-angle-per-move-v4.webp',
    upload: '/workspace/drafts-audit/img/review/01-one-angle-per-move-v4.png',
    name: '01-one-angle-per-move-v4.png',
    note: 'Audit re-render (3 Nov 23:10 GMT) of WD Marketing review/01-one-angle-per-move-v3.png with the joint-per-move list (hip, knee, elbow rows) left out; nothing else changed (diff confined to y 1217 to 1310). Pexels 7674505 at 16.00 s, BlazePose Lite landmarks, hip 70.9° from blog-data/deadlift-joint-trace.csv.',
  },
}

/** What the 3 Nov audit pass changed in each post (full old and new texts: wd-share/crosscheck/audit-fixes-request.md). */
const auditChanges: Record<string, string> = {
  d1: 'Audit: "When I taught my app to count deadlifts" became "When I wrote the deadlift counter". Nothing else changed.',
  d2: 'Audit: paragraph 2 trimmed: the 5% PCK definition and the 4 ms desktop figure became "only a little more time a frame in my desktop test" (WD Engineering FIX); "So Full is the one the app ships" added, from tech1.',
  d3: 'Audit: the "part 3 of 3" label, the first-rep wait paragraph (curl numbers) and the lunge paragraph cut, so the first-rep wait lives in wd-b3-6 only; link line "More notes on the counter". The audit closing line was cut (WD Marketing FIX).',
  'wd-b2-2': 'Audit: "Sometimes an old build of my app has to go" became "Sometimes an old build has to go".',
  'wd-b2-3':
    'Audit: "in my app" became "in Workout Director"; the 36-message trigger and the eight-line limit dropped, "the last 24 messages" became "the recent messages". Text cross-checked; still waiting for media.',
  'wd-b2-4':
    'Audit: the 115 figures in light and dark sentence cut (fig1 owns the catalogue numbers), "in my app" became "in Workout Director". Both images re-rendered without the "form gates" footers.',
  'wd-b2-6':
    'Audit: "my app\'s counter" became "the counter"; the rep 2 paragraph no longer explains why the first rep waits (wd-b3-6 does): "Reps 2 and 3 pass. The counter holds rep 2 until rep 3 finishes, then both count." (WD Marketing FIX, facts confirmed by WD Engineering). Image unchanged: WD Engineering\'s optional label "WAITS FOR REP 3 TO FINISH" would not fit inside the shaded band, so it was not re-rendered.',
  'wd-b3-1':
    'Audit: "Every rep my app counts" became "Every rep Workout Director counts". Image re-rendered without the joint-per-move list.',
  'wd-b3-2':
    'Audit verdict pass: "what my counter normally needs" became "what the counter normally needs" (WD Marketing FIX).',
  'wd-b3-3': 'Audit: image option 2 (MyDeadlift) removed; text unchanged.',
  'wd-b3-4':
    'Audit: the wait list (1, 2, 4, 8, 16, 30), the 150 s budget and the 8 to 10 retries trimmed to "from 1 second up to 30" and "two and a half minutes". Image re-rendered without its footer (WD Marketing FIX).',
  'wd-b3-6':
    'Audit: now the only post on the first-rep wait; gains the curl figure from D3 (35.4 to 3.4 false reps an hour, 2.0% of real reps); "my app holds" became "the counter holds"; board title made unambiguous.',
  'wd-b4-p1':
    'Audit: "my own iPhone app" became "an iPhone app"; the version line and the RDL search line cut (wd-b6-2 covers search); "the video is never recorded, saved or uploaded" cut (WD Marketing FIX).',
  'wd-b4-fig1':
    'Audit: about the catalogue and figures only; "all our own artwork", "Workout Director\'s own figures" and the 920 PNGs sentence cut.',
  'wd-b4-tech1': 'Audit: p1\'s "never recorded, saved or uploaded" line cut from tech1.',
  'wd-b5-1': 'Audit: "my app times it" became "the app times it", "My app gives it 2" became "The clock gives it 2".',
  'wd-b5-2': 'Audit: "the elbow angle my app reads" became "the elbow angle the counter reads".',
  'wd-b5-3':
    'Audit: "my app counts zero" became "the counter counts zero", and "my row counter" became "the row counter" (WD Marketing FIX).',
  'wd-b5-4':
    'Audit: "I\'m porting my app\'s rep counter from Swift to Kotlin for the Android version" became "I\'m porting the rep counter from Swift to Kotlin".',
  'wd-b5-5': 'Audit: "So my app\'s counter checks" became "So the counter checks".',
  'wd-b5-6':
    'Audit verdict pass: "A bug from the Android version I\'m porting" became "A bug I hit while porting to Kotlin" (WD Marketing FIX).',
  'wd-b6-1':
    'Audit: opening "I wanted my app to say why today\'s numbers are what they are." replaced with "A number on its own doesn\'t tell you much, so the targets on the Today screen come with one plain line explaining them."',
  'wd-b6-2': 'Audit: "My app\'s exercise search" became "The exercise search".',
  'wd-b6-3': 'Audit: "My app\'s Today screen" became "The Today screen".',
}

/**
 * Swap in the compact LinkedIn paste text and keep the detailed body as longerText.
 * Withheld cards (sample-a) keep their placeholder and get no longerText swap.
 */
function applyCompact<T extends { id: string; text: string; chars: number; length: Length; textNote?: string }>(
  post: T,
): T & { longerText?: string } {
  if (compactWithheld.has(post.id) || post.textNote) return post
  const compact = compactTexts[post.id]
  if (!compact) throw new Error(`No compact text for ${post.id}`)
  const chars = [...compact].length
  return {
    ...post,
    longerText: post.text,
    text: compact,
    chars,
    length: lengthOf(chars),
  }
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
  const audited = auditTexts[base.id]
  const text = audited ?? rest.text
  const chars = audited === undefined ? base.chars : [...audited].length
  const lead = [
    ...(voiceRewritten.has(base.id) ? [voiceNote] : []),
    ...(audited !== undefined || base.id === 'wd-b3-3' ? [auditNote] : []),
    ...(base.id.startsWith('wd-b6-') ? [] : [humanNote]),
    ...(crossChecked.has(base.id) ? [checkedNote] : []),
    ...(creditsRemoved.has(base.id) ? [creditsNote] : []),
  ]
  return {
    ...rest,
    text,
    chars,
    images: images.map((img) => withPng({ ...img, ...(imageSwaps[img.src] ?? {}) })),
    primary,
    length: lengthOf(chars),
    status: waiting ? 'waiting' : 'ready',
    notes: [...lead, ...[auditChanges[base.id]].flatMap((n) => (n ? [n] : [])), ...(notes ?? [])],
  }
}

const nov3 = (time: string) => ({ updated: `2026-11-03T${time}:00Z`, updatedLabel: `3 Nov 2026, ${time} GMT` })

const dExtra: Record<(typeof liDrafts)[number]['id'], Extra> = {
  'tue-3-nov': {
    title: 'D1: a deadlift counted from one hip angle',
    series: 'D1, slot Tue 3 Nov',
    version: 'v13, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
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
    version: 'v13, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'pose-model', 'rep-counter', 'technical'],
    media: ['text'],
    notes: [
      'v13: says what the 72, 79 and 84 scores measure (joints within 5% of the person’s size on 156 COCO photos), that the 4 ms is on a desktop CPU, the 2 s warm-up, and that the Vision fallback lasts the rest of that workout.',
      'Text only now: both images dropped.',
      'Replaces v1, v1.1, v2, v2.1, v3, v4, v6.1, v7, v7.1, v7.2, v8, v9, v11 and v12 to v12e of D2.',
    ],
  },
  'mon-9-nov': {
    title: 'D3: the checks before a rep counts',
    series: 'D3, slot Mon 9 Nov',
    version: 'v13 (trimmed), audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
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
      'Paste the text from /workspace/linkedin-samples/personal/statmuse-tech/voice-rewrite/sample-a.txt (4 Nov StatMuse-voice pass; the earlier text is human-2026-11-03/sample-a.txt).',
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
    version: 'batch 2, Pele diagram v2, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'releases', 'technical'],
    media: ['diagram'],
    notes: [
      'Revised 3 Nov: the second paragraph no longer repeats the image (both paths, the saved answer, the offline relaunch); Pele credit added. Image is the v2 Pele render.',
      'Replaces the rejected designed diagram and the first Pele render.',
    ],
  },
  'wd-b2-3': {
    title: 'What one trainer chat message carries',
    series: 'WD batch 2, post 3',
    version: 'batch 2, audit 3 Nov, text cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'trainer-chat', 'technical'],
    media: ['text'],
    notes: ['Replaces the rejected designed bento.'],
  },
  'wd-b2-4': {
    title: 'Exercise figures from one 3D body',
    series: 'WD batch 2, post 4',
    version: 'batch 2, revised 3 Nov, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'figures', 'technical'],
    media: ['image'],
    notes: [
      'Image 2 swapped 3 Nov 20:30 GMT: the f2 v2 deadlift figure, whose caption now reads “Posed in Blender to match joint angles from reference clips. Never traced.” (text-only change from WD Marketing).',
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
    version: 'batch 2, WD Marketing image, trimmed 3 Nov, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
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
    version: 'batch 3, image v3, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
    media: ['image', 'diagram'],
    notes: [
      'Revised 3 Nov: no space before the percent signs, and a video and landmark credit for the new image (v3: a deadlift frame, the hip trace and the joint per move).',
    ],
  },
  'wd-b3-2': {
    title: 'When the plate hides the ankle',
    series: 'WD batch 3, post 2',
    version: 'batch 3, image v2, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
    media: ['image', 'diagram'],
    notes: ['Image updated 3 Nov: the v2 caption says the hold is for up to 3 s. Text unchanged.'],
  },
  'wd-b3-4': {
    title: 'When the voice coach drops',
    series: 'WD batch 3, post 4',
    version: 'batch 3, image v4 (no footer), audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'coach', 'technical'],
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
    ...nov3('20:30'),
    topics: ['workout-director', 'coach', 'technical'],
    media: ['diagram'],
    notes: [
      'Image swapped 3 Nov 20:30 GMT: v3, whose caption now says pain skips the gap and the cap but still waits for 2.5 s of quiet (text-only change from WD Marketing).',
      'Revised 3 Nov: the opening names both limits, persona became coach style (the app’s label), and the talk less and talk more detail is left to the image.',
      'Overlaps with WD batch 2, post 1 (see there).',
    ],
  },
  'wd-b3-6': {
    title: 'Why the first rep waits for the next one',
    series: 'WD batch 3, post 6',
    version: 'batch 3, image v3, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
    media: ['image', 'diagram'],
    notes: [
      'Image swapped 3 Nov 20:30 GMT: v4, headline “The first rep waits for the next one.” and caption “It counts once another rep lands within 8 s, or when the set ends.” (text-only change from WD Marketing).',
      'Revised 3 Nov: waiting for the next rep (not a second one, which could read as 1 s), and the image pointer replaced by the 5.48 s wait. Image is v3, with the stepped rest line.',
    ],
  },
  'wd-b4-p1': {
    title: 'What Workout Director is',
    series: 'WD batch 4, product post 1',
    version: 'batch 4, image p1 v3, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'product', 'rep-counter'],
    media: ['image'],
    notes: [
      'New 3 Nov: the product post (p1.txt). Image is now p1 v3 (4 Nov, checked by WD Engineering and WD Marketing): Workout Director counting 3 reps of a bodyweight squat on a phone. p1 v2 and the first p1 image are no longer shown.',
      'WD Engineering fix: "six" programs dropped (the code has at least 7).',
    ],
  },
  'wd-b4-fig1': {
    title: '115 figures for 869 catalogue exercises',
    series: 'WD batch 4, figures post 1',
    version: 'batch 4, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'figures'],
    media: ['image'],
    notes: [
      '3 Nov 20:30 GMT: a board-only credit caption under the image (Taco Fleur, Wikimedia Commons, CC BY-SA 4.0) for the first comment; not in the post text.',
      'New 3 Nov: the figures post (fig1.txt), with the shipped bodyweight squat figures in dark and light. No credit line.',
      'WD Engineering fixes: 750 not 754 (115 figures cover 119 entries); most have a start and an end pose; the app offers only moves with figures.',
      'Overlaps with WD batch 2, post 4 on the 115 figures in light and dark.',
    ],
  },
  'wd-b4-tech1': {
    title: 'Pose tracking and counting on the iPhone',
    series: 'WD batch 4, technical post 1',
    version: 'batch 4, Pele diagram v2, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'pose-model', 'rep-counter', 'technical'],
    media: ['diagram'],
    notes: [
      'New 3 Nov: the technical post (tech1.txt). Image is the v2 Pele diagram, whose caption says the pose model ships inside the app; The Pele credit was taken out of the post text on 3 Nov.',
      'Overlaps with D2 (pose models and the Vision fallback).',
    ],
  },
  'wd-b6-1': {
    title: 'Today’s target comes with a reason',
    series: 'WD batch 6 (product), post 1',
    version: 'batch 6, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'product'],
    media: ['text'],
    notes: [
      'New 3 Nov: product promotion batch 6 (Ashish 21:25 GMT, "Do few on product promotion"). Cross-checked: Eng OK, WD Marketing FIX applied (paragraph split, "fixed rules" wording). See wd-batch-6-product/README.md.',
    ],
  },
  'wd-b6-2': {
    title: 'Search by the name you’d use in the gym',
    series: 'WD batch 6 (product), post 2',
    version: 'batch 6, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'product'],
    media: ['image'],
    notes: [
      'New 3 Nov: product promotion batch 6. Image is the real iOS search screen with the WD logo (no credit needed). Cross-checked: Eng OK, WD Marketing FIX applied; press-up example dropped. Don’t run it on the same day as p1 (WD Marketing).',
    ],
  },
  'wd-b6-3': {
    title: 'Fit my day',
    series: 'WD batch 6 (product), post 3',
    version: 'batch 6, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'product'],
    media: ['text'],
    notes: [
      'New 3 Nov: product promotion batch 6. Cross-checked: Eng FIX applied (same muscles and body limits, not “a safe one”), WD Marketing OK with its optional sentence 2 tweak. Batch 6 post 4 (programs) is held off the board (WD Marketing DROP: overlaps p1).',
    ],
  },
  'wd-b5-1': {
    title: 'Only the straight seconds count: the plank clock',
    series: 'WD batch 5, post 1',
    version: 'batch 5, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
    media: ['image', 'diagram'],
    notes: [
      'New 3 Nov: batch 5 post 1, with the WD Engineering and WD Marketing batch 5 fixes applied (wd-batch-5/README.md). WD Marketing plank image added 3 Nov 20:35 GMT (Pexels, no credit).',
    ],
  },
  'wd-b5-2': {
    title: 'Eight dips, three push-ups',
    series: 'WD batch 5, post 2',
    version: 'batch 5, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
    media: ['text'],
    notes: [
      'New 3 Nov: batch 5 post 2, with the WD Engineering and WD Marketing batch 5 fixes applied (wd-batch-5/README.md). Text only: its WD Marketing image was not used (3 Nov 20:27).',
    ],
  },
  'wd-b5-3': {
    title: 'A row needs the hinge',
    series: 'WD batch 5, post 3',
    version: 'batch 5, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
    media: ['text'],
    notes: [
      'New 3 Nov: batch 5 post 3, with the WD Engineering and WD Marketing batch 5 fixes applied (wd-batch-5/README.md). Text only: its WD Marketing image was not used (3 Nov 20:27).',
    ],
  },
  'wd-b5-4': {
    title: 'Checking the Android counter frame by frame',
    series: 'WD batch 5, post 4',
    version: 'batch 5, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'rep-counter', 'technical'],
    media: ['text'],
    notes: [
      'New 3 Nov: batch 5 post 4, with the WD Engineering and WD Marketing batch 5 fixes applied (wd-batch-5/README.md). Text only by design.',
    ],
  },
  'wd-b5-5': {
    title: 'Pacing the camera when the phone runs hot',
    series: 'WD batch 5, post 5',
    version: 'batch 5, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'pose-model', 'technical'],
    media: ['text'],
    notes: [
      'New 3 Nov: batch 5 post 5, with the WD Engineering and WD Marketing batch 5 fixes applied (wd-batch-5/README.md). Text only by design.',
    ],
  },
  'wd-b5-6': {
    title: 'The Android GPU bug on frame one',
    series: 'WD batch 5, post 6',
    version: 'batch 5, audit 3 Nov, cross-checked',
    ...nov3('23:34'),
    topics: ['workout-director', 'pose-model', 'technical'],
    media: ['text'],
    notes: [
      'New 3 Nov: batch 5 post 6, with the WD Engineering and WD Marketing batch 5 fixes applied (wd-batch-5/README.md). Text only by design.',
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
  'I wanted to know what the bigger pose model actually buys on real lifts, so I ran the same deadlift reps through the same counter with BlazePose Full and with Lite.\n\nOn the MyDeadlift clips, Full found 115 of 191 barbell deadlift reps and Lite found 106. Neither counted more reps than a clip actually had.\n\nBoth numbers look low, and part of that is the clips themselves: they’re single reps joined end to end, with a cut between each one.\n\nI measured this on the counter build after the deadlift fix and haven’t re-run it since, so treat it as a snapshot.'

/** Batch 3 post 3: two image options approved by Ashish (3 Nov), the sharp Pexels frame first. Text from human-2026-11-03/wd-b3-3.txt. */
const b3post3 = make({
  id: 'wd-b3-3',
  title: 'Lite against Full on the same deadlift reps',
  series: 'WD batch 3, post 3',
  version: 'batch 3, one image (audit 3 Nov), cross-checked',
  ...nov3('23:34'),
  topics: ['workout-director', 'pose-model', 'rep-counter', 'technical'],
  media: ['image'],
  chars: [...liteVsFull].length,
  text: liteVsFull,
  images: [
    {
      key: 'b3l1',
      src: '/assets/img/preview/wd-b3-3-lite-vs-full-sharp.webp',
      w: 1080,
      h: 1350,
      upload: '/workspace/wd-marketing/linkedin-batch-4/new/wd-b3-3-lite-vs-full-sharp.png',
      name: 'wd-b3-3-lite-vs-full-sharp.png',
      alt: 'Same frame, two pose models. A woman at the floor setting up a barbell deadlift, side-on, with two pose skeletons drawn on her shoulder, hip, knee and ankle: BlazePose Full in coral and Lite in white, labelled at each ankle. They agree at the shoulder and hip and part at the knee and the plate-hidden ankle. Caption: BlazePose Full and Lite, run on the same deadlift frame.',
      note: 'WD Marketing new/wd-b3-3-lite-vs-full-sharp.png (3 Nov 20:10 GMT): Pexels 7674505 (cottonbro studio), 4K copy, frame 69 at 2.76 s, cropped and downscaled; Lite and Full re-run on the box with the lock-pinned .task files (not Engineering data). The caption gives no numbers; the 115 and 106 in the text are the MyDeadlift eval, not this frame. Pexels License, no credit needed (courtesy: Video: cottonbro studio / Pexels). Upload file is the 1080 x 1350 PNG; the site copy is a WebP of it.',
    },
  ],
  concept: 'Two pose models on the same deadlift reps: recall for BlazePose Full and Lite after the deadlift fix',
  mediaNote:
    'One image: the sharp Pexels frame (no credit needed). The MyDeadlift option was taken off the board in the 3 Nov audit (soft upscale, bystanders, a CC BY 4.0 credit to place, and the caption "Neither added one." that the reviewers flagged).',
  sources: [
    'wd-share/blog-data/batch-3/03-lite-vs-full/README.md:4 (Full 0.602, 115 of 191; Lite 0.555, 106 of 191; barbell, counter after PR #322), :2 (no extra reps either way), :11 (single rep clips joined with a cut), :7 (not re-run at main).',
    'Caveats kept: no timing comparison (Mac times only), the Romanian row left out. The MyDeadlift CC BY 4.0 credit was taken out of the post text on 3 Nov 19:15 GMT (Ashish’s call); the image option that carried it was removed in the 3 Nov audit.',
  ],
  notes: [
    'Audit 3 Nov 23:15 GMT: image option 2 (MyDeadlift frame, wd-marketing/linkedin-batch-4/new/wd-b3-3-lite-vs-full.png) removed from the board; the file stays. Text unchanged.',
    'Images added 3 Nov 20:30 GMT (Ashish approved both): the sharp Pexels frame first, then the MyDeadlift frame (superseded by the audit note above). The text cites no number from either image; its 115 and 106 come from the MyDeadlift eval.',
    'Shared its recall numbers with WD batch 2, post 5 (wd-b2-5, dropped in the audit).',
  ],
})

const b2 = wdBatch2.filter((p) => !dropped.has(p.id)).map(fromBatch)
const b3 = wdBatch3.map(fromBatch)
const b3Ordered = [...b3.slice(0, 2), b3post3, ...b3.slice(2)]
const b4 = wdBatch4.map(fromBatch)
const b5 = wdBatch5.map(fromBatch)
const b6 = wdBatch6.map(fromBatch)

/**
 * Data batch 1 (4 Nov 2026): StatMuse-style tech and app stats from linkedin-samples/personal/statmuse-tech/posts/,
 * generated into linkedinData.ts by /workspace/drafts-data/gen.py. Not Workout Director posts, so the WD Engineering
 * and Marketing cross-check does not apply: they show as Data check, with the draft’s least-sure items as notes and
 * its sources as the first comment, never in the post text.
 */
function fromData(d: DataPost): DraftPost {
  const updated = { updated: '2026-11-04T01:00:00Z', updatedLabel: '4 Nov 2026, 01:00 GMT' }
  return {
    id: d.id,
    title: d.title,
    series: `Data batch 1, post ${d.n}`,
    version: 'data batch 1, 4 Nov, data check',
    ...updated,
    topics: ['data'],
    primary: 'data',
    media: ['diagram'],
    status: 'data-check',
    chars: d.chars,
    length: lengthOf(d.chars),
    text: d.text,
    images: [withPng(d.image)],
    concept: `Template ${d.template}`,
    mediaNote:
      'One 4:5 chart drawn from the fetched data (statmuse-tech/posts/make_posts.py). Its source line is small print on the chart; the full sources go in the first comment.',
    firstCommentSources: d.firstComment,
    freshUntil: d.freshUntil,
    leastSure: d.leastSure,
    sources: [
      `/workspace/linkedin-samples/personal/statmuse-tech/posts/${d.file} (text copied as written; Sources section is the first comment).`,
      'Numbers: statmuse-tech/data/ (FETCH-LOG.md), computed in posts/make_posts.py into posts/derived.json.',
      `${d.image.name}: ${d.image.note ?? ''}`,
    ],
    notes: [
      'New 4 Nov 2026: StatMuse-style data batch 1 (statmuse-tech/posts/README.md). Not a Workout Director post, so the WD Engineering and Marketing cross-check does not apply. Status Data check: go through the least-sure items below and refresh stale numbers before posting.',
      ...(d.stale
        ? ['Chart snapshot: refetch and re-run make_posts.py before posting, and correct the date in the text.']
        : []),
      ...d.textFixes,
      ...d.leastSure.map((l) => `Least sure: ${l}`),
    ],
  }
}
const data = dataBatch1.map(fromData)

/** Anchor of the AI coding tools section on the board. */
export const aiSectionId = 'ai-coding-tools'

/**
 * AI coding tools (5 Nov 2026): ranked post ideas from linkedinAiTools.ts. They share one updated time, so newest first
 * keeps them in rank order (ties keep board order). Sources are public only and go in the first comment.
 */
function fromAi(idea: AiIdea): DraftPost {
  const chars = [...idea.text].length
  return {
    id: `ai-${idea.rank}`,
    title: idea.title,
    series: `AI coding tools, rank ${idea.rank}`,
    version: 'ideas 5 Nov',
    updated: '2026-11-05T01:30:00Z',
    updatedLabel: '5 Nov 2026, 01:30 GMT',
    topics: ['ai-tools'],
    primary: 'ai-tools',
    media: idea.media,
    status: idea.status,
    chars,
    length: lengthOf(chars),
    text: idea.text,
    images: [],
    concept: `Ranked idea ${idea.rank} of ${aiIdeas.length} in AI coding tools`,
    mediaNote: idea.mediaPlan,
    firstCommentSources: idea.firstComment,
    freshUntil: idea.freshUntil,
    rank: idea.rank,
    mediaPlan: idea.mediaPlan,
    publicChecks: idea.publicChecks,
    checks: idea.checks,
    ...(idea.caution ? { caution: idea.caution } : {}),
    sources: [
      'Ranked idea list from Ashish (5 Nov 2026), written up in the StatMuse voice; figures as given.',
      ...idea.publicChecks.map((c) => `Public check, 5 Nov: ${c}`),
    ],
    notes: [
      'New 5 Nov 2026: AI coding tools, ranked ideas. Not a Workout Director post, so the WD cross-check does not apply.',
      ...idea.checks.map((c) => `Still to check: ${c}`),
      ...(idea.notes ?? []),
    ],
  }
}
const ai = [...aiIdeas].sort((a, b) => a.rank - b.rank).map(fromAi)

/** Every post on the board, in the order they were written. */
export const draftPosts: DraftPost[] = [
  ...fromV11,
  ...sampleA,
  ...b2,
  ...b3Ordered,
  ...b4,
  ...b5,
  ...b6,
  ...data,
  ...ai,
].map(applyCompact)

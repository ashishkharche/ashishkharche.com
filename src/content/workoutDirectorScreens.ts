/**
 * Workout Director App Store screens (set v6, app build 1.0.89), for iPhone
 * 6.9 inch and iPad 13 inch. The web copies in public/assets/img/wd are made
 * from the App Store PNGs by `pnpm wd-screens <folder>` (scripts/wd-screens.ts).
 */
export type Device = 'iphone' | 'ipad'

/** Size of the App Store PNGs, which is also the aspect ratio of every web copy. */
export const deviceSize: Record<Device, { width: number; height: number }> = {
  iphone: { width: 1320, height: 2868 },
  ipad: { width: 2064, height: 2752 },
}

/** Widths the web copies are exported at, each as AVIF and WebP. */
export const screenWidths: Record<Device, readonly [number, number]> = {
  iphone: [400, 800],
  ipad: [640, 1280],
}

export interface Screen {
  /** File stem of the App Store PNG, such as `02-voice`. */
  id: string
  /** Short name, shown under the screen in the gallery. */
  label: string
  /** What the screen shows, used as alt text. The headline on the screen comes first. */
  alt: string
  /** Where the stock footage played into the camera view comes from, so the screen carries a credit. */
  footage?: FootageSource
}

/** Stock footage libraries used in the camera screens. */
export type FootageSource = 'mixkit' | 'pexels'

/**
 * The credit for each library. Neither licence requires one, but both ask for
 * it. The Pexels clip in 02-voice-pexels is "A Woman Lifting A Barbell" by
 * cottonbro studio (https://www.pexels.com/video/7674505/), under the Pexels
 * licence (https://www.pexels.com/license/).
 */
const footageCredits: Record<FootageSource, string> = {
  mixkit: 'Mixkit, free licence',
  pexels: 'cottonbro studio on Pexels',
}

const allScreens = {
  '02-voice': {
    id: '02-voice',
    label: 'Voice',
    alt: 'Hands busy? Just say it. A man doing push-ups on a balcony, counted on the live camera at 4 of 12, with example requests such as "Add a set" and "Give me 30 seconds".',
    footage: 'mixkit',
  },
  '03-live-coach': {
    id: '03-live-coach',
    label: 'Live Coach',
    alt: 'A coach in your corner. A man doing push-ups on the live camera, counted at 7 of 12, while the voice coach tells him to brace his core.',
    footage: 'mixkit',
  },
  '04-manual': {
    id: '04-manual',
    label: 'Manual count',
    alt: 'No camera? Tap in your reps. A panel for entering 8 reps with minus and plus buttons, over a barbell exercise figure.',
  },
  '05-form': {
    id: '05-form',
    label: 'Form',
    alt: 'Know the form before you lift. The goblet squat page with an exercise figure and four numbered form steps.',
  },
  '06-trainer': {
    id: '06-trainer',
    label: 'Trainer',
    alt: 'Ask your trainer anything. A trainer chat that suggests box squats after a message about a tight knee.',
  },
  '07-progress': {
    id: '07-progress',
    label: 'Progress',
    alt: 'Steady progress, set by set. A workout summary with sets, reps and weight lifted, and a goblet squat chart rising to 21 kg.',
  },
  '08-today': {
    id: '08-today',
    label: 'Today',
    alt: "Today's workout, ready when you are. A 14 minute full body plan for the day with a Start workout button.",
  },
  // Not in the gallery: the same Voice screen as 02-voice, captured with a
  // Pexels deadlift clip in the camera view instead of the Mixkit push-up clip
  // (commit 040fe69 on fix/selected-work-cards). Only note 1 shows it, until
  // the rest of the site moves to the Pexels captures. iPhone copies only, so
  // `pnpm wd-screens` leaves its files alone.
  '02-voice-pexels': {
    id: '02-voice-pexels',
    label: 'Voice',
    alt: 'Hands busy? Just say it. A woman lifting a barbell deadlift on the live camera, at the start of a set of 6, with example requests such as "Add a set" and "Give me 30 seconds".',
    footage: 'pexels',
  },
  // Not in the gallery: shown only at the top of the home page. A raw
  // simulator capture without the marketing frame: the app counting Mixkit
  // #50761 "A young black man does push-ups on the balcony" (Mixkit Stock Video
  // Free Licence, https://mixkit.co/free-stock-video/a-young-black-man-does-push-ups-on-the-balcony-50761/)
  // played into the camera, a genuine 4 of 12 (appstore-shots-v6 raw
  // v6-pushup2-24-g). The same clip as 02-voice, so the two are never on one page. iPhone copies only.
  'pushup-mixkit': {
    id: 'pushup-mixkit',
    label: 'Rep counting',
    alt: 'A man doing push-ups on a balcony on the live camera, counted at 4 of 12, set 1 of 3, with a Finish set button.',
    footage: 'mixkit',
  },
  // Not in the gallery: shown only at the top of the home page, behind
  // pushup-mixkit. A raw simulator capture without the marketing frame: Pexels
  // 7674505 "A Woman Lifting A Barbell" by cottonbro studio (Pexels License,
  // https://www.pexels.com/video/a-woman-lifting-a-barbell-7674505/) played
  // into the camera, a genuine 0 of 6 at the start of the set (appstore-shots-v6
  // raw px-deadlift-09-g, graded like the push-up, no retouch). The same clip
  // as 02-voice-pexels but a different picture (no marketing frame). iPhone copies only.
  'deadlift-pexels': {
    id: 'deadlift-pexels',
    label: 'Deadlift',
    alt: 'A woman setting up a barbell deadlift in a gym on the live camera, at 0 of 6 at the start of set 1 of 4, with an Add weight button.',
    footage: 'pexels',
  },
} satisfies Record<string, Screen>

export type ScreenId = keyof typeof allScreens

/**
 * The screens shown on the site. The push-up sets on the live camera (02, then
 * 03) lead, then the rest in App Store order. After changing the list, run
 * `pnpm wd-screens <folder>` to make the web copies.
 */
export const shownScreenIds: ScreenId[] = [
  '02-voice',
  '03-live-coach',
  '04-manual',
  '05-form',
  '06-trainer',
  '07-progress',
  '08-today',
]

/** Screens that have web copies but are not in the gallery (iPhone copies only). */
export const extraScreenIds: ScreenId[] = ['02-voice-pexels', 'pushup-mixkit', 'deadlift-pexels']

export const screens: Screen[] = shownScreenIds.map((id) => allScreens[id])

/** Whether any of these screens shows stock footage, so the credit should be shown with them. */
export function hasFootage(ids: readonly ScreenId[]): boolean {
  return ids.some((id) => Boolean((allScreens[id] as Screen).footage))
}

/** The footage credit for a group of screens, naming only the libraries those screens use. */
export function footageCredit(ids: readonly ScreenId[]): string {
  const sources = new Set(ids.flatMap((id) => (allScreens[id] as Screen).footage ?? []))
  const names = (['mixkit', 'pexels'] as const).filter((source) => sources.has(source)).map((s) => footageCredits[s])
  return names.length ? `Footage: ${names.join('; ')}.` : ''
}

export function screen(id: ScreenId): Screen {
  if (!shownScreenIds.includes(id) && !extraScreenIds.includes(id))
    throw new Error(`Screen ${id} is not in shownScreenIds or extraScreenIds`)
  return allScreens[id]
}

/** Path of one web copy, such as /assets/img/wd/iphone/02-voice-800.avif. */
export function screenPath(id: string, device: Device, width: number, format: 'avif' | 'webp'): string {
  return `/assets/img/wd/${device}/${id}-${width}.${format}`
}

export function screenSrcSet(id: string, device: Device, format: 'avif' | 'webp'): string {
  return screenWidths[device].map((width) => `${screenPath(id, device, width, format)} ${width}w`).join(', ')
}

/** An iPad screen with two iPhone screens in front of it (see DeviceStage). */
export interface StageSpec {
  ipad: ScreenId
  phones: [ScreenId, ScreenId]
}

/** `sizes` for the screens on a stage, which is as wide as the page content (at most 1040px). */
export const stageSizes: Record<Device, string> = {
  ipad: '(max-width: 560px) 62vw, (max-width: 1100px) 42vw, 440px',
  iphone: '(max-width: 560px) 40vw, (max-width: 1100px) 21vw, 230px',
}

/**
 * A preload link for the iPad screen of a stage at the top of a page. It is the
 * largest image there, and the browser would otherwise find the AVIF copy only
 * once it reaches the <picture>.
 */
export function stagePreload(stage: StageSpec) {
  return {
    rel: 'preload',
    as: 'image',
    type: 'image/avif',
    imageSrcSet: screenSrcSet(stage.ipad, 'ipad', 'avif'),
    imageSizes: stageSizes.ipad,
    fetchPriority: 'high',
  } as const
}

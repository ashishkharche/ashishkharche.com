import type { LogoName } from './logos'
import { links } from './site'
import type { StageSpec } from './workoutDirectorScreens'

export interface Screenshot {
  name: string
  alt: string
}

/** Path of a Kalo screenshot at a given width. They are exported at 480 and 960 pixels wide. */
export function screenshotSrc(name: string, width: 480 | 960 = 480): string {
  return `/assets/img/${name}-${width}.webp`
}

export function screenshotSrcSet(name: string): string {
  return `${screenshotSrc(name, 480)} 480w, ${screenshotSrc(name, 960)} 960w`
}

export interface ExternalLink {
  label: string
  href: string
}

/** What the shipped Workout Director app and its backend are built with. Nothing that is only in testing. */
export const workoutDirectorStack = [
  'Swift',
  'SwiftUI',
  'SwiftData',
  'MediaPipe BlazePose',
  'Apple Vision',
  'WebRTC',
  'TypeScript',
  'AWS Lambda',
  'DynamoDB',
  'AWS CDK',
  'Better Auth',
  'Postgres',
] as const

export type StackItem = (typeof workoutDirectorStack)[number]

/** A few stack items under a short label, shown as tags on a project card. */
export interface StackGroup {
  label: string
  items: StackItem[]
}

/** The stack on the Workout Director card: a short pick from the full list, split into the app and its backend. */
export const workoutDirectorCardStack: StackGroup[] = [
  { label: 'App', items: ['SwiftUI', 'SwiftData', 'MediaPipe BlazePose', 'Apple Vision'] },
  { label: 'Backend', items: ['TypeScript', 'AWS Lambda', 'DynamoDB', 'AWS CDK'] },
]

export const workoutDirectorLinks: ExternalLink[] = [
  { label: 'App Store', href: links.workoutDirectorStore },
  { label: 'workoutdirector.com', href: links.workoutDirectorSite },
]

export interface ProjectCard {
  title: string
  href: string
  external: boolean
  summary: string
  meta: string
  logo: LogoName
  /** Outside links shown under the summary, such as the App Store listing. */
  links?: ExternalLink[]
  /** Stack tags shown under the links. */
  stack?: StackGroup[]
  /** Three phone screenshots in a row. */
  shots?: Screenshot[]
  /** Or an iPad and two iPhone screens, layered. */
  stage?: StageSpec
}

export const workoutDirectorCard: ProjectCard = {
  title: 'Workout Director',
  href: '/projects/workout-director/',
  external: false,
  summary:
    'An iPhone and iPad training app that counts reps with the front camera, on the device, while a voice coach talks you through the workout.',
  meta: 'iPhone and iPad app · Case study',
  logo: 'workoutDirector',
  links: workoutDirectorLinks,
  stack: workoutDirectorCardStack,
  // Trainer, not a push-up screen: the home hero already shows a push-up count (the 02-voice clip), so no image or
  // second push-up is repeated on the home page.
  stage: { ipad: '05-form', phones: ['06-trainer', '08-today'] },
}

/** The screens at the top of the case study. */
export const workoutDirectorHero: StageSpec = { ipad: '02-voice', phones: ['05-form', '07-progress'] }

export const kaloCard: ProjectCard = {
  title: 'Kalo',
  href: links.kaloStore,
  external: true,
  summary:
    'A macro and calorie tracker for iPhone with photo, voice and barcode logging, HealthKit, widgets and a share extension.',
  meta: 'SwiftUI · App Store',
  logo: 'kalo',
  // No screenshots: Kalo's App Store screens are light, and the site keeps every row of screens in one dark style.
}

export const projectCards = [workoutDirectorCard, kaloCard]

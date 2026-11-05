/**
 * Link preview images (Open Graph and Twitter), 1200 by 630. The per-page
 * cards are drawn by `pnpm og-images` (scripts/og-images.ts) into
 * public/assets/og/; the default card is the AK lockup on white.
 */
export interface OgImage {
  src: string
  alt: string
}

export const defaultOgImage: OgImage = {
  src: '/assets/og.png',
  alt: 'Ashish Kharche, with the AK mark.',
}

export const ogImages = {
  projects: {
    src: '/assets/og/projects.png',
    alt: 'Projects by Ashish Kharche: Workout Director and Kalo, with a Workout Director screen of a push-up set counted on the live camera.',
  },
  workoutDirector: {
    src: '/assets/og/workout-director.png',
    alt: 'Workout Director case study, with App Store screens for a counted push-up set and progress.',
  },
} satisfies Record<string, OgImage>

/** Preview cards for notes, by slug. */
export const noteOgImages = {
  'workout-director-1': {
    src: '/assets/og/notes-workout-director-1.png',
    alt: 'Understanding on-device rep counting in Workout Director and what it sends over the network. Workout Director, part 1.',
  },
  'workout-director-2': {
    src: '/assets/og/notes-workout-director-2.png',
    alt: 'How Workout Director’s exercise figures are rendered and checked against pose targets. Workout Director, part 2, with a start and end pose.',
  },
} satisfies Record<string, OgImage>

/** The preview image for a note, or the default card when it has none. */
export function noteOgImage(slug: string): OgImage {
  return (noteOgImages as Record<string, OgImage | undefined>)[slug] ?? defaultOgImage
}

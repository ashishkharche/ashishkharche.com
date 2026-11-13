import * as stylex from '@stylexjs/stylex'

const banners: Record<string, { name: string; alt: string; logo?: boolean }> = {
  'workout-director-1': {
    name: 'note-01-counting',
    alt: 'A squat exercise figure next to a Workout Director phone showing rep counting.',
  },
  'workout-director-2': {
    name: 'note-02-figure-pipeline',
    alt: 'Saved push-up rig points next to the finished exercise line art.',
  },
  reflex: {
    name: 'note-reflex-runner',
    alt: 'The Reflex wordmark in Space Grotesk, with the prism mark above it.',
    // Only a logo: on the note page it is cropped to a shallow 3:1 strip round the mark.
    logo: true,
  },
}

/** True when the note has a wide banner image. */
export function hasNoteBanner(slug: string): boolean {
  return slug in banners
}

/** A note's banner: in a list (16:9) or at the top of the note itself (`page`), where it loads straight away. */
export function NoteBanner({ slug, page = false }: { slug: string; page?: boolean }) {
  const banner = banners[slug]
  if (!banner) return null
  return (
    <img
      src={`/assets/banners/${banner.name}-1600x900.webp`}
      width={1600}
      height={900}
      alt={banner.alt}
      loading={page ? 'eager' : 'lazy'}
      decoding="async"
      {...stylex.props(styles.note, page && styles.page, page && banner.logo && styles.logo)}
    />
  )
}

export function PortfolioBanner({ priority = false }: { priority?: boolean }) {
  return (
    <div role="group" aria-label="Workout Director screens" {...stylex.props(styles.portfolio)}>
      <img
        src="/assets/banners/selected-work-wd-1600x1000.webp"
        width={1600}
        height={1000}
        alt="Workout Director outlined identity with squat coaching and trainer chat phones."
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...stylex.props(styles.work)}
      />
    </div>
  )
}

const styles = stylex.create({
  note: { display: 'block', width: '100%', height: 'auto', aspectRatio: '16 / 9', objectFit: 'cover' },
  page: { maxWidth: '52rem' },
  logo: { aspectRatio: '3 / 1', maxWidth: '40rem' },
  portfolio: { width: '100%', maxWidth: '32rem', marginInline: 'auto' },
  work: { display: 'block', width: '100%', height: 'auto', aspectRatio: '8 / 5', objectFit: 'cover' },
})

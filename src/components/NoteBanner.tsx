import * as stylex from '@stylexjs/stylex'

const banners: Record<string, { name: string; alt: string }> = {
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
    alt: 'One do Increment line goes into the Reflex prism and splits into Swift and Kotlin replies that both read count 2, with the line PARITY swift/kotlin same.',
  },
}

/** True when the note has a wide banner image. */
export function hasNoteBanner(slug: string): boolean {
  return slug in banners
}

export function NoteBanner({ slug }: { slug: string }) {
  const banner = banners[slug]
  if (!banner) return null
  return (
    <img
      src={`/assets/banners/${banner.name}-1600x900.webp`}
      width={1600}
      height={900}
      alt={banner.alt}
      loading="lazy"
      decoding="async"
      {...stylex.props(styles.note)}
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
  portfolio: { width: '100%', maxWidth: '32rem', marginInline: 'auto' },
  work: { display: 'block', width: '100%', height: 'auto', aspectRatio: '8 / 5', objectFit: 'cover' },
})

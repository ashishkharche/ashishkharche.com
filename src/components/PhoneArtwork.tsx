import * as stylex from '@stylexjs/stylex'

const descriptions = {
  'slick-v5-minimal-clean': 'Workout Director phone with a push-up figure above the camera view',
  'slick-v5-advanced-clean': 'Workout Director phone with a push-up figure, camera view and elbow-angle chart',
  'deadlift-pexels':
    'Workout Director phone showing a woman deadlifting in a brick gym, with 0 of 6 reps and Add weight',
  'pushup-balanced': 'Workout Director phone with a push-up figure, camera view and rep counter',
} as const

type Phone = keyof typeof descriptions
const widths = [240, 480, 800] as const
const path = (phone: Phone, width: number) =>
  phone === 'deadlift-pexels'
    ? `/assets/img/wd/iphone/deadlift-pexels-${width}.webp`
    : `/assets/phones/${phone}-${width}.webp`

/** Phone artwork fits the existing D1 media slot, never a full-width image row. */
export function PhoneArtwork({
  phones,
  label,
  priority = false,
  compact = false,
  xstyle,
}: {
  phones: readonly Phone[]
  label?: string
  priority?: boolean
  compact?: boolean
  xstyle?: stylex.StyleXStyles
}) {
  return (
    <div
      role={label ? 'group' : undefined}
      aria-label={label}
      {...stylex.props(styles.phones, compact && styles.compact, xstyle)}
    >
      {phones.map((phone, index) => (
        <img
          key={phone}
          src={path(phone, phone === 'deadlift-pexels' ? 400 : 240)}
          srcSet={(phone === 'deadlift-pexels' ? [400, 800] : widths)
            .map((width) => `${path(phone, width)} ${width}w`)
            .join(', ')}
          sizes={compact ? '86px' : '(max-width: 560px) 42vw, 188px'}
          width={phone === 'deadlift-pexels' ? 1320 : 1181}
          height={phone === 'deadlift-pexels' ? 2868 : 2558}
          alt={descriptions[phone]}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority && index === 0 ? 'high' : 'auto'}
          decoding="async"
          {...stylex.props(
            styles.phone,
            phone === 'deadlift-pexels' && styles.screen,
            phones.length === 1 && styles.single,
            compact && styles.small,
          )}
        />
      ))}
    </div>
  )
}

const styles = stylex.create({
  phones: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: '6%',
    width: '100%',
    maxWidth: '25rem',
    marginInline: 'auto',
  },
  phone: { display: 'block', width: '47%', maxWidth: '188px', height: 'auto', objectFit: 'contain' },
  screen: {
    borderTopLeftRadius: '9% 4.15%',
    borderTopRightRadius: '9% 4.15%',
    borderBottomLeftRadius: '9% 4.15%',
    borderBottomRightRadius: '9% 4.15%',
  },
  single: { width: '100%', maxWidth: '164px' },
  compact: { height: '100%', justifyContent: 'flex-start', marginInline: 0 },
  small: { width: 'auto', maxWidth: '100%', height: '100%' },
})

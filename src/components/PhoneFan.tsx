import * as stylex from '@stylexjs/stylex'
import { breakpoints } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'

/**
 * Three Workout Director phones held like a hand of cards. At rest they overlap in a tidy fan; when the card is
 * hovered or focused they spread, turn and lift with a little spring, so each screen can be read. With reduced
 * motion they stay in the tidy fan. The phones are the transparent exports in /assets/phones, shown at their own
 * shape (1181 by 2558) with nothing drawn on them.
 */
const phones = [
  {
    name: 'pushup-balanced',
    alt: 'Workout Director push-up screen with the exercise figure above the camera view and a 0 of 12 rep counter',
  },
  {
    name: 'squat-balanced',
    alt: 'Workout Director bodyweight squat screen with the exercise figure above the camera view and a 0 of 12 rep counter',
  },
  {
    name: 'trainer-demo',
    alt: 'Workout Director trainer chat answering what is next in the workout and where to find past sessions',
  },
] as const

const widths = [240, 480, 800] as const

export function PhoneFan({ priority = false }: { priority?: boolean }) {
  return (
    <div role="group" aria-label="Workout Director screens" {...stylex.props(styles.fan)}>
      {phones.map((phone, index) => (
        <img
          key={phone.name}
          src={`/assets/phones/${phone.name}-480.webp`}
          srcSet={widths.map((width) => `/assets/phones/${phone.name}-${width}.webp ${width}w`).join(', ')}
          sizes="(max-width: 560px) 46vw, (max-width: 1100px) 260px, 250px"
          width={1181}
          height={2558}
          alt={phone.alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...stylex.props(
            styles.phone,
            index === 0 && styles.left,
            index === 1 && styles.front,
            index === 2 && styles.right,
          )}
        />
      ))}
      <span aria-hidden="true" {...stylex.props(sk.rule, styles.ground)} />
    </div>
  )
}

const still = '@media (prefers-reduced-motion: reduce)'
// Each phone's transform holds its place at rest and fanned out, turning from its bottom centre.
// A soft spring: a quick start and a small overshoot before it settles.
const spring = 'cubic-bezier(0.34, 1.45, 0.5, 1)'

const styles = stylex.create({
  fan: {
    position: 'relative',
    width: '100%',
    maxWidth: { default: '38rem', [breakpoints.tablet]: '32rem', [breakpoints.phone]: '24rem' },
    marginInline: 'auto',
    // Tall enough for the phones and their lift, so nothing overlaps the next project.
    aspectRatio: { default: '1 / 0.98', [breakpoints.phone]: '1 / 1.02' },
  },
  phone: {
    position: 'absolute',
    left: '50%',
    bottom: '1.25rem',
    display: 'block',
    width: { default: '34%', [breakpoints.phone]: '42%' },
    height: 'auto',
    transformOrigin: '50% 100%',
    transitionProperty: 'transform, filter',
    transitionDuration: { default: '700ms', [still]: '0s' },
    transitionTimingFunction: spring,
    filter: {
      default: 'drop-shadow(0 6px 10px rgb(0 0 0 / 0.12))',
      '@media (prefers-reduced-motion: no-preference) and (min-width: 561px)': {
        default: 'drop-shadow(0 6px 10px rgb(0 0 0 / 0.12))',
        [stylex.when.ancestor(':hover')]: 'drop-shadow(0 22px 26px rgb(0 0 0 / 0.2))',
        [stylex.when.ancestor(':focus-within')]: 'drop-shadow(0 22px 26px rgb(0 0 0 / 0.2))',
      },
    },
    willChange: 'transform',
  },
  left: {
    zIndex: 1,
    transform: {
      default: 'translateX(-50%) translateX(-60%) rotate(-6deg)',
      [breakpoints.phone]: 'translateX(-50%) translateX(-46%) rotate(-6deg)',
      '@media (prefers-reduced-motion: no-preference) and (min-width: 561px)': {
        default: 'translateX(-50%) translateX(-60%) rotate(-6deg)',
        [stylex.when.ancestor(':hover')]: 'translateX(-50%) translateX(-84%) translateY(-2%) rotate(-8deg)',
        [stylex.when.ancestor(':focus-within')]: 'translateX(-50%) translateX(-84%) translateY(-2%) rotate(-8deg)',
      },
    },
  },
  front: {
    zIndex: 2,
    transform: {
      default: 'translateX(-50%)',
      '@media (prefers-reduced-motion: no-preference) and (min-width: 561px)': {
        default: 'translateX(-50%)',
        [stylex.when.ancestor(':hover')]: 'translateX(-50%) translateY(-6%) scale(1.04)',
        [stylex.when.ancestor(':focus-within')]: 'translateX(-50%) translateY(-6%) scale(1.04)',
      },
    },
    transitionDelay: { default: '30ms', [still]: '0s' },
  },
  right: {
    zIndex: 1,
    transform: {
      default: 'translateX(-50%) translateX(60%) rotate(6deg)',
      [breakpoints.phone]: 'translateX(-50%) translateX(46%) rotate(6deg)',
      '@media (prefers-reduced-motion: no-preference) and (min-width: 561px)': {
        default: 'translateX(-50%) translateX(60%) rotate(6deg)',
        [stylex.when.ancestor(':hover')]: 'translateX(-50%) translateX(84%) translateY(-2%) rotate(8deg)',
        [stylex.when.ancestor(':focus-within')]: 'translateX(-50%) translateX(84%) translateY(-2%) rotate(8deg)',
      },
    },
    transitionDelay: { default: '60ms', [still]: '0s' },
  },
  // A short pen line for the phones to stand on.
  ground: { position: 'absolute', left: '8%', right: '8%', bottom: '0.75rem', marginBlock: 0 },
})

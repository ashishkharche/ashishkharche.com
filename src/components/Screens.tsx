import * as stylex from '@stylexjs/stylex'
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react'
import {
  deviceSize,
  footageCredit,
  hasFootage,
  screen,
  screenPath,
  screenSrcSet,
  screenWidths,
  screens,
  stageSizes,
  type Device,
  type ScreenId,
  type StageSpec,
} from '~/content/workoutDirectorScreens'
import { breakpoints, colors, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

interface PictureProps {
  id: ScreenId
  device: Device
  sizes: string
  /** Empty for a decorative copy of a screen that is described elsewhere. */
  alt?: string
  eager?: boolean
  priority?: boolean
  xstyle?: stylex.StyleXStyles
}

/** The stock footage credit, shown under any group of screens that has a camera view in it. */
export function FootageCredit({ ids, xstyle }: { ids: readonly ScreenId[]; xstyle?: stylex.StyleXStyles }) {
  if (!hasFootage(ids)) return null
  return <p {...stylex.props(styles.credit, xstyle)}>{footageCredit(ids)}</p>
}

/**
 * One App Store screen as it is, with only rounded corners: AVIF where the browser takes it, WebP otherwise, at the
 * size it is shown. No frame, filter or tilt.
 */
export function ScreenPicture({ id, device, sizes, alt, eager = false, priority = false, xstyle }: PictureProps) {
  const { width, height } = deviceSize[device]
  return (
    <picture {...stylex.props(styles.picture)}>
      <source type="image/avif" srcSet={screenSrcSet(id, device, 'avif')} sizes={sizes} />
      <img
        src={screenPath(id, device, screenWidths[device][0], 'webp')}
        srcSet={screenSrcSet(id, device, 'webp')}
        sizes={sizes}
        width={width}
        height={height}
        alt={alt ?? screen(id).alt}
        loading={eager || priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        {...stylex.props(styles.img, device === 'ipad' ? styles.ipad : styles.iphone, xstyle)}
      />
    </picture>
  )
}

interface StageProps extends StageSpec {
  /** Load straight away, for a stage at the top of the page. */
  priority?: boolean
  label?: string
  /** Show the stock footage credit under the screens (left out on the home page). */
  credit?: boolean
  xstyle?: stylex.StyleXStyles
}

/**
 * The iPad screen and two iPhone screens side by side, bottoms level, each picture whole and straight on the page.
 * On phones the second iPhone is left out so the others keep a readable size.
 */
export function DeviceStage({ ipad, phones, priority = false, label, credit = true, xstyle }: StageProps) {
  return (
    <div {...stylex.props(styles.wrap, xstyle)}>
      <div role={label ? 'group' : undefined} aria-label={label} {...stylex.props(styles.devices)}>
        <div {...stylex.props(styles.devIpad)}>
          <ScreenPicture id={ipad} device="ipad" sizes={stageSizes.ipad} priority={priority} />
        </div>
        <div {...stylex.props(styles.devPhone)}>
          <ScreenPicture id={phones[0]} device="iphone" sizes={stageSizes.iphone} eager={priority} />
        </div>
        <div {...stylex.props(styles.devPhone, styles.devPhoneLast)}>
          <ScreenPicture id={phones[1]} device="iphone" sizes={stageSizes.iphone} />
        </div>
      </div>
      {credit ? <FootageCredit ids={[ipad, ...phones]} /> : null}
    </div>
  )
}

interface PairProps {
  /** The phone in front first, then the one behind it. */
  phones: readonly [ScreenId, ScreenId]
  label: string
  priority?: boolean
  credit?: boolean
  xstyle?: stylex.StyleXStyles
}

/** Two iPhone screens side by side, bottoms level, straight on the page. */
export function PhonePair({ phones, label, priority = false, credit = true, xstyle }: PairProps) {
  const sizes = '(max-width: 560px) 44vw, (max-width: 1100px) 22vw, 250px'
  return (
    <div {...stylex.props(styles.wrap, xstyle)}>
      <div role="group" aria-label={label} {...stylex.props(styles.pair)}>
        <div {...stylex.props(styles.pairPhone)}>
          <ScreenPicture id={phones[0]} device="iphone" sizes={sizes} priority={priority} />
        </div>
        <div {...stylex.props(styles.pairPhone)}>
          <ScreenPicture id={phones[1]} device="iphone" sizes={sizes} eager={priority} />
        </div>
      </div>
      {credit ? <FootageCredit ids={phones} /> : null}
    </div>
  )
}

/** Three screens side by side, with a caption, inside the text column. */
export function Shots({ screens: ids, caption }: { screens: ScreenId[]; caption: string }) {
  return (
    <figure {...stylex.props(styles.shots)}>
      {ids.map((id) => (
        <ScreenPicture key={id} id={id} device="iphone" sizes="(max-width: 560px) 30vw, 210px" xstyle={styles.edge} />
      ))}
      <figcaption {...stylex.props(styles.caption, styles.fullRow)}>
        {caption}
        {hasFootage(ids) ? ` ${footageCredit(ids)}` : null}
      </figcaption>
    </figure>
  )
}

const noop = () => () => {}
const isClient = () => true
const isServer = () => false

/**
 * Every screen for one device in a row that scrolls sideways and snaps to each
 * screen. The row takes keyboard focus, so arrow keys scroll it. Once the page
 * has hydrated, Previous and Next buttons appear as well.
 */
export function ScreenRail({ device, title }: { device: Device; title: string }) {
  const headingId = useId()
  const railId = useId()
  const rail = useRef<HTMLDivElement>(null)
  const hydrated = useSyncExternalStore(noop, isClient, isServer)
  const [edges, setEdges] = useState({ start: true, end: false })

  const update = useCallback(() => {
    const el = rail.current
    if (!el) return
    const start = el.scrollLeft <= 4
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [])

  useEffect(() => {
    const el = rail.current
    if (!el) return
    const frame = requestAnimationFrame(update)
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [update])

  const move = (direction: 1 | -1) => {
    if (direction === 1 ? edges.end : edges.start) return
    const el = rail.current
    const item = el?.querySelector('li')
    if (!el || !item) return
    const step = item.getBoundingClientRect().width + 16
    const perPage = Math.max(1, Math.floor(el.clientWidth / step))
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: direction * perPage * step, behavior: smooth ? 'smooth' : 'auto' })
  }

  const sizes = device === 'ipad' ? '(max-width: 560px) 260px, 400px' : '(max-width: 560px) 180px, 240px'
  return (
    <section aria-labelledby={headingId} {...stylex.props(styles.railSection)}>
      <div {...stylex.props(styles.railHead)}>
        <h3 id={headingId} {...stylex.props(ui.h3)}>
          {title} <span {...stylex.props(styles.count)}>{screens.length} screens</span>
        </h3>
        {hydrated ? (
          <div {...stylex.props(styles.buttons)}>
            <button
              type="button"
              aria-controls={railId}
              aria-label={`Previous ${title} screens`}
              aria-disabled={edges.start}
              onClick={() => move(-1)}
              {...stylex.props(styles.button, edges.start && styles.buttonOff, ui.focusRing)}
            >
              <Arrow flip />
            </button>
            <button
              type="button"
              aria-controls={railId}
              aria-label={`Next ${title} screens`}
              aria-disabled={edges.end}
              onClick={() => move(1)}
              {...stylex.props(styles.button, edges.end && styles.buttonOff, ui.focusRing)}
            >
              <Arrow />
            </button>
          </div>
        ) : null}
      </div>
      <div
        ref={rail}
        id={railId}
        role="group"
        aria-label={`${title} screens, scrolls sideways`}
        tabIndex={0}
        {...stylex.props(styles.rail, ui.focusRing)}
      >
        <ol role="list" {...stylex.props(styles.list)}>
          {screens.map((item, index) => (
            <li key={item.id} {...stylex.props(styles.item, device === 'ipad' ? styles.itemIpad : styles.itemIphone)}>
              <figure>
                {/* Only the picture eases in, so the caption keeps its full contrast. */}
                <ScreenPicture
                  id={item.id as ScreenId}
                  device={device}
                  sizes={sizes}
                  xstyle={[styles.edge, styles.reveal]}
                />
                <figcaption {...stylex.props(styles.label)}>
                  <span aria-hidden="true" {...stylex.props(styles.number)}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.label}
                </figcaption>
              </figure>
            </li>
          ))}
        </ol>
      </div>
      <FootageCredit ids={screens.map((item) => item.id as ScreenId)} />
    </section>
  )
}

function Arrow({ flip = false }: { flip?: boolean }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" {...stylex.props(flip && styles.flip)}>
      <path
        d="M4 10h11M11 5.5 15.5 10 11 14.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Scroll-driven motion only where the browser supports it. The global reset in
// global.css switches every animation off when reduced motion is asked for.
const SCROLL_DRIVEN = '@supports (animation-timeline: view())'

const settle = stylex.keyframes({
  from: { opacity: 0.55, transform: 'scale(0.94)' },
  to: { opacity: 1, transform: 'none' },
})

const styles = stylex.create({
  wrap: { position: 'relative', minWidth: 0 },
  pair: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '6%' },
  pairPhone: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  devices: { display: 'flex', alignItems: 'flex-end', gap: { default: '3%', [breakpoints.phone]: '4%' } },
  devIpad: { flexGrow: 0, flexShrink: 0, flexBasis: { default: '56%', [breakpoints.phone]: '62%' }, minWidth: 0 },
  devPhone: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  devPhoneLast: { display: { default: 'block', [breakpoints.phone]: 'none' } },
  picture: { display: 'contents' },
  img: { display: 'block', width: '100%', height: 'auto' },
  // Rounded to match the corners of the App Store panels.
  iphone: {
    borderTopLeftRadius: '9% 4.15%',
    borderTopRightRadius: '9% 4.15%',
    borderBottomLeftRadius: '9% 4.15%',
    borderBottomRightRadius: '9% 4.15%',
  },
  ipad: {
    borderTopLeftRadius: '4.5% 3.4%',
    borderTopRightRadius: '4.5% 3.4%',
    borderBottomLeftRadius: '4.5% 3.4%',
    borderBottomRightRadius: '4.5% 3.4%',
  },
  // No outline or shadow: the screen itself, with its rounded corners.
  edge: {},
  shots: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: { default: '1rem', [breakpoints.phone]: '0.6rem' },
    marginBlock: '2.25rem',
  },
  fullRow: { gridColumnStart: 1, gridColumnEnd: -1 },
  caption: {
    marginTop: '0.7rem',
    fontSize: type.meta,
    lineHeight: 1.5,
    color: colors.muted,
  },
  railSection: { marginTop: '2rem' },
  credit: {
    marginTop: '0.75rem',
    marginBottom: 0,
    fontSize: type.meta,
    lineHeight: 1.5,
    color: colors.muted,
  },
  railHead: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    marginBottom: '1rem',
    minHeight: '40px',
  },
  count: { marginLeft: '0.5rem', fontSize: type.meta, fontWeight: weights.regular, color: colors.muted },
  buttons: { display: 'flex', gap: '0.5rem' },
  button: {
    display: 'grid',
    placeItems: 'center',
    width: '40px',
    height: '40px',
    padding: 0,
    borderRadius: '999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.line,
    backgroundColor: { default: colors.bg, ':hover': colors.soft },
    color: colors.text,
    cursor: 'pointer',
    transitionProperty: 'background-color, opacity',
    transitionDuration: '0.15s',
  },
  // aria-disabled rather than disabled, so a button keeps keyboard focus at the end of the row.
  buttonOff: { opacity: 0.4, cursor: 'default', backgroundColor: colors.bg },
  flip: { transform: 'scaleX(-1)' },
  rail: {
    overflowX: 'auto',
    overscrollBehaviorX: 'contain',
    scrollSnapType: 'x mandatory',
    scrollbarWidth: 'thin',
    paddingBottom: '1rem',
    borderRadius: '12px',
  },
  list: { display: 'flex', gap: '16px', listStyle: 'none', paddingInline: '2px', paddingTop: '2px' },
  item: { flex: 'none', scrollSnapAlign: 'start' },
  itemIphone: { width: { default: '240px', [breakpoints.phone]: '180px' } },
  itemIpad: { width: { default: '400px', [breakpoints.phone]: '260px' } },
  reveal: {
    animationName: { default: null, [SCROLL_DRIVEN]: settle },
    animationTimingFunction: 'ease-out',
    animationFillMode: 'both',
    animationTimeline: { default: null, [SCROLL_DRIVEN]: 'view(inline)' },
    // eslint-disable-next-line @stylexjs/valid-styles -- valid CSS that the plugin does not list yet
    animationRangeStart: 'entry 0%',
    // eslint-disable-next-line @stylexjs/valid-styles -- as above
    animationRangeEnd: 'entry 70%',
  },
  label: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
    marginTop: '0.75rem',
    fontSize: type.meta,
    color: colors.muted,
  },
  number: { fontVariantNumeric: 'tabular-nums', color: colors.text, fontWeight: weights.medium },
})

import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { DesignExcece } from '~/components/design/Excece'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { RailNumber } from '~/components/RailNumber'
import { seo } from '~/lib/seo'
import { sk } from '~/styles/sketch'
import { breakpoints, colors, fonts, leading, space, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export const Route = createFileRoute('/design')({
  head: () =>
    seo({
      path: '/design/',
      title: 'Design',
      description:
        'Design by Ashish Kharche: the Workout Director brand and Live Coach screens, rendered exercise figures, Kalo and the excece icon.',
    }),
  component: Design,
})

const d = '/assets/design'

/** One picture for the light theme and one for the dark, swapped with the site theme. */
function Themed({
  light,
  dark,
  width,
  height,
  alt,
  xstyle,
  lightStyle,
  darkStyle,
}: {
  light: string
  dark: string
  width: number
  height: number
  alt: string
  xstyle?: stylex.StyleXStyles
  lightStyle?: stylex.StyleXStyles
  darkStyle?: stylex.StyleXStyles
}) {
  return (
    <>
      <img
        src={light}
        width={width}
        height={height}
        alt={alt}
        loading="lazy"
        decoding="async"
        data-theme-image="light"
        {...stylex.props(xstyle, lightStyle, styles.sun)}
      />
      <img
        src={dark}
        width={width}
        height={height}
        alt={alt}
        loading="lazy"
        decoding="async"
        data-theme-image="dark"
        {...stylex.props(xstyle, darkStyle, styles.moon)}
      />
    </>
  )
}

function Head({ n, rail, id, title }: { n: string; rail: string; id: string; title: React.ReactNode }) {
  return (
    <>
      <div {...stylex.props(ui.railText, styles.railHead)}>
        <RailNumber n={n} />
        <span>{rail}</span>
      </div>
      <h2 id={id} {...stylex.props(ui.h2, styles.title)}>
        {title}
      </h2>
    </>
  )
}

// Lockups: the light files are dark marks for light grounds and the ink files white marks for dark grounds. Where a
// lockup has only one of the two, a filter sets the same shape solid in the other colour.
const lockups = [
  {
    name: 'single-line',
    light: 'wd-logo-single-line-ink',
    dark: 'wd-logo-single-line-ink',
    lightSolid: true,
    darkSolid: false,
    size: [240.23, 48],
    alt: 'Workout Director logo on one line',
    xstyle: 'line',
  },
  {
    name: 'stacked-left',
    light: 'wd-logo-stacked-left-mist',
    dark: 'wd-logo-stacked-left-ink',
    lightSolid: false,
    darkSolid: false,
    size: [146, 48],
    alt: 'Workout Director logo, symbol left of the stacked name',
    xstyle: 'stacked',
  },
  {
    name: 'stacked-right',
    light: 'wd-logo-stacked-right-cloud',
    dark: 'wd-logo-stacked-right-cloud',
    lightSolid: false,
    darkSolid: true,
    size: [146, 48],
    alt: 'Workout Director logo, symbol right of the stacked name',
    xstyle: 'stacked',
  },
  {
    name: 'centred-stack',
    light: 'wd-logo-centred-stack-sage',
    dark: 'wd-logo-centred-stack-sage',
    lightSolid: false,
    darkSolid: true,
    size: [96, 85.7],
    alt: 'Workout Director logo, symbol centred above the name',
    xstyle: 'centred',
  },
  {
    name: 'symbol-above-line',
    light: 'wd-logo-symbol-above-line-mist',
    dark: 'wd-logo-symbol-above-line-mist',
    lightSolid: false,
    darkSolid: true,
    size: [190.23, 71.05],
    alt: 'Workout Director logo, symbol above the name on one line',
    xstyle: 'above',
  },
] as const

const palette = [
  ['Ink', '#090A0B'],
  ['Coral', '#FF4438'],
  ['Cloud', '#F1F6F3'],
  ['Sage', '#DCE6D7'],
  ['Mist', '#95A3A1'],
  ['White', '#FFFFFF'],
] as const

const figures = [
  ['push-up-start', 'Push-up'],
  ['barbell-deadlift-start', 'Deadlift'],
  ['barbell-deadlift-end', 'Deadlift lockout'],
  ['goblet-squat-start', 'Goblet squat'],
  ['pull-ups-start', 'Pull-up'],
  ['dumbbell-curl-end', 'Dumbbell curl'],
  ['farmers-walk-start', 'Farmer’s walk'],
  ['standing-military-press-start', 'Military press'],
  ['kneeling-hip-flexor-start', 'Hip flexor stretch'],
  ['side-bridge-start', 'Side bridge'],
  ['hack-squat-start', 'Hack squat'],
  ['plank-start', 'Plank'],
] as const

const kaloScreens = [
  {
    light: 'dark-today-gauge',
    dark: 'dark-today-gauge',
    alt: 'Kalo Today screen with the four-arc ring for calories, protein, carbs and fat',
  },
  {
    light: 'light-meals-b-grid',
    dark: 'dark-meals-b-grid',
    alt: 'Kalo Meals screen with meals as photo tiles',
  },
  { light: 'light-review-b-bag', dark: 'light-review-b-bag', alt: 'Kalo meal review screen' },
  { light: 'light-chat-thread', dark: 'light-chat-thread', alt: 'Kalo chat screen' },
] as const

function Design() {
  return (
    <Main>
      <PageHead title="Design" lead="Brand, screens and figures for Workout Director, Kalo and excece." figure="curl" />

      <section aria-labelledby="design-wd" {...stylex.props(ui.wrap, styles.first)}>
        <div {...stylex.props(ui.rail)}>
          <Head n="01" rail="Brand" id="design-wd" title="Workout Director" />
          <span {...stylex.props(styles.railGap)} />
          <div {...stylex.props(styles.content)}>
            <p {...stylex.props(styles.text)}>
              Workout Director is a Shelgaon Ltd app. Its icon, lockups, colours and type.
            </p>
            <div {...stylex.props(styles.brandRow)}>
              <figure {...stylex.props(styles.iconStand)}>
                <img
                  src={`${d}/wd/wd-app-icon-480.webp`}
                  width={480}
                  height={480}
                  alt="Workout Director app icon"
                  loading="lazy"
                  decoding="async"
                  {...stylex.props(styles.appIcon)}
                />
                <span aria-hidden="true" {...stylex.props(sk.rule, styles.ground)} />
              </figure>
              <ul role="list" aria-label="Workout Director lockups" {...stylex.props(styles.lockups)}>
                {lockups.map((lockup) => (
                  <li key={lockup.name} {...stylex.props(styles.lockupCell)}>
                    <Themed
                      light={`${d}/wd/${lockup.light}.svg`}
                      dark={`${d}/wd/${lockup.dark}.svg`}
                      width={lockup.size[0]}
                      height={lockup.size[1]}
                      alt={lockup.alt}
                      xstyle={[styles.lockup, styles[lockup.xstyle]]}
                      lightStyle={lockup.lightSolid && styles.solidDark}
                      darkStyle={lockup.darkSolid && styles.solidLight}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <ul role="list" aria-label="Workout Director colours" {...stylex.props(styles.palette)}>
              {palette.map(([name, hex]) => (
                <li key={name} {...stylex.props(styles.swatchItem)}>
                  <span aria-hidden="true" {...stylex.props(styles.swatch, swatches[name])} />
                  <span {...stylex.props(styles.swatchName)}>{name}</span>
                  <span {...stylex.props(styles.mono)}>{hex}</span>
                </li>
              ))}
            </ul>
            <div {...stylex.props(styles.typeRow)}>
              <p {...stylex.props(styles.specimen)}>
                <span aria-hidden="true" {...stylex.props(styles.specimenSans)}>
                  Aa
                </span>
                <span {...stylex.props(styles.specimenLabel)}>DM Sans</span>
              </p>
              <p {...stylex.props(styles.specimen)}>
                <span aria-hidden="true" {...stylex.props(styles.specimenMono)}>
                  0/12
                </span>
                <span {...stylex.props(styles.specimenLabel)}>DM Mono</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="design-live-coach" {...stylex.props(ui.wrap, ui.penSection)}>
        <div {...stylex.props(ui.rail)}>
          <Head n="02" rail="Screens" id="design-live-coach" title="Live Coach" />
          <span {...stylex.props(styles.railGap)} />
          <div {...stylex.props(styles.content)}>
            <p {...stylex.props(styles.text)}>
              Workout Director’s Live Coach design in its minimal and advanced modes, with the first App Store
              screenshot.
            </p>
            <div {...stylex.props(styles.stands)}>
              <figure {...stylex.props(styles.stand, styles.pair)}>
                <div role="group" aria-label="Live Coach design" {...stylex.props(styles.phones)}>
                  {(['minimal', 'advanced'] as const).map((mode) => (
                    <img
                      key={mode}
                      src={`/assets/phones/slick-v5-${mode}-clean-480.webp`}
                      srcSet={[240, 480, 800]
                        .map((w) => `/assets/phones/slick-v5-${mode}-clean-${w}.webp ${w}w`)
                        .join(', ')}
                      sizes="(max-width: 560px) 44vw, 272px"
                      width={1181}
                      height={2558}
                      alt={
                        mode === 'minimal'
                          ? 'Live Coach design, minimal mode: a push-up figure over the camera view'
                          : 'Live Coach design, advanced mode: a push-up figure, the camera view and an elbow-angle chart'
                      }
                      loading="lazy"
                      decoding="async"
                      {...stylex.props(styles.phone)}
                    />
                  ))}
                </div>
                <span aria-hidden="true" {...stylex.props(sk.rule, styles.ground)} />
                <figcaption {...stylex.props(styles.caption)}>
                  Minimal and advanced.{' '}
                  <Link to="/credits/" {...stylex.props(ui.link, ui.quietLink)}>
                    Camera still credit
                  </Link>
                </figcaption>
              </figure>
              <figure {...stylex.props(styles.stand, styles.single)}>
                <img
                  src={`${d}/wd/appstore-01-rep-counting-480.webp`}
                  srcSet={`${d}/wd/appstore-01-rep-counting-480.webp 480w, ${d}/wd/appstore-01-rep-counting-960.webp 960w`}
                  sizes="(max-width: 560px) 44vw, 272px"
                  width={1320}
                  height={2868}
                  alt="Workout Director App Store screenshot: reps counted on the live camera"
                  loading="lazy"
                  decoding="async"
                  {...stylex.props(styles.phone, styles.screen)}
                />
                <span aria-hidden="true" {...stylex.props(sk.rule, styles.ground)} />
                <figcaption {...stylex.props(styles.caption)}>
                  App Store.{' '}
                  <Link to="/credits/" {...stylex.props(ui.link, ui.quietLink)}>
                    Footage credit
                  </Link>
                </figcaption>
              </figure>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="design-figures" {...stylex.props(ui.wrap, ui.penSection)}>
        <div {...stylex.props(ui.rail)}>
          <Head n="03" rail="Illustration" id="design-figures" title="Exercise figures" />
          <span {...stylex.props(styles.railGap)} />
          <div {...stylex.props(styles.content)}>
            <p {...stylex.props(styles.text, styles.textWide)}>
              Rendered, not drawn or traced. One MakeHuman/MPFB2 CC0 body on a 163-bone rig is posed in Blender 4.2 from
              a JSON spec for each exercise, with the equipment built in code. Each pose is checked against MediaPipe
              keypoints from reference media, which is never traced or shipped. Cycles cel shading and Freestyle line
              art finish it, with coral on the target muscle.
            </p>
            <ul role="list" aria-label="Exercise figures" {...stylex.props(styles.figures)}>
              {figures.map(([file, name]) => (
                <li key={file}>
                  <figure {...stylex.props(styles.figureItem)}>
                    <Themed
                      light={`${d}/figures/${file}-light.webp`}
                      dark={`${d}/figures/${file}-dark.webp`}
                      width={720}
                      height={480}
                      alt={`${name} figure`}
                      xstyle={styles.figureImage}
                    />
                    <figcaption {...stylex.props(styles.caption)}>{name}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="design-kalo" {...stylex.props(ui.wrap, ui.penSection)}>
        <div {...stylex.props(ui.rail)}>
          <Head
            n="04"
            rail="Screens"
            id="design-kalo"
            title={
              <>
                <span {...stylex.props(ui.visuallyHidden)}>Kalo</span>
                <Themed
                  light={`${d}/kalo/kalo-wordmark-ink.svg`}
                  dark={`${d}/kalo/kalo-wordmark-white.svg`}
                  width={2032.5}
                  height={1060.5}
                  alt=""
                  xstyle={styles.wordmark}
                />
              </>
            }
          />
          <span {...stylex.props(styles.railGap)} />
          <div {...stylex.props(styles.content)}>
            <div {...stylex.props(styles.kaloIntro)}>
              <img
                src={`${d}/kalo/kalo-icon-480.webp`}
                width={480}
                height={480}
                alt="Kalo app icon"
                loading="lazy"
                decoding="async"
                {...stylex.props(styles.kaloIcon)}
              />
              <p {...stylex.props(styles.text)}>
                Kalo is a food app first, so meals appear as photo tiles on a white canvas, with one four-arc ring for
                calories, protein, carbs and fat. It shares Workout Director’s type, spacing and components.
              </p>
            </div>
            <figure {...stylex.props(styles.kaloFigure)}>
              <div role="group" aria-label="Kalo screens" {...stylex.props(styles.kaloScreens)}>
                {kaloScreens.map((screen) => (
                  <div key={screen.light} {...stylex.props(styles.kaloScreen)}>
                    <Themed
                      light={`${d}/kalo/${screen.light}-600.webp`}
                      dark={`${d}/kalo/${screen.dark}-600.webp`}
                      width={600}
                      height={1304}
                      alt={screen.alt}
                      xstyle={[styles.phone, styles.screen, styles.kaloImage]}
                    />
                  </div>
                ))}
              </div>
              <span aria-hidden="true" {...stylex.props(sk.rule, styles.ground, styles.groundFlush)} />
              <figcaption {...stylex.props(styles.caption)}>
                <Link to="/credits/" {...stylex.props(ui.link, ui.quietLink)}>
                  Food photos via Pexels
                </Link>
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <DesignExcece n="05" />
    </Main>
  )
}

// The swatch fills are classes, not inline styles, which the CSP blocks.
const swatches = stylex.create({
  Ink: { backgroundColor: '#090A0B' },
  Coral: { backgroundColor: '#FF4438' },
  Cloud: { backgroundColor: '#F1F6F3' },
  Sage: { backgroundColor: '#DCE6D7' },
  Mist: { backgroundColor: '#95A3A1' },
  White: { backgroundColor: '#FFFFFF' },
})

const styles = stylex.create({
  sun: { display: colors.sunDisplay },
  moon: { display: colors.moonDisplay },
  // The page head’s ground line already sits above the first section, so it has no pen line of its own.
  first: { marginTop: space.s48 },
  railHead: {
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.tablet]: 'row' },
    alignItems: { default: 'flex-start', [breakpoints.tablet]: 'center' },
    gap: { default: space.s8, [breakpoints.tablet]: space.s16 },
  },
  title: { margin: 0 },
  railGap: { display: { default: 'block', [breakpoints.tablet]: 'none' } },
  content: { minWidth: 0, display: 'grid', rowGap: { default: space.s96, [breakpoints.phone]: space.s48 } },
  text: { maxWidth: '34rem', fontSize: type.body, lineHeight: leading.body, color: colors.muted },
  textWide: { maxWidth: '40rem' },
  caption: { marginTop: space.s16, fontSize: type.meta, lineHeight: leading.meta, color: colors.muted },
  ground: { marginInline: '-4%' },
  groundFlush: { marginInline: 0, marginLeft: '-1rem' },

  brandRow: {
    display: 'grid',
    gridTemplateColumns: { default: '16rem 1fr', [breakpoints.tablet]: '13rem 1fr', [breakpoints.phone]: '1fr' },
    alignItems: 'center',
    columnGap: space.s96,
    rowGap: space.s48,
  },
  iconStand: { margin: 0, width: { default: '16rem', [breakpoints.phone]: '11rem' } },
  appIcon: {
    display: 'block',
    width: '100%',
    height: 'auto',
    aspectRatio: '1',
    marginBottom: space.s16,
    borderRadius: '22.37%',
    boxShadow: `0 0 0 1px ${colors.phoneEdge}`,
  },
  lockups: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    alignItems: 'center',
    columnGap: { default: space.s48, [breakpoints.phone]: space.s24 },
    rowGap: { default: space.s48, [breakpoints.phone]: space.s24 },
  },
  lockupCell: { display: 'flex', alignItems: 'center', minHeight: { default: '7rem', [breakpoints.phone]: '5rem' } },
  lockup: { height: 'auto', maxWidth: '100%' },
  line: { width: '15rem' },
  stacked: { width: '12rem' },
  centred: { width: '7rem' },
  above: { width: '14rem' },
  solidDark: { filter: 'brightness(0)' },
  solidLight: { filter: 'brightness(0) invert(1)' },

  palette: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(6, minmax(0, 1fr))',
      [breakpoints.phone]: 'repeat(3, minmax(0, 1fr))',
    },
    columnGap: space.s24,
    rowGap: space.s48,
  },
  swatchItem: { display: 'flex', flexDirection: 'column', gap: space.s8, minWidth: 0 },
  swatch: {
    display: 'block',
    width: '100%',
    maxWidth: '6rem',
    aspectRatio: '1',
    borderRadius: '50%',
    boxShadow: `inset 0 0 0 1px ${colors.line}`,
    marginBottom: space.s8,
  },
  swatchName: { fontSize: type.meta, lineHeight: leading.meta, color: colors.text },
  mono: { fontFamily: fonts.dmMono, fontSize: type.meta, lineHeight: leading.meta, color: colors.muted },

  typeRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    columnGap: space.s48,
  },
  specimen: { display: 'flex', flexDirection: 'column', gap: space.s16, margin: 0 },
  specimenSans: {
    fontFamily: fonts.dmSans,
    fontSize: type.display,
    lineHeight: 1,
    fontWeight: weights.brand,
    letterSpacing: '-0.03em',
    color: colors.text,
  },
  specimenMono: {
    fontFamily: fonts.dmMono,
    fontSize: type.display,
    lineHeight: 1,
    fontWeight: weights.regular,
    letterSpacing: '-0.04em',
    color: colors.text,
  },
  specimenLabel: { fontSize: type.meta, lineHeight: leading.meta, color: colors.muted },

  stands: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    columnGap: space.s96,
    rowGap: space.s48,
  },
  stand: { margin: 0, minWidth: 0 },
  pair: { width: { default: '36rem', [breakpoints.phone]: '100%' }, maxWidth: '100%' },
  single: { width: { default: '17rem', [breakpoints.phone]: '46%' } },
  phones: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: '6%',
    paddingBottom: space.s16,
  },
  phone: { display: 'block', width: '100%', maxWidth: '17rem', height: 'auto', minWidth: 0 },
  screen: {
    borderTopLeftRadius: '9% 4.15%',
    borderTopRightRadius: '9% 4.15%',
    borderBottomLeftRadius: '9% 4.15%',
    borderBottomRightRadius: '9% 4.15%',
    boxShadow: `0 0 0 1px ${colors.phoneEdge}`,
  },

  figures: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(3, minmax(0, 1fr))',
      [breakpoints.phone]: 'repeat(2, minmax(0, 1fr))',
    },
    columnGap: { default: space.s48, [breakpoints.phone]: space.s16 },
    rowGap: { default: space.s48, [breakpoints.phone]: space.s24 },
  },
  figureItem: { margin: 0 },
  figureImage: { width: '100%', height: 'auto', aspectRatio: '3 / 2' },

  wordmark: {
    width: 'auto',
    height: { default: '3rem', [breakpoints.phone]: '2.5rem' },
    aspectRatio: '2032.5 / 1060.5',
  },
  kaloIntro: {
    display: 'flex',
    alignItems: 'center',
    flexDirection: { default: 'row', [breakpoints.phone]: 'column' },
    alignSelf: 'start',
    justifyItems: 'start',
    gap: { default: space.s48, [breakpoints.phone]: space.s24 },
  },
  kaloIcon: {
    display: 'block',
    flexShrink: 0,
    alignSelf: { default: 'center', [breakpoints.phone]: 'flex-start' },
    width: { default: '8rem', [breakpoints.phone]: '6rem' },
    height: 'auto',
    aspectRatio: '1',
    borderRadius: '22.37%',
    boxShadow: `0 0 0 1px ${colors.phoneEdge}`,
  },
  kaloFigure: { margin: 0 },
  kaloScreens: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(4, minmax(0, 1fr))',
      [breakpoints.phone]: 'repeat(2, minmax(0, 1fr))',
    },
    alignItems: 'end',
    columnGap: { default: space.s48, [breakpoints.tablet]: space.s24, [breakpoints.phone]: space.s16 },
    rowGap: space.s24,
    paddingBottom: space.s16,
  },
  kaloScreen: { minWidth: 0 },
  kaloImage: { maxWidth: 'none' },
})

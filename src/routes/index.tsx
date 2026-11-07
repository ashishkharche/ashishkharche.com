import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Availability } from '~/components/Availability'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { NoteList } from '~/components/NoteList'
import { ProjectCard } from '~/components/ProjectCard'
import { Figure, Leg } from '~/components/Scene'
import { PhonePairGround } from '~/components/Screens'
import { SectionHead } from '~/components/SectionHead'
import { SketchArrow } from '~/components/SketchArrow'
import { kaloCard, workoutDirectorCard, workoutDirectorLinks } from '~/content/projects'
import { noteListSummary, notes } from '~/content/notes'
import type { ScreenId } from '~/content/workoutDirectorScreens'
import { site } from '~/content/site'
import { formatShortDate } from '~/lib/dates'
import { seo } from '~/lib/seo'
import { homeJsonLd, jsonLdScript } from '~/lib/structuredData'
import { breakpoints, colors, fonts, type, weights } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'
import { ui } from '~/styles/ui'

// Two different moves: the push-up count in front of a deadlift. Neither is on the Selected work card below, so no
// image is shown twice on the page (tests/e2e/home-unique-images.spec.ts).
const heroPhones: readonly [ScreenId, ScreenId] = ['pushup-mixkit', 'deadlift-pexels']

const homeSeo = seo({
  path: '/',
  fullTitle: 'Ashish Kharche · Software engineer in London',
  description: site.description,
  type: 'profile',
})

export const Route = createFileRoute('/')({
  head: () => ({
    meta: homeSeo.meta,
    // React preloads the front phone itself (it has fetchPriority="high").
    links: homeSeo.links,
    scripts: [jsonLdScript(homeJsonLd)],
  }),
  component: Home,
})

function Home() {
  const latestNotes = notes.slice(0, 3).map((note) => ({
    title: note.title,
    href: note.path,
    meta: `${formatShortDate(note.date)} · ${note.listLabel}`,
    summary: noteListSummary(note),
  }))
  return (
    <Main>
      {/*
        One drawn line runs down the whole page, like the ground of the footer drawing: it starts at the
        left edge under the intro, turns down at each side and becomes the ground each part stands on.
      */}
      <Leg from="edge" labelledBy="intro-title" xstyle={styles.heroLeg}>
        <div {...stylex.props(styles.hero)}>
          <div {...stylex.props(styles.intro)}>
            <p {...stylex.props(styles.kicker)}>Software engineer · {site.city}</p>
            <h1 id="intro-title" {...stylex.props(styles.title)}>
              Hi, I'm Ashish.
            </h1>
            <p {...stylex.props(styles.lead)}>
              I work on iOS and Android apps, AI features and the AWS backend behind them.
            </p>
            <ul role="list" aria-label="Links" {...stylex.props(styles.links)}>
              <li>
                <Link to="/work/" {...stylex.props(ui.link, ui.plainLink)}>
                  Work history
                </Link>
              </li>
              <li>
                <a href={`mailto:${site.email}`} {...stylex.props(ui.link, ui.plainLink)}>
                  Email
                </a>
              </li>
              <li>
                <a href={site.linkedin} {...stylex.props(ui.link, ui.plainLink)}>
                  LinkedIn
                </a>
              </li>
              <li>
                <a href={site.github} {...stylex.props(ui.link, ui.plainLink)}>
                  GitHub
                </a>
              </li>
              <li>
                <a href={site.x} rel="me noopener" {...stylex.props(ui.link, ui.plainLink)}>
                  X
                </a>
              </li>
            </ul>

            <div aria-labelledby="wd-title" role="group" {...stylex.props(styles.app)}>
              <div {...stylex.props(styles.appHead)}>
                <Logo name="workoutDirector" size={44} />
                <div>
                  <p id="wd-title" {...stylex.props(styles.appName)}>
                    Workout Director
                  </p>
                  <p {...stylex.props(styles.appText)}>AI guidance through your workout. A coach in your corner.</p>
                </div>
              </div>
              <p {...stylex.props(styles.appLinks)}>
                {workoutDirectorLinks.map((link, index) => (
                  <a
                    key={link.href}
                    href={link.href}
                    {...stylex.props(
                      stylex.defaultMarker(),
                      index === 0 ? sk.pillHeavy : sk.pill,
                      styles.button,
                      ui.focusRing,
                    )}
                  >
                    {link.label}
                    <SketchArrow dir="out" xstyle={styles.arrow} />
                  </a>
                ))}
                <Link
                  to="/projects/workout-director/"
                  {...stylex.props(stylex.defaultMarker(), sk.pill, styles.button, ui.focusRing)}
                >
                  Case study
                  <SketchArrow xstyle={styles.arrow} />
                </Link>
              </p>
            </div>
          </div>
          <Figure name="walk" xstyle={styles.walker} />
          <PhonePairGround phones={heroPhones} label="Workout Director app screens" priority xstyle={styles.phones} />
        </div>
      </Leg>

      {/* The three roles as figures on the ground, each with its label above it. SpaceX is first only. */}
      <Leg from="right" as="div" stroke={2} xstyle={styles.rolesLeg}>
        <ul role="list" aria-label="Roles" {...stylex.props(styles.roles)}>
          {roles.map((role) => (
            <li key={role.name} {...stylex.props(styles.role)}>
              <span {...stylex.props(sk.box, styles.logoBox)}>
                <Logo name={role.logo} size={role.logoSize} />
              </span>
              <span {...stylex.props(styles.roleCopy)}>
                <span {...stylex.props(styles.roleHead)}>
                  <span {...stylex.props(styles.roleName)}>{role.name}</span>
                  <span {...stylex.props(styles.years)}>{role.years}</span>
                </span>
                <span {...stylex.props(styles.roleText)}>{role.text}</span>
              </span>
              <Figure name={role.figure} xstyle={[styles.roleFigure, figureHeight[role.figure]]} />
            </li>
          ))}
        </ul>
      </Leg>

      <section aria-labelledby="sel-title">
        <Leg from="left" as="div" xstyle={styles.workLeg}>
          <SectionHead id="sel-title" title="Selected work" to="/projects/" linkLabel="All projects" />
          <ProjectCard card={workoutDirectorCard} scene="devicesRight" />
        </Leg>
        <Leg from="right" as="div" stroke={2} xstyle={styles.workLeg}>
          <ProjectCard card={kaloCard} scene="devicesLeft" />
        </Leg>
      </section>

      <Leg from="left" labelledBy="notes-title" xstyle={styles.notesLeg}>
        <SectionHead id="notes-title" title="Notes" to="/notes/" linkLabel="All notes" />
        <div {...stylex.props(styles.notes)}>
          <NoteList items={latestNotes} posts="row" />
          <Figure name="pushup" xstyle={styles.pushup} />
        </div>
      </Leg>

      <Leg from="right" to="edge" stroke={2} labelledBy="contact-title" xstyle={styles.contactLeg}>
        <div {...stylex.props(styles.contact)}>
          <h2 id="contact-title" {...stylex.props(ui.h2, styles.contactTitle)}>
            Contact
          </h2>
          <p>
            Email me at{' '}
            <a href={`mailto:${site.email}`} {...stylex.props(ui.link)}>
              {site.email}
            </a>
            . I'm also on{' '}
            <a href={site.linkedin} {...stylex.props(ui.link)}>
              LinkedIn
            </a>
            ,{' '}
            <a href={site.github} {...stylex.props(ui.link)}>
              GitHub
            </a>{' '}
            and{' '}
            <a href={site.x} rel="me noopener" {...stylex.props(ui.link)}>
              X
            </a>
            .
          </p>
          <Availability email={false} />
        </div>
      </Leg>
    </Main>
  )
}

/** The roles in order, every one set the same way. */
const roles: ReadonlyArray<{
  name: string
  years: string
  text: string
  logo: 'spacexsi' | 'paythru' | 'maestro'
  logoSize: number
  figure: 'lunge' | 'squat' | 'curl'
}> = [
  {
    name: 'SpaceX Super Intelligence',
    years: '2026',
    text: 'Quality Assurance Engineer testing more than 500 Grok iOS and web builds before release.',
    // The SpaceXSI mark is wide and thin, so it gets more width to look the same weight.
    logo: 'spacexsi',
    logoSize: 24,
    figure: 'curl',
  },
  {
    name: 'Paythru',
    years: '2022 to 2026',
    text: 'EV charging apps; releases cut from a few weeks to a few days.',
    logo: 'paythru',
    logoSize: 22,
    figure: 'lunge',
  },
  {
    name: 'Maestro',
    years: '2023 to 2024',
    text: 'Contract developer; test suites for Maestro Cloud and Studio and 14 blog posts.',
    logo: 'maestro',
    logoSize: 22,
    figure: 'squat',
  },
]

const styles = stylex.create({
  // The first leg: the intro, a figure walking in and the two phones, all standing on the first stretch of line.
  heroLeg: {
    paddingTop: { default: '1.5rem', [breakpoints.tablet]: '0.5rem' },
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1.5fr) auto minmax(0, 0.85fr)',
      [breakpoints.tablet]: 'minmax(0, 1fr)',
    },
    alignItems: 'end',
    columnGap: 'clamp(1.5rem, 3.5vw, 3.5rem)',
    rowGap: '2.5rem',
  },
  intro: {
    minWidth: 0,
    paddingBottom: { default: '3rem', [breakpoints.tablet]: 0 },
  },
  kicker: {
    fontSize: type.meta,
    color: colors.muted,
  },
  title: {
    marginTop: '1rem',
    fontFamily: fonts.serif,
    fontSize: type.display,
    lineHeight: 1,
    fontWeight: weights.regular,
    letterSpacing: '-0.025em',
    whiteSpace: { default: 'nowrap', [breakpoints.phone]: 'normal' },
    // The name is drawn as an outline, the way the footer drawing draws the AK mark.
    color: 'transparent',
    WebkitTextStrokeWidth: '1.25px',
    WebkitTextStrokeColor: colors.text,
  },
  lead: {
    marginTop: '1.25rem',
    fontSize: type.lead,
    lineHeight: 1.45,
    maxWidth: '24em',
    textWrap: 'pretty',
  },
  links: {
    listStyle: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    rowGap: '0.6rem',
    columnGap: { default: '1.5rem', [breakpoints.phone]: '1.05rem' },
    marginTop: '1.5rem',
    fontSize: type.body,
  },
  app: {
    display: 'grid',
    rowGap: '1.1rem',
    marginTop: '2.25rem',
  },
  appHead: { display: 'flex', alignItems: 'center', gap: '0.9rem' },
  appName: {
    display: 'block',
    fontFamily: fonts.serif,
    fontSize: type.lead,
    lineHeight: 1.2,
    letterSpacing: '-0.01em',
  },
  appText: { marginTop: '0.3rem', fontSize: type.meta, lineHeight: 1.45, color: colors.muted, textWrap: 'pretty' },
  appLinks: { display: 'flex', flexWrap: 'wrap', gap: { default: '0.6rem', [breakpoints.phone]: '0.5rem' } },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    minHeight: { default: '2.6rem', [breakpoints.phone]: '2.5rem' },
    paddingInline: { default: '1.05rem', [breakpoints.phone]: '0.85rem' },
    borderRadius: '999px',
    color: colors.text,
    fontSize: type.meta,
    fontWeight: weights.medium,
    textDecorationLine: 'none',
  },
  arrow: {
    transform: { default: 'none', [stylex.when.ancestor(':hover')]: 'translateX(2px)' },
    transitionProperty: { default: 'transform', [breakpoints.reducedMotion]: 'none' },
    transitionDuration: '0.15s',
  },
  // The walking figure from the footer drawing, between the words and the phones. Not on phones: no room.
  walker: {
    display: { default: 'block', [breakpoints.tablet]: 'none' },
    height: 'clamp(15rem, 25vw, 22rem)',
  },
  phones: {
    width: '100%',
    maxWidth: { default: '27rem', [breakpoints.tablet]: '25rem' },
    justifySelf: { default: 'end', [breakpoints.tablet]: 'center' },
  },
  rolesLeg: {
    paddingTop: { default: 'clamp(6rem, 11vw, 9rem)', [breakpoints.phone]: '6rem' },
  },
  // Figures are drawn at one scale (k times their size in the footer drawing), so they keep their sizes to each other.
  roles: {
    '--fig-k': { default: 'clamp(0.4px, 0.045vw, 0.62px)', [breakpoints.tablet]: '0.36px' },
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    alignItems: 'stretch',
    columnGap: 'clamp(2rem, 4.5vw, 4.5rem)',
    rowGap: '3.5rem',
  },
  // Label above, figure under it on the ground. On phones each role stands on a short ground line of its own.
  role: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '2.5rem minmax(0, 1fr)',
    gridTemplateRows: 'auto 1fr',
    columnGap: '0.85rem',
    rowGap: '1.75rem',
    alignItems: 'start',
    '::after': {
      content: '""',
      display: { default: 'none', [breakpoints.tablet]: 'block', ':last-child': 'none' },
      position: 'absolute',
      left: '-0.5rem',
      right: '-0.5rem',
      bottom: '-8px',
      height: '16px',
      backgroundColor: colors.ink,
      maskImage: 'url("/assets/img/sketch/ground.svg")',
      maskSize: '100% 100%',
      maskRepeat: 'no-repeat',
      pointerEvents: 'none',
    },
  },
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.25rem',
    marginTop: '-0.375rem',
  },
  roleCopy: { minWidth: 0 },
  roleHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: '0.7rem',
    lineHeight: '1.5rem',
  },
  roleName: { fontWeight: weights.medium },
  years: { fontSize: type.meta, fontVariantNumeric: 'tabular-nums', color: colors.muted },
  roleText: {
    display: 'block',
    marginTop: '0.1rem',
    fontSize: type.meta,
    lineHeight: 1.5,
    color: colors.muted,
    textWrap: 'pretty',
    maxWidth: '24em',
  },
  roleFigure: {
    gridColumnStart: '1',
    gridColumnEnd: '-1',
    alignSelf: 'end',
    justifySelf: { default: 'start', [breakpoints.tablet]: 'end' },
    marginLeft: { default: '3.35rem', [breakpoints.tablet]: 0 },
    marginRight: { default: 0, [breakpoints.tablet]: '1rem' },
  },
  workLeg: {
    paddingTop: { default: 'clamp(6rem, 10vw, 8.5rem)', [breakpoints.phone]: '5.5rem' },
  },
  notesLeg: {
    paddingTop: { default: 'clamp(6rem, 10vw, 8.5rem)', [breakpoints.phone]: '5.5rem' },
  },
  // The push-up from the footer drawing, flat on the ground at the end of the notes.
  // The notes, then the push-up flat on the ground at the end of them.
  notes: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 2fr) minmax(0, 1fr)', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    alignItems: 'end',
    columnGap: 'clamp(2rem, 4.5vw, 4.5rem)',
    rowGap: '2rem',
  },
  pushup: {
    height: { default: 'clamp(7rem, 11vw, 9.5rem)', [breakpoints.tablet]: '5.5rem' },
    justifySelf: 'end',
  },
  // Contact, where the line runs off the edge into the footer drawing.
  contactLeg: {
    paddingTop: { default: 'clamp(6rem, 10vw, 8.5rem)', [breakpoints.phone]: '5.5rem' },
  },
  contact: { maxWidth: '36rem', paddingBottom: '3rem' },
  contactTitle: { marginBottom: '0.75rem' },
})

const figureHeight = stylex.create({
  walk: { height: 'calc(372 * var(--fig-k))' },
  lunge: { height: 'calc(277 * var(--fig-k))' },
  squat: { height: 'calc(266 * var(--fig-k))' },
  curl: { height: 'calc(373 * var(--fig-k))' },
  // The notes, then the push-up flat on the ground at the end of them.
  notes: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 2fr) minmax(0, 1fr)', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    alignItems: 'end',
    columnGap: 'clamp(2rem, 4.5vw, 4.5rem)',
    rowGap: '2rem',
  },
  pushup: { height: 'calc(253 * var(--fig-k))' },
})

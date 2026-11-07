import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { NoteList } from '~/components/NoteList'
import { ProjectCard } from '~/components/ProjectCard'
import { Figure, Leg } from '~/components/Scene'
import { PhonePair } from '~/components/Screens'
import { SectionHead } from '~/components/SectionHead'
import { SketchArrow } from '~/components/SketchArrow'
import { WdWordmark } from '~/components/WdWordmark'
import { kaloCard, workoutDirectorCard, workoutDirectorLinks } from '~/content/projects'
import { noteListSummary, notes } from '~/content/notes'
import type { ScreenId } from '~/content/workoutDirectorScreens'
import { links, site } from '~/content/site'
import { formatShortDate } from '~/lib/dates'
import { seo } from '~/lib/seo'
import { homeJsonLd, jsonLdScript } from '~/lib/structuredData'
import { breakpoints, colors, fonts, type, weights } from '~/styles/tokens.stylex'
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
    // React preloads the front phone itself (it has fetchPriority="high"). The name's face is only used here.
    links: [
      ...homeSeo.links,
      {
        rel: 'preload',
        href: '/assets/fonts/InterDisplay-SemiBold-Latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
    ],
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
        One drawn line runs down the whole page, like the ground of the footer drawing. The first screen is one
        scene on it: the name and a line about the work on the left, a figure walking in, and two app screens on the
        right, shown as they are, a little above the line so no drawing touches them.
      */}
      <Leg from="edge" labelledBy="intro-title" xstyle={styles.heroLeg}>
        <div {...stylex.props(styles.hero)}>
          <div {...stylex.props(styles.head)}>
            <p {...stylex.props(styles.kicker)}>Software engineer in {site.city}</p>
            <h1 id="intro-title" {...stylex.props(styles.title)}>
              Hi, I’m Ashish.
            </h1>
          </div>
          <div {...stylex.props(styles.intro)}>
            <p {...stylex.props(styles.lead)}>
              I work on iOS and Android apps, AI features and the AWS backends behind them.
            </p>

            <div aria-labelledby="wd-title" role="group" {...stylex.props(styles.app)}>
              <div {...stylex.props(styles.appHead)}>
                <Logo name="workoutDirector" size={40} />
                <div>
                  <p id="wd-title" {...stylex.props(styles.appName)}>
                    <WdWordmark xstyle={styles.wordmark} />
                  </p>
                  <p {...stylex.props(styles.appText)}>AI guidance through your workout.</p>
                </div>
              </div>
              <p {...stylex.props(styles.appLinks)}>
                {workoutDirectorLinks.map((link) => (
                  <a key={link.href} href={link.href} {...stylex.props(styles.textLink, ui.focusRing)}>
                    {link.label}
                    <SketchArrow dir="out" xstyle={styles.arrow} />
                  </a>
                ))}
                <Link to="/projects/workout-director/" {...stylex.props(styles.textLink, ui.focusRing)}>
                  Case study
                  <SketchArrow xstyle={styles.arrow} />
                </Link>
              </p>
            </div>
          </div>
          <Figure name="walk" xstyle={styles.walker} />
          {/* The footage credit is left out on the home page (the libraries ask for it but do not require it). */}
          <PhonePair
            phones={heroPhones}
            label="Workout Director app screens"
            priority
            credit={false}
            xstyle={styles.phones}
          />
        </div>
      </Leg>

      {/* The three roles, each a figure standing on the ground with its words above it. SpaceX is first only. */}
      <Leg from="right" as="div" stroke={2} label="Roles" xstyle={styles.rolesLeg}>
        <ul role="list" aria-label="Roles" {...stylex.props(styles.roles)}>
          {roles.map((role) => (
            <li key={role.name} {...stylex.props(styles.role)}>
              <span {...stylex.props(styles.logoBox)}>
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
        <p {...stylex.props(styles.more)}>
          <Link to="/work/" {...stylex.props(styles.textLink, ui.focusRing)}>
            Work history
            <SketchArrow xstyle={styles.arrow} />
          </Link>
        </p>
      </Leg>

      <section aria-labelledby="sel-title">
        <Leg from="left" as="div" xstyle={styles.workLeg}>
          <SectionHead id="sel-title" title="Selected work" to="/projects/" linkLabel="All projects" />
          <div {...stylex.props(styles.workScene)}>
            <ProjectCard card={workoutDirectorCard} scene="devicesRight" />
          </div>
        </Leg>
        <Leg from="right" as="div" stroke={2} xstyle={styles.kaloLeg}>
          <div {...stylex.props(styles.kalo)}>
            <ProjectCard card={kaloCard} scene="devicesLeft" />
          </div>
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
          <p {...stylex.props(styles.contactText)}>
            Email me at{' '}
            <a href={`mailto:${site.email}`} {...stylex.props(ui.link)}>
              {site.email}
            </a>
            . I’m also on{' '}
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
          <p {...stylex.props(styles.contactText, styles.contactNext)}>
            I’m based in London. Email is the best way to reach me.
          </p>
          <h3 id="cv-title" {...stylex.props(styles.cvTitle)}>
            Download my CV
          </h3>
          <ul role="list" aria-labelledby="cv-title" {...stylex.props(styles.cvs)}>
            {links.roleCvs.map((cv) => (
              <li key={cv.href}>
                <a href={cv.href} type="application/pdf" {...stylex.props(styles.textLink, ui.focusRing)}>
                  {cv.label} (PDF)
                  <SketchArrow dir="down" xstyle={styles.arrow} />
                </a>
              </li>
            ))}
          </ul>
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
    text: 'As a Quality Assurance Engineer, I’ve tested more than 500 Grok iOS and web builds before release.',
    // The SpaceXSI mark is wide and thin, so it gets more width to look the same weight.
    logo: 'spacexsi',
    logoSize: 24,
    figure: 'curl',
  },
  {
    name: 'Paythru',
    years: '2022 to 2026',
    text: 'I worked on EV charging apps and a release process that went from a few weeks to a few days.',
    logo: 'paythru',
    logoSize: 22,
    figure: 'lunge',
  },
  {
    name: 'Maestro',
    years: '2023 to 2024',
    text: 'My contract work covered test suites for Maestro Cloud and Studio and 14 blog posts.',
    logo: 'maestro',
    logoSize: 22,
    figure: 'squat',
  },
]

// Each part of the page gets about a screen of its own on a laptop: room above, and the scene on its ground.
const SECTION = { default: 'clamp(7rem, 15vh, 11rem)', [breakpoints.tablet]: '6rem' }

const styles = stylex.create({
  // The first screen: the whole scene stands on the first stretch of line, at the bottom of the window.
  heroLeg: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    // The ground of the first scene sits a little above the bottom of a laptop window.
    minHeight: { default: 'calc(100svh - 10.5rem)', [breakpoints.tablet]: 0 },
    paddingTop: { default: '3rem', [breakpoints.tablet]: '2rem' },
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr) auto minmax(0, 25.5rem)',
      [breakpoints.tablet]: 'minmax(0, 1fr)',
    },
    gridTemplateRows: { default: 'auto 1fr', [breakpoints.tablet]: 'none' },
    alignItems: 'stretch',
    columnGap: 'clamp(2rem, 4vw, 4.5rem)',
    rowGap: { default: '2.5rem', [breakpoints.tablet]: '2.25rem' },
    paddingBottom: { default: 0, [breakpoints.tablet]: '4rem' },
  },
  // The name across the top of the scene, over the words and the walking figure.
  head: {
    gridColumnStart: '1',
    gridColumnEnd: { default: '3', [breakpoints.tablet]: '2' },
    minWidth: 0,
  },
  // The words under the name: the line about the work at the top, the app's name low, on the ground.
  intro: {
    gridColumnStart: '1',
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    rowGap: { default: '3rem', [breakpoints.tablet]: '2.75rem' },
  },
  kicker: {
    fontSize: type.meta,
    letterSpacing: '0.04em',
    color: colors.muted,
  },
  title: {
    marginTop: { default: '1.25rem', [breakpoints.phone]: '1rem' },
    marginLeft: { default: '-0.05em', [breakpoints.phone]: 0 },
    // In the lettering of the AK wordmark in the header: Inter, solid, at the wordmark's weight.
    fontFamily: fonts.brand,
    fontSize: type.display,
    fontWeight: weights.brand,
    lineHeight: 1,
    letterSpacing: '-0.035em',
    whiteSpace: { default: 'nowrap', [breakpoints.phone]: 'normal' },
  },
  lead: {
    fontSize: type.lead,
    lineHeight: 1.5,
    maxWidth: '24em',
    color: colors.muted,
    textWrap: 'pretty',
  },
  app: {
    position: 'relative',
    display: 'grid',
    rowGap: '1.25rem',
    paddingBottom: { default: '3.5rem', [breakpoints.tablet]: 0 },
  },
  appHead: { display: 'flex', alignItems: 'center', gap: '1rem' },
  appName: { display: 'block', lineHeight: 0 },
  // The brand lettering, two lines, about as tall as the app icon beside it.
  wordmark: { height: '2.6rem' },
  appText: { marginTop: '0.25rem', fontSize: type.meta, lineHeight: 1.5, color: colors.muted },
  appLinks: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: { default: '1.75rem', [breakpoints.phone]: '1.25rem' },
    rowGap: '0.75rem',
  },
  // Links that stand on their own: plain words with a drawn arrow, no underline and no box.
  textLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    minHeight: '2.75rem',
    color: colors.text,
    fontSize: type.body,
    fontWeight: weights.medium,
    textDecorationLine: 'none',
  },
  arrow: {
    transform: { default: 'none', [stylex.when.ancestor(':hover')]: 'translateX(3px)' },
    transitionProperty: { default: 'transform', [breakpoints.reducedMotion]: 'none' },
    transitionDuration: '0.15s',
  },
  // The walking figure from the footer drawing, between the words and the phones. Not on phones: no room.
  walker: {
    display: { default: 'block', [breakpoints.tablet]: 'none' },
    gridColumnStart: '2',
    gridRowStart: '2',
    alignSelf: 'end',
    height: 'clamp(14rem, 22vw, 19.5rem)',
  },
  // The phones stand on the ground at the right, as tall as the name and the words together.
  phones: {
    gridColumnStart: { default: '3', [breakpoints.tablet]: '1' },
    gridRowStart: { default: '1', [breakpoints.tablet]: 'auto' },
    gridRowEnd: { default: 'span 2', [breakpoints.tablet]: 'auto' },
    alignSelf: 'end',
    width: '100%',
    maxWidth: { default: '25.5rem', [breakpoints.tablet]: '21rem' },
    justifySelf: { default: 'end', [breakpoints.tablet]: 'center' },
    // Clear of the ground line: the screens never touch a drawing.
    marginBottom: { default: '2rem', [breakpoints.tablet]: '0.5rem' },
  },
  rolesLeg: {
    paddingTop: SECTION,
    paddingBottom: { default: '0', [breakpoints.tablet]: '0' },
  },
  // Figures are drawn at one scale (k times their size in the footer drawing), so they keep their sizes to each other.
  roles: {
    '--fig-k': { default: 'clamp(0.42px, 0.05vw, 0.66px)', [breakpoints.tablet]: '0.4px' },
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(3, minmax(0, 1fr))', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    alignItems: 'stretch',
    columnGap: 'clamp(3rem, 6vw, 6.5rem)',
    rowGap: '5rem',
  },
  // Words above, figure under them on the ground. On phones each role stands on a short ground line of its own.
  role: {
    position: 'relative',
    display: 'grid',
    gridTemplateColumns: '2.5rem minmax(0, 1fr)',
    gridTemplateRows: 'auto 1fr',
    columnGap: '1rem',
    rowGap: { default: '3.5rem', [breakpoints.tablet]: '1.5rem' },
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
      maskImage: 'url("/assets/img/scene/line-h2.svg")',
      maskSize: '100% 100%',
      maskRepeat: 'no-repeat',
      pointerEvents: 'none',
    },
  },
  // The box is centred on the name's line.
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.25rem',
    marginTop: '-0.25rem',
  },
  roleCopy: { minWidth: 0 },
  roleHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: '0.75rem',
    lineHeight: '1.75rem',
  },
  roleName: { fontSize: type.body, fontWeight: weights.medium },
  years: { fontSize: type.meta, fontVariantNumeric: 'tabular-nums', color: colors.muted },
  roleText: {
    display: 'block',
    marginTop: '0.6rem',
    fontSize: type.body,
    lineHeight: 1.7,
    color: colors.muted,
    textWrap: 'pretty',
    maxWidth: '22em',
  },
  roleFigure: {
    gridColumnStart: '1',
    gridColumnEnd: '-1',
    alignSelf: 'end',
    justifySelf: { default: 'start', [breakpoints.tablet]: 'end' },
    marginLeft: { default: '3.5rem', [breakpoints.tablet]: 0 },
    marginRight: { default: 0, [breakpoints.tablet]: '1rem' },
  },
  // Beside the last figure, above the role (which it overlaps), so it can be pointed at.
  more: {
    position: 'relative',
    zIndex: 1,
    width: 'fit-content',
    marginLeft: { default: 'auto', [breakpoints.tablet]: 0 },
    display: 'flex',
    justifyContent: { default: 'flex-end', [breakpoints.tablet]: 'flex-start' },
    marginTop: { default: '-3rem', [breakpoints.tablet]: '2.5rem' },
    paddingBottom: '2rem',
  },
  // Room under the screens, so they stand clear of the line.
  workLeg: { paddingTop: SECTION, paddingBottom: '2.5rem' },
  workScene: { marginTop: { default: '4rem', [breakpoints.tablet]: '2.5rem' } },
  kaloLeg: { paddingTop: { default: 'clamp(6rem, 12vh, 9rem)', [breakpoints.tablet]: '5rem' } },
  // Kalo has no screens to show, so it stands on the line like a stake, on the right where the line comes down.
  kalo: {
    maxWidth: '32rem',
    marginLeft: { default: 'auto', [breakpoints.tablet]: 0 },
    marginRight: { default: '6%', [breakpoints.tablet]: 0 },
  },
  notesLeg: { paddingTop: SECTION },
  notes: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 2.4fr) minmax(0, 1fr)', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    alignItems: 'end',
    columnGap: 'clamp(3rem, 6vw, 6rem)',
    rowGap: '2.5rem',
    marginTop: { default: '4rem', [breakpoints.tablet]: '2.5rem' },
  },
  pushup: {
    height: { default: 'clamp(7rem, 11vw, 9.5rem)', [breakpoints.tablet]: '5.5rem' },
    justifySelf: 'end',
  },
  // Contact, where the line runs off the edge into the footer drawing.
  contactLeg: { paddingTop: SECTION },
  contact: { maxWidth: '34rem', paddingBottom: { default: '6rem', [breakpoints.tablet]: '4rem' } },
  contactTitle: { marginBottom: '1.75rem' },
  contactText: { fontSize: type.lead, lineHeight: 1.6, textWrap: 'pretty' },
  contactNext: { marginTop: '1rem', color: colors.muted },
  cvTitle: {
    marginTop: '3.5rem',
    fontSize: type.meta,
    fontWeight: weights.regular,
    letterSpacing: '0.04em',
    color: colors.muted,
  },
  cvs: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, max-content)', [breakpoints.phone]: '1fr' },
    columnGap: '3rem',
    rowGap: '0.25rem',
    marginTop: '0.75rem',
  },
})

const figureHeight = stylex.create({
  lunge: { height: 'calc(277 * var(--fig-k))' },
  squat: { height: 'calc(266 * var(--fig-k))' },
  curl: { height: 'calc(373 * var(--fig-k))' },
})

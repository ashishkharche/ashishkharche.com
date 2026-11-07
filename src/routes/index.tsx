import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Availability } from '~/components/Availability'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { NoteList } from '~/components/NoteList'
import { ProjectCard } from '~/components/ProjectCard'
import { PhonePairStage } from '~/components/Screens'
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
      <div {...stylex.props(ui.wrap)}>
        <section aria-labelledby="intro-title" {...stylex.props(styles.hero)}>
          <div {...stylex.props(styles.intro)}>
            <p {...stylex.props(styles.kicker)}>Software engineer · {site.city}</p>
            <h1 id="intro-title" {...stylex.props(styles.title)}>
              Hi, I'm Ashish.
            </h1>
            <p {...stylex.props(styles.lead)}>
              I work on iOS and Android apps, AI features and the AWS backend behind them.
            </p>

            <div {...stylex.props(sk.ruleTop, styles.facts)}>
              <ul role="list" aria-label="Roles" {...stylex.props(styles.roles)}>
                <li {...stylex.props(styles.role)}>
                  {/* The SpaceXSI mark is wide and thin, so it gets more width to look the same weight. */}
                  <span {...stylex.props(sk.box, styles.logoBox)}>
                    <Logo name="spacexsi" size={24} />
                  </span>
                  <span>
                    <span {...stylex.props(styles.roleHead)}>
                      <span {...stylex.props(styles.roleName)}>SpaceX Super Intelligence</span>
                      <span {...stylex.props(styles.years)}>2026</span>
                    </span>
                    <span {...stylex.props(styles.roleText)}>
                      Quality Assurance Engineer testing more than 500 Grok iOS and web builds before release.
                    </span>
                  </span>
                </li>
                <li {...stylex.props(styles.role)}>
                  <span {...stylex.props(sk.box, styles.logoBox)}>
                    <Logo name="paythru" size={22} />
                  </span>
                  <span>
                    <span {...stylex.props(styles.roleHead)}>
                      <span {...stylex.props(styles.roleName)}>Paythru</span>
                      <span {...stylex.props(styles.years)}>2022 to 2026</span>
                    </span>
                    <span {...stylex.props(styles.roleText)}>
                      EV charging apps; releases cut from a few weeks to a few days.
                    </span>
                  </span>
                </li>
                <li {...stylex.props(styles.role)}>
                  <span {...stylex.props(sk.box, styles.logoBox)}>
                    <Logo name="maestro" size={22} />
                  </span>
                  <span>
                    <span {...stylex.props(styles.roleHead)}>
                      <span {...stylex.props(styles.roleName)}>Maestro</span>
                      <span {...stylex.props(styles.years)}>2023 to 2024</span>
                    </span>
                    <span {...stylex.props(styles.roleText)}>
                      Contract developer; test suites for Maestro Cloud and Studio and 14 blog posts.
                    </span>
                  </span>
                </li>
              </ul>
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
            </div>

            <div aria-labelledby="wd-title" role="group" {...stylex.props(sk.ruleTop, styles.app)}>
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
          <PhonePairStage phones={heroPhones} label="Workout Director app screens" priority />
        </section>

        <section aria-labelledby="sel-title" {...stylex.props(ui.section)}>
          <SectionHead id="sel-title" title="Selected work" to="/projects/" linkLabel="All projects" />
          <div {...stylex.props(styles.grid)}>
            <ProjectCard card={workoutDirectorCard} />
            <ProjectCard card={kaloCard} />
          </div>
        </section>

        <section aria-labelledby="notes-title" {...stylex.props(ui.section)}>
          <SectionHead id="notes-title" title="Notes" to="/notes/" linkLabel="All notes" />
          <div {...stylex.props(styles.notes)}>
            <NoteList items={latestNotes} />
          </div>
        </section>

        <div {...stylex.props(ui.narrow)}>
          <section aria-labelledby="contact-title" {...stylex.props(ui.section)}>
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
          </section>
        </div>
      </div>
    </Main>
  )
}

const styles = stylex.create({
  // Two columns: the intro, roles, links and Workout Director on the left, one
  // panel of app screens on the right, top and bottom edges lined up. On phones
  // the panel follows the text, so the App Store link stays in the first screen.
  hero: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1.08fr) minmax(0, 0.92fr)', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    alignItems: 'center',
    columnGap: '4rem',
    rowGap: '2.5rem',
    paddingTop: { default: '1rem', [breakpoints.tablet]: '0.5rem' },
  },
  intro: { minWidth: 0 },
  // A small label over the name, in the meta size.
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
    // The name is drawn as an outline, the way the footer drawing draws the AK mark.
    color: 'transparent',
    WebkitTextStrokeWidth: '1.25px',
    WebkitTextStrokeColor: colors.text,
  },
  lead: {
    marginTop: { default: '1.25rem', [breakpoints.phone]: '1.25rem' },
    fontSize: type.lead,
    lineHeight: 1.45,
    maxWidth: '24em',
    textWrap: 'pretty',
  },
  // The roles, then the links, under one rule.
  facts: {
    display: 'grid',
    rowGap: '1.5rem',
    marginTop: '2rem',
    paddingTop: '1.5rem',
  },
  roles: {
    listStyle: 'none',
    display: 'grid',
    rowGap: '1.1rem',
  },
  // Every logo sits in the same box, as tall as the company name's line, so each
  // mark is centred on its name and the names share one left edge. SpaceX is first only.
  role: {
    display: 'grid',
    gridTemplateColumns: '2.5rem minmax(0, 1fr)',
    columnGap: '0.85rem',
    alignItems: 'start',
  },
  // A drawn box round each mark, centred on the name's line.
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.25rem',
    marginTop: '-0.375rem',
  },
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
  },
  // One line of links beside the roles, wrapping if it has to.
  links: {
    listStyle: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    alignContent: 'start',
    rowGap: '0.6rem',
    // Narrower gaps on a phone keep all five links on one line.
    columnGap: { default: '1.5rem', [breakpoints.phone]: '1.05rem' },
    fontSize: type.body,
  },
  // Workout Director under a rule of its own: icon and name, then the three links.
  app: {
    display: 'grid',
    rowGap: '1.1rem',
    marginTop: '1.75rem',
    paddingTop: '1.5rem',
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
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: { default: '4.5rem', [breakpoints.tablet]: '3rem' },
  },
  notes: { maxWidth: '780px' },
  contactTitle: { marginBottom: '0.75rem' },
})

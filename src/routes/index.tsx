import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { NoteList } from '~/components/NoteList'
import { ProjectCard } from '~/components/ProjectCard'
import { PhonePair } from '~/components/Screens'
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
  fullTitle: 'Ashish Kharche, Software engineer in London',
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
    meta: `${formatShortDate(note.date)}, ${note.listLabel}`,
    summary: noteListSummary(note),
  }))
  return (
    <Main>
      <div {...stylex.props(ui.wrap, styles.canvas)}>
        <section aria-labelledby="intro-title" {...stylex.props(styles.hero)}>
          <p aria-hidden="true" {...stylex.props(styles.index)}>
            01
          </p>
          <header {...stylex.props(styles.head)}>
            <p {...stylex.props(styles.kicker)}>Software engineer in {site.city}</p>
            <h1 id="intro-title" {...stylex.props(styles.title)}>
              Hi, I’m Ashish.
            </h1>
          </header>
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
                  </a>
                ))}
                <Link to="/projects/workout-director/" {...stylex.props(styles.textLink, ui.focusRing)}>
                  Case study
                </Link>
              </p>
            </div>
          </div>
          <PhonePair
            phones={heroPhones}
            label="Workout Director app screens"
            priority
            credit={false}
            xstyle={styles.phones}
          />
        </section>
        <section aria-label="Roles" {...stylex.props(styles.section, styles.rolesSection)}>
          <div {...stylex.props(styles.sectionIndex)}>
            <span aria-hidden="true" {...stylex.props(styles.sectionNumber)}>
              02
            </span>
            <Link to="/work/" {...stylex.props(styles.textLink, ui.focusRing)}>
              Work history
            </Link>
          </div>
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
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="sel-title" {...stylex.props(styles.section)}>
          <div {...stylex.props(styles.sectionIndex)}>
            <span aria-hidden="true" {...stylex.props(styles.sectionNumber)}>
              03
            </span>
            <h2 id="sel-title" {...stylex.props(styles.sectionTitle)}>
              Selected work
            </h2>
            <Link to="/projects/" {...stylex.props(styles.textLink, ui.focusRing)}>
              All projects
            </Link>
          </div>
          <div {...stylex.props(styles.work)}>
            <ProjectCard card={workoutDirectorCard} scene="devicesRight" />
            <div {...stylex.props(styles.secondaryProject)}>
              <ProjectCard card={kaloCard} scene="devicesLeft" />
            </div>
          </div>
        </section>
        <section aria-labelledby="notes-title" {...stylex.props(styles.section)}>
          <div {...stylex.props(styles.sectionIndex)}>
            <span aria-hidden="true" {...stylex.props(styles.sectionNumber)}>
              04
            </span>
            <h2 id="notes-title" {...stylex.props(styles.sectionTitle)}>
              Notes
            </h2>
            <Link to="/notes/" {...stylex.props(styles.textLink, ui.focusRing)}>
              All notes
            </Link>
          </div>
          <div {...stylex.props(styles.notes)}>
            <NoteList items={latestNotes} posts="row" />
          </div>
        </section>
        <section aria-labelledby="contact-title" {...stylex.props(styles.section)}>
          <div {...stylex.props(styles.sectionIndex)}>
            <span aria-hidden="true" {...stylex.props(styles.sectionNumber)}>
              05
            </span>
            <h2 id="contact-title" {...stylex.props(styles.sectionTitle)}>
              Contact
            </h2>
          </div>
          <div {...stylex.props(styles.contact)}>
            <p>
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
            <p {...stylex.props(styles.contactNext)}>I’m based in London. Email is the best way to reach me.</p>
            <h3 id="cv-title" {...stylex.props(styles.cvTitle)}>
              Download my CV
            </h3>
            <ul role="list" aria-labelledby="cv-title" {...stylex.props(styles.cvs)}>
              {links.roleCvs.map((cv) => (
                <li key={cv.href}>
                  <a href={cv.href} type="application/pdf" {...stylex.props(styles.textLink, ui.focusRing)}>
                    {cv.label} (PDF)
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
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
    text: 'As a Quality Assurance Engineer, I’ve tested Grok iOS and web builds, Grok Bot and Grok Build before release.',
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

const styles = stylex.create({
  sectionNumber: { fontFamily: fonts.serif, fontSize: type.title, lineHeight: 1 },
  canvas: { paddingTop: { default: '2rem', [breakpoints.phone]: 0 } },
  index: { fontFamily: fonts.serif, fontSize: type.title, color: colors.muted, lineHeight: 1 },
  kicker: { fontSize: type.meta, color: colors.muted },
  title: {
    fontFamily: fonts.brand,
    fontSize: type.display,
    fontWeight: weights.brand,
    lineHeight: 1.02,
    letterSpacing: '-0.055em',
    marginTop: '2rem',
    textWrap: 'balance',
  },
  lead: { fontSize: type.body, lineHeight: 1.65, maxWidth: '24rem', textWrap: 'pretty' },
  app: { marginTop: '4rem' },
  appHead: { display: 'flex', alignItems: 'center', gap: '1rem' },
  appName: { lineHeight: 0 },
  wordmark: { height: '2.6rem' },
  appText: { fontSize: type.meta, color: colors.muted, marginTop: '0.5rem' },
  appLinks: { display: 'flex', flexWrap: 'wrap', columnGap: '1.5rem', marginTop: '1.25rem' },
  textLink: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '2.75rem',
    fontSize: type.meta,
    color: colors.text,
    textDecorationLine: 'none',
  },
  sectionIndex: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'start',
    gap: '1rem',
    fontSize: type.meta,
    color: colors.muted,
  },
  sectionTitle: { fontSize: type.meta, fontWeight: weights.regular, color: colors.text },
  roles: { listStyle: 'none', minWidth: 0 },
  role: {
    display: 'grid',
    gridTemplateColumns: '2.5rem minmax(0, 1fr)',
    columnGap: '1rem',
    paddingBottom: '2.5rem',
    marginBottom: '2.5rem',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: colors.line,
  },
  logoBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2rem' },
  roleCopy: { minWidth: 0 },
  roleHead: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    columnGap: '2rem',
  },
  roleName: { fontSize: type.body, fontWeight: weights.regular, lineHeight: '2rem' },
  years: { fontSize: type.meta, color: colors.muted, fontVariantNumeric: 'tabular-nums' },
  roleText: {
    display: 'block',
    maxWidth: '30rem',
    marginTop: '1rem',
    color: colors.muted,
    fontSize: type.body,
    lineHeight: 1.7,
    textWrap: 'pretty',
  },
  work: { minWidth: 0 },
  secondaryProject: { marginTop: '7rem', maxWidth: '30rem' },
  notes: { minWidth: 0 },
  contact: { maxWidth: '34rem', fontSize: type.body, lineHeight: 1.7 },
  contactNext: { marginTop: '1rem', color: colors.muted },
  cvTitle: { marginTop: '3rem', fontSize: type.meta, fontWeight: weights.regular, color: colors.muted },
  cvs: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, 1fr)', [breakpoints.phone]: '1fr' },
    columnGap: '2rem',
    marginTop: '1rem',
  },

  hero: {
    display: 'grid',
    gridTemplateColumns: { default: '10rem minmax(0, 1fr) minmax(0, 25rem)', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    columnGap: '3rem',
    rowGap: '4rem',
    paddingBottom: '7rem',
  },
  head: { gridColumn: { default: '2 / -1', [breakpoints.tablet]: '1' } },
  intro: { gridColumn: { default: '2', [breakpoints.tablet]: '1' }, alignSelf: 'end', paddingBottom: '2rem' },
  phones: {
    gridColumn: { default: '3', [breakpoints.tablet]: '1' },
    maxWidth: '25rem',
    width: '100%',
    justifySelf: { default: 'end', [breakpoints.tablet]: 'center' },
  },
  section: {
    display: 'grid',
    gridTemplateColumns: { default: '10rem minmax(0, 1fr)', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    gap: '3rem',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
    paddingTop: '3rem',
    paddingBottom: { default: '8rem', [breakpoints.phone]: '5rem' },
  },
  rolesSection: { marginTop: '2rem' },
})

import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { NoteList } from '~/components/NoteList'
import { ProjectCard } from '~/components/ProjectCard'
import { PhoneArtwork } from '~/components/PhoneArtwork'
import { RailNumber } from '~/components/RailNumber'
import { WdWordmark } from '~/components/WdWordmark'
import { kaloCard, workoutDirectorCard, workoutDirectorLinks } from '~/content/projects'
import { noteListSummary, notes } from '~/content/notes'
import { links, site } from '~/content/site'
import { formatShortDate } from '~/lib/dates'
import { seo } from '~/lib/seo'
import { homeJsonLd, jsonLdScript } from '~/lib/structuredData'
import { breakpoints, colors, fonts, layout, leading, space, type, weights } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'
import { ui } from '~/styles/ui'

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
      <div {...stylex.props(ui.wrap)}>
        <section aria-labelledby="intro-title" {...stylex.props(styles.hero)}>
          <div {...stylex.props(ui.railText, styles.heroRail)}>
            <RailNumber n="01" />
            <p>Software engineer in {site.city}</p>
          </div>
          <div {...stylex.props(styles.intro)}>
            <h1 id="intro-title" {...stylex.props(styles.title)}>
              Hi, I’m Ashish.
            </h1>
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
          <PhoneArtwork
            phones={['slick-v5-minimal-clean', 'deadlift-pexels']}
            label="Workout Director app screens"
            priority
            size="hero"
            xstyle={styles.phones}
          />
        </section>
        <section aria-label="Roles" {...stylex.props(ui.penSection, ui.rail)}>
          <div {...stylex.props(ui.railText, styles.sectionIndex)}>
            <RailNumber n="02" />
            <Link to="/work/" {...stylex.props(styles.textLink, ui.focusRing)}>
              Work history
            </Link>
          </div>
          <ul role="list" aria-label="Roles" {...stylex.props(styles.roles)}>
            {roles.map((role, index) => (
              <li key={role.name} {...stylex.props(styles.role, index > 0 && [sk.ruleTop, styles.roleNext])}>
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
        <section aria-labelledby="sel-title" {...stylex.props(ui.penSection, ui.rail)}>
          <div {...stylex.props(ui.railText, styles.sectionIndex)}>
            <RailNumber n="03" />
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
        <section aria-labelledby="notes-title" {...stylex.props(ui.penSection, ui.rail)}>
          <div {...stylex.props(ui.railText, styles.sectionIndex)}>
            <RailNumber n="04" />
            <h2 id="notes-title" {...stylex.props(styles.sectionTitle)}>
              Notes
            </h2>
            <Link to="/notes/" {...stylex.props(styles.textLink, ui.focusRing)}>
              All notes
            </Link>
          </div>
          <div {...stylex.props(styles.notes)}>
            <NoteList items={latestNotes} columns={3} />
          </div>
        </section>
        <section aria-labelledby="contact-title" {...stylex.props(ui.penSection, ui.rail)}>
          <div {...stylex.props(ui.railText, styles.sectionIndex)}>
            <RailNumber n="05" />
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
              and{'\u00a0'}
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
  // The hero on the shared grid: the number and kicker in the rail, the words at the content edge and the phones
  // on the right with their tops level with the name. Below 1100px it is one column: words, then phones.
  hero: {
    display: 'grid',
    gridTemplateColumns: {
      default: `${layout.rail} minmax(20rem, 1fr) minmax(0, 36rem)`,
      [breakpoints.tablet]: 'minmax(0, 1fr)',
    },
    columnGap: layout.railGap,
    rowGap: { default: space.s48, [breakpoints.phone]: space.s24 },
    alignItems: 'start',
    paddingTop: { default: space.s48, [breakpoints.phone]: space.s24 },
    // Below 1100px the phones' ground line would sit close above the next section's line.
    paddingBottom: { default: 0, [breakpoints.tablet]: space.s48 },
  },
  heroRail: {
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.tablet]: 'row' },
    alignItems: { default: 'flex-start', [breakpoints.tablet]: 'center' },
    gap: space.s16,
  },
  intro: { minWidth: 0 },
  title: {
    fontFamily: fonts.brand,
    fontSize: type.display,
    fontWeight: weights.brand,
    lineHeight: leading.display,
    letterSpacing: '-0.055em',
    textWrap: 'balance',
  },
  lead: { marginTop: space.s24, fontSize: type.body, lineHeight: leading.body, maxWidth: '24rem', textWrap: 'pretty' },
  app: { marginTop: space.s48 },
  appHead: { display: 'flex', alignItems: 'center', gap: space.s16 },
  appName: { lineHeight: 0 },
  wordmark: { height: '2.6rem' },
  appText: { fontSize: type.meta, lineHeight: leading.meta, color: colors.muted, marginTop: space.s8 },
  appLinks: { display: 'flex', flexWrap: 'wrap', columnGap: space.s24, marginTop: space.s16 },
  phones: {
    justifySelf: { default: 'end', [breakpoints.tablet]: 'center' },
  },
  textLink: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '2.75rem',
    fontSize: type.meta,
    color: colors.text,
    textDecorationLine: 'none',
    whiteSpace: 'nowrap',
  },
  sectionIndex: {
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.tablet]: 'row' },
    flexWrap: 'wrap',
    alignItems: { default: 'flex-start', [breakpoints.tablet]: 'center' },
    columnGap: space.s24,
    rowGap: space.s8,
  },
  sectionTitle: { fontSize: type.meta, lineHeight: leading.meta, fontWeight: weights.regular, color: colors.text },
  roles: { listStyle: 'none', minWidth: 0 },
  role: {
    display: 'grid',
    gridTemplateColumns: '2.5rem minmax(0, 1fr)',
    columnGap: space.s16,
  },
  // Roles sit 48 apart with a pen line halfway; none after the last, so no line doubles the section line.
  roleNext: { marginTop: space.s24, paddingTop: space.s24 },
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
    marginTop: space.s8,
    color: colors.muted,
    fontSize: type.body,
    lineHeight: leading.body,
    textWrap: 'pretty',
  },
  work: { minWidth: 0 },
  secondaryProject: { marginTop: space.s96 },
  notes: { minWidth: 0 },
  contact: { maxWidth: '36rem', fontSize: type.body, lineHeight: leading.body },
  contactNext: { marginTop: space.s16, color: colors.muted },
  cvTitle: { marginTop: space.s48, fontSize: type.meta, fontWeight: weights.regular, color: colors.muted },
  cvs: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, 1fr)', [breakpoints.phone]: '1fr' },
    columnGap: '2rem',
    marginTop: space.s8,
  },
})

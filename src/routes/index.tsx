import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Availability } from '~/components/Availability'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { NoteList } from '~/components/NoteList'
import { PhoneRow } from '~/components/PhoneRow'
import { ProjectCard } from '~/components/ProjectCard'
import { SectionHead } from '~/components/SectionHead'
import { kaloCard, workoutDirectorCard, workoutDirectorLinks } from '~/content/projects'
import type { ScreenId } from '~/content/workoutDirectorScreens'
import { noteListSummary, notes } from '~/content/notes'
import { site } from '~/content/site'
import { formatShortDate } from '~/lib/dates'
import { seo } from '~/lib/seo'
import { homeJsonLd, jsonLdScript } from '~/lib/structuredData'
import { breakpoints, colors, fonts } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

// All three from the dark Workout Director set, so the row never mixes light and dark screens.
const heroShots: [ScreenId, ScreenId, ScreenId] = ['02-voice', '06-trainer', '07-progress']
const heroSizes = '(max-width: 640px) min(62vw, 250px), (max-width: 760px) 31vw, 170px'

const homeSeo = seo({
  path: '/',
  fullTitle: 'Ashish Kharche · Software engineer in London',
  description: site.description,
  type: 'profile',
})

export const Route = createFileRoute('/')({
  head: () => ({
    meta: homeSeo.meta,
    // React preloads the hero's first phone itself (it has fetchPriority="high").
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
            <p {...stylex.props(styles.lead)}>I work on Android and iOS apps, and the AWS backend behind them.</p>
            <ul role="list" aria-label="Roles" {...stylex.props(styles.roles)}>
              <li {...stylex.props(styles.role)}>
                <Logo name="paythru" size={22} />
                <span>
                  <span {...stylex.props(styles.roleHead)}>
                    <span {...stylex.props(styles.roleName)}>Paythru</span>
                    <span {...stylex.props(styles.years)}>2022 to 2026</span>
                  </span>
                  <span {...stylex.props(styles.roleText)}>
                    Payment apps for EV charging, then its new payments platform on AWS.
                  </span>
                </span>
              </li>
              <li {...stylex.props(styles.role)}>
                <Logo name="spacexsi" size={22} />
                <span>
                  <span {...stylex.props(styles.roleHead)}>
                    <span {...stylex.props(styles.roleName)}>SpaceX Super Intelligence</span>
                  </span>
                  <span {...stylex.props(styles.roleText)}>Part-time QA.</span>
                </span>
              </li>
            </ul>
            <p {...stylex.props(styles.links)}>
              <Link to="/work/" {...stylex.props(ui.link)}>
                Work history
              </Link>
              <a href={`mailto:${site.email}`} {...stylex.props(ui.link)}>
                Email
              </a>
              <a href={site.linkedin} {...stylex.props(ui.link)}>
                LinkedIn
              </a>
              <a href={site.github} {...stylex.props(ui.link)}>
                GitHub
              </a>
            </p>
          </div>
          <div {...stylex.props(styles.phones)}>
            <PhoneRow shots={heroShots} sizes={heroSizes} label="Workout Director app screens" />
          </div>
          <div aria-labelledby="wd-title" role="group" {...stylex.props(styles.app)}>
            <div aria-hidden="true" {...stylex.props(styles.ground)} />
            <div {...stylex.props(styles.appHead)}>
              <Logo name="workoutDirector" size={40} />
              <p id="wd-title" {...stylex.props(styles.appName)}>
                Workout Director
              </p>
            </div>
            <p {...stylex.props(styles.appLinks)}>
              {workoutDirectorLinks.map((link, index) => (
                <a
                  key={link.href}
                  href={link.href}
                  {...stylex.props(styles.button, index === 0 && styles.primary, ui.focusRing)}
                >
                  {link.label}
                  <span aria-hidden="true" {...stylex.props(styles.arrow)}>
                    ↗
                  </span>
                </a>
              ))}
              <Link to="/projects/workout-director/" {...stylex.props(styles.button, ui.focusRing)}>
                Case study
                <span aria-hidden="true" {...stylex.props(styles.arrow)}>
                  →
                </span>
              </Link>
            </p>
          </div>
        </section>

        <section aria-labelledby="sel-title" {...stylex.props(ui.section, styles.selected)}>
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

// The outline AK mark from the footer drawing (public/assets/img/footer-identity.svg).
const styles = stylex.create({
  hero: {
    display: 'grid',
    gridTemplateColumns: { default: 'minmax(0, 1fr) minmax(0, 1fr)', [breakpoints.tablet]: 'minmax(0, 1fr)' },
    alignItems: 'center',
    columnGap: '4rem',
    rowGap: { default: '0.25rem', [breakpoints.tablet]: '2.5rem' },
  },
  intro: {
    gridColumnStart: 1,
    gridRowStart: 1,
    gridRowEnd: { default: 'span 2', [breakpoints.tablet]: 'span 1' },
  },
  // A small monospace label over the name.
  kicker: {
    fontFamily: fonts.mono,
    fontSize: '0.78rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: colors.muted,
  },
  title: {
    marginTop: '0.9rem',
    fontFamily: fonts.serif,
    fontSize: 'clamp(3rem, 7vw, 4.6rem)',
    lineHeight: 1.02,
    fontWeight: 400,
    letterSpacing: '-0.02em',
  },
  lead: {
    marginTop: '1.25rem',
    fontSize: 'clamp(1.15rem, 2.2vw, 1.35rem)',
    lineHeight: 1.45,
    maxWidth: '24em',
    textWrap: 'pretty',
  },
  // Where Ashish has worked: two short rows, separated by space alone.
  roles: {
    listStyle: 'none',
    marginTop: '2rem',
    maxWidth: '30rem',
    display: 'grid',
    rowGap: '1.1rem',
  },
  role: {
    display: 'grid',
    gridTemplateColumns: '28px minmax(0, 1fr)',
    columnGap: '0.85rem',
    alignItems: 'start',
  },
  roleHead: { display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: '0.7rem' },
  roleName: { fontWeight: 500 },
  years: { fontFamily: fonts.mono, fontSize: '0.8rem', color: colors.muted },
  roleText: { display: 'block', marginTop: '0.1rem', fontSize: '0.95rem', lineHeight: 1.5, color: colors.muted },
  links: {
    marginTop: '2rem',
    display: 'flex',
    flexWrap: 'wrap',
    rowGap: '0.5rem',
    columnGap: '1.25rem',
    fontSize: '1rem',
  },
  phones: {
    gridColumnStart: { default: 2, [breakpoints.tablet]: 1 },
    gridRowStart: { default: 1, [breakpoints.tablet]: 3 },
    minWidth: 0,
    alignSelf: 'end',
  },
  // Workout Director, under its screens on wide screens and straight after the intro on phones.
  app: {
    gridColumnStart: { default: 2, [breakpoints.tablet]: 1 },
    gridRowStart: 2,
    alignSelf: 'start',
    minWidth: 0,
  },
  // One quiet ground line under the screens, fading at both ends, like the baseline in the footer drawing.
  ground: {
    height: '1px',
    marginTop: { default: '1.25rem', [breakpoints.tablet]: 0 },
    backgroundImage: `linear-gradient(to right, transparent, ${colors.diagramEdge} 12%, ${colors.diagramEdge} 88%, transparent)`,
  },
  appHead: { marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.85rem' },
  appName: {
    display: 'block',
    fontFamily: fonts.serif,
    fontSize: '1.65rem',
    lineHeight: 1.1,
    letterSpacing: '-0.01em',
  },
  appLinks: { marginTop: '1.1rem', display: 'flex', flexWrap: 'wrap', gap: '0.6rem' },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    minHeight: '2.6rem',
    paddingInline: '1.05rem',
    borderRadius: '999px',
    borderWidth: '1.5px',
    borderStyle: 'solid',
    borderColor: colors.text,
    color: colors.text,
    backgroundColor: { default: 'transparent', ':hover': colors.soft },
    fontSize: '0.95rem',
    fontWeight: 500,
    textDecorationLine: 'none',
    transitionProperty: 'background-color, color',
    transitionDuration: '0.15s',
  },
  primary: {
    color: colors.bg,
    backgroundColor: { default: colors.text, ':hover': colors.muted },
  },
  arrow: { fontSize: '0.85em' },
  // More room between the hero screens and the next heading.
  selected: { marginTop: { default: '7rem', [breakpoints.tablet]: '5.5rem', [breakpoints.phone]: '4.5rem' } },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: { default: '4.5rem', [breakpoints.tablet]: '3rem' },
  },
  notes: { maxWidth: '780px' },
  contactTitle: { marginBottom: '0.75rem' },
})

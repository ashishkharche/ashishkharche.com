import { ogImages } from '~/content/ogImages'
import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { ProjectCard } from '~/components/ProjectCard'
import { RailNumber } from '~/components/RailNumber'
import { kaloCard, workoutDirectorCard } from '~/content/projects'
import { stagePreload } from '~/content/workoutDirectorScreens'
import { seo } from '~/lib/seo'
import { breakpoints, colors, space, type } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export const Route = createFileRoute('/projects/')({
  head: () => {
    const head = seo({
      path: '/projects/',
      title: 'Projects',
      description:
        'Projects by Ashish Kharche: Workout Director, an iPhone and iPad training app with on-device pose tracking and a voice coach, and Kalo, a calorie and macro tracker for iPhone.',
      image: ogImages.projects,
    })
    const stage = workoutDirectorCard.stage
    return { ...head, links: stage ? [...head.links, stagePreload(stage)] : head.links }
  },
  component: Projects,
})

function Projects() {
  return (
    <Main>
      <PageHead title="Projects" lead="Two iPhone apps on the App Store." figure="squat" />
      <section aria-labelledby="apps-title" {...stylex.props(ui.wrap, ui.rail, styles.first)}>
        <div {...stylex.props(ui.railText, styles.railStack)}>
          <RailNumber n="01" />
          <h2 id="apps-title" {...stylex.props(styles.railTitle)}>
            Apps
          </h2>
        </div>
        <div {...stylex.props(styles.apps)}>
          <ProjectCard card={workoutDirectorCard} headingLevel="h3" priority scene="devicesRight" />
          <div {...stylex.props(styles.secondary)}>
            <ProjectCard card={kaloCard} headingLevel="h3" scene="devicesLeft" />
          </div>
          <p {...stylex.props(ui.note, styles.publisher)}>
            Workout Director and Kalo are published on the App Store by Shelgaon Ltd.
          </p>
        </div>
      </section>
      <section aria-labelledby="tools" {...stylex.props(ui.wrap, ui.penSection, ui.rail)}>
        <div {...stylex.props(ui.railText, styles.railStack)}>
          <RailNumber n="02" />
          <h2 id="tools" {...stylex.props(styles.railTitle)}>
            Tools
          </h2>
        </div>
        <div>
          <article {...stylex.props(styles.tool)}>
            <h3 {...stylex.props(ui.h3)}>
              <Link to="/lab/charts/" {...stylex.props(ui.link)}>
                Chart builder
              </Link>
            </h3>
            <p {...stylex.props(styles.toolText)}>
              Headline numbers, ranked lists, head to heads, rank over time and scatter charts of App Store, Google Play
              and app build data, exported as PNG or SVG. Live charts read fresh data on each visit and show when it was
              recorded. Each chart is checked against data rules before download.
            </p>
            <p {...stylex.props(styles.toolMeta)}>TypeScript, React, Canvas and SVG, drawn in the browser</p>
          </article>
        </div>
      </section>
    </Main>
  )
}

const styles = stylex.create({
  first: { marginTop: space.s48 },
  railStack: {
    display: 'flex',
    flexDirection: { default: 'column', [breakpoints.tablet]: 'row' },
    alignItems: { default: 'flex-start', [breakpoints.tablet]: 'center' },
    gap: space.s16,
  },
  railTitle: { fontSize: type.meta, lineHeight: 1.5, fontWeight: 400, color: colors.text },
  apps: { minWidth: 0 },
  secondary: { marginTop: space.s96 },
  publisher: { marginTop: space.s48 },
  tool: { maxWidth: '40rem' },
  toolText: { marginTop: space.s8, color: colors.muted },
  toolMeta: { marginTop: space.s8, color: colors.muted, fontSize: type.meta },
})

import { ogImages } from '~/content/ogImages'
import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { ProjectCard } from '~/components/ProjectCard'
import { kaloCard, workoutDirectorCard } from '~/content/projects'
import { stagePreload } from '~/content/workoutDirectorScreens'
import { seo } from '~/lib/seo'
import { breakpoints, colors } from '~/styles/tokens.stylex'
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
      <div {...stylex.props(ui.wrap)}>
        <PageHead title="Projects" lead="Two iPhone apps on the App Store." />
        <div {...stylex.props(styles.grid, ui.section)}>
          <ProjectCard card={workoutDirectorCard} headingLevel="h2" priority />
          <ProjectCard card={kaloCard} headingLevel="h2" />
        </div>
        <p {...stylex.props(ui.note)}>Workout Director and Kalo are published on the App Store by Shelgaon Ltd.</p>
        <section aria-labelledby="tools" {...stylex.props(ui.section)}>
          <h2 id="tools" {...stylex.props(ui.h2)}>
            Tools
          </h2>
          <article {...stylex.props(styles.tool)}>
            <h3 {...stylex.props(ui.h3)}>
              <Link to="/lab/charts/" {...stylex.props(ui.link)}>
                Chart builder
              </Link>
            </h3>
            <p {...stylex.props(styles.toolText)}>
              Scatter charts of public App Store and app build data from five templates, exported as PNG or SVG. Each
              chart is checked against data rules before download: ranks come with their coverage, and builds older than
              60 days are labelled.
            </p>
            <p {...stylex.props(styles.toolMeta)}>TypeScript · React · Canvas and SVG, drawn in the browser</p>
          </article>
        </section>
      </div>
    </Main>
  )
}

const styles = stylex.create({
  tool: { marginTop: '1.5rem', maxWidth: '40rem' },
  toolText: { marginTop: '0.5rem', color: colors.muted },
  toolMeta: { marginTop: '0.6rem', color: colors.muted, fontSize: '0.9rem' },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: { default: '4.5rem', [breakpoints.tablet]: '3rem' },
  },
})

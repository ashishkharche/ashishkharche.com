import { ogImages } from '~/content/ogImages'
import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import CaseStudy from '#content/projects/workout-director.mdx'
import { Diagram } from '~/components/Diagram'
import { Facts } from '~/components/Figures'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { Muted, Prose, mdxComponents } from '~/components/Prose'
import { DeviceStage, ScreenRail, Shots } from '~/components/Screens'
import { StackList } from '~/components/StackList'
import { WdWordmark } from '~/components/WdWordmark'
import { workoutDirectorCard, workoutDirectorHero, workoutDirectorStackGroups } from '~/content/projects'
import { links } from '~/content/site'
import { stagePreload } from '~/content/workoutDirectorScreens'
import { seo } from '~/lib/seo'
import { colors, type } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

const pageSeo = () =>
  seo({
    path: '/projects/workout-director/',
    title: 'Workout Director',
    description:
      'Case study: Workout Director, an iPhone and iPad training app. On-device pose tracking counts reps, a voice coach changes the workout only through tool calls with Undo, and a trainer chat runs on a TypeScript backend on AWS Lambda.',
    type: 'article',
    image: ogImages.workoutDirector,
  })

export const Route = createFileRoute('/projects/workout-director')({
  head: () => {
    const head = pageSeo()
    return { ...head, links: [...head.links, stagePreload(workoutDirectorHero)] }
  },
  component: WorkoutDirector,
})

/** Every App Store screen, for iPhone and then iPad, wider than the text column. */
function ScreensGallery() {
  return (
    <div {...stylex.props(ui.wide, styles.gallery)}>
      <ScreenRail device="iphone" title="iPhone" />
      <ScreenRail device="ipad" title="iPad" />
    </div>
  )
}

function WorkoutDirector() {
  return (
    <Main>
      <div {...stylex.props(ui.wrap)}>
        <Link to="/projects/" {...stylex.props(styles.back, ui.focusRing)}>
          ← Projects
        </Link>
        <PageHead
          title={<WdWordmark xstyle={styles.wordmark} />}
          lead={workoutDirectorCard.summary}
          icon={<Logo name="workoutDirector" size={40} />}
        />
        <DeviceStage
          {...workoutDirectorHero}
          priority
          label="Workout Director App Store screens on iPad and iPhone"
          xstyle={styles.stage}
        />
      </div>
      {/* The details row and the stack get the wider column so each item fits on one or two lines. */}
      <div {...stylex.props(ui.columnWide)}>
        <Facts
          items={[
            { term: 'My part', detail: 'SwiftUI app, TypeScript backend, releases' },
            { term: 'Published by', detail: 'Shelgaon Ltd' },
            {
              term: 'Links',
              detail: (
                <>
                  <a href={links.workoutDirectorStore} {...stylex.props(ui.link)}>
                    App Store
                  </a>{' '}
                  ,{' '}
                  <a href={links.workoutDirectorSite} {...stylex.props(ui.link)}>
                    workoutdirector.com
                  </a>
                </>
              ),
            },
          ]}
        />
        <StackList groups={workoutDirectorStackGroups} />
      </div>
      <div {...stylex.props(ui.column)}>
        <div {...stylex.props(ui.section)}>
          <Prose data-reveal="">
            <CaseStudy components={{ ...mdxComponents, Diagram, Shots, Muted, Gallery: ScreensGallery }} />
          </Prose>
        </div>
      </div>
    </Main>
  )
}

const styles = stylex.create({
  stage: { marginTop: { default: '3rem', '@media (max-width: 760px)': '2.25rem' } },
  // The brand lettering at about the height of two lines of the title.
  wordmark: { height: { default: '6.5rem', '@media (max-width: 560px)': '4.25rem' } },
  back: {
    display: 'inline-block',
    marginBottom: '1.75rem',
    fontSize: type.meta,
    color: { default: colors.muted, ':hover': colors.accent },
    textDecorationLine: 'none',
  },
  gallery: { marginTop: '0.5rem', marginBottom: '2rem' },
})

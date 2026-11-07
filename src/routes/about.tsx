import * as stylex from '@stylexjs/stylex'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Availability } from '~/components/Availability'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { Lead, Prose, mdxComponents } from '~/components/Prose'
import { site } from '~/content/site'
import { seo } from '~/lib/seo'
import { aboutJsonLd, jsonLdScript } from '~/lib/structuredData'
import dates from 'virtual:content-dates'
import { ui } from '~/styles/ui'

export const Route = createFileRoute('/about')({
  head: () => ({
    ...seo({
      path: '/about/',
      title: 'About',
      description:
        'About Ashish Kharche, a software engineer in London: iOS and Android apps, TypeScript and AWS, and QA on the Grok apps.',
    }),
    scripts: [jsonLdScript(aboutJsonLd(dates.pages['/about/']))],
  }),
  component: About,
})

const P = mdxComponents.p as (props: { children: React.ReactNode }) => React.JSX.Element
const H2 = mdxComponents.h2 as (props: { children: React.ReactNode }) => React.JSX.Element

function About() {
  return (
    <Main>
      <div {...stylex.props(ui.column)}>
        <PageHead title="About" />
        <div {...stylex.props(ui.mt2)}>
          <Prose>
            <Lead>I’m Ashish Kharche, a software engineer living in London.</Lead>
            <P>
              I studied for an MSc in Software Engineering at <Logo name="kingston" size={20} inline />
              Kingston University, then spent four years at <Logo name="paythru" size={20} inline />
              Paythru working on Android and iOS payment apps for EV charging and, in 2026, its new payments platform on
              AWS. You can read more on the{' '}
              <Link to="/work/" {...stylex.props(ui.link)}>
                Work
              </Link>{' '}
              page.
            </P>
            <P>
              From January to October 2026 I also worked at <Logo name="spacexsi" size={20} inline />
              SpaceX Super Intelligence (formerly xAI). As a Quality Assurance Engineer, I’ve tested Grok iOS and web
              builds, Grok Bot and Grok Build before release.
            </P>
            <P>
              I also develop and release two iPhone apps, <Logo name="workoutDirector" size={20} inline />
              Workout Director and <Logo name="kalo" size={20} inline />
              Kalo. Both are published on the App Store by Shelgaon Ltd.
            </P>
            <H2>Contact</H2>
            <P>
              Email:{' '}
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
            </P>
            <Availability email={false} />
          </Prose>
        </div>
      </div>
    </Main>
  )
}

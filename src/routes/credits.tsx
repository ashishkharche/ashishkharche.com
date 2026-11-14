import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { seo } from '~/lib/seo'
import { colors, leading, space, type } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export const Route = createFileRoute('/credits')({
  head: () =>
    seo({
      path: '/credits/',
      title: 'Credits',
      description: 'Credits for the videos, photos and adapted images used on ashishkharche.com.',
    }),
  component: Credits,
})

// Links inside running text keep the heavier weight so they read as links without an underline.
const link = stylex.props(ui.link)

function Credits() {
  return (
    <Main>
      <PageHead title="Credits" lead="The videos, photos and adapted images used on this site." figure="lunge" />
      <section aria-label="Credits" {...stylex.props(ui.wrap, styles.section)}>
        <div {...stylex.props(ui.rail)}>
          <p {...stylex.props(ui.railText)}>Video</p>
          <ul role="list" {...stylex.props(styles.list)}>
            <li>
              <a href="https://commons.wikimedia.org/wiki/File:Kettlebell_crush_grip_push-up.webm" {...link}>
                Taco fleur / Wikimedia Commons
              </a>
              ,{' '}
              <a href="https://creativecommons.org/licenses/by-sa/4.0/" {...link}>
                CC BY-SA 4.0
              </a>
              . Cropped; pose overlay, interface composition and chart added. The camera still in the Live Coach design
              on the Design page. Adapted images: CC BY-SA 4.0.
            </li>
            <li>
              <a href="https://www.pexels.com/video/31035743/" {...link}>
                Aliaksei Masiukevich / Pexels (31035743)
              </a>
              . The footage in the first Workout Director App Store screenshot.{' '}
              <a href="https://www.pexels.com/license/" {...link}>
                Pexels License
              </a>
              .
            </li>
            <li>
              <a href="https://www.pexels.com/video/a-woman-lifting-a-barbell-7674505/" {...link}>
                cottonbro studio / Pexels (7674505)
              </a>
              .
            </li>
            <li>
              <a
                href="https://www.pexels.com/video/woman-in-pink-and-gray-sports-gear-exercising-outdoors-2785531/"
                {...link}
              >
                cottonbro studio / Pexels (2785531)
              </a>
              . Cropped still at 2.36 seconds.{' '}
              <a href="https://www.pexels.com/license/" {...link}>
                Pexels License
              </a>
              .
            </li>
          </ul>
        </div>
        <div {...stylex.props(ui.rail, styles.group)}>
          <p {...stylex.props(ui.railText)}>Photos</p>
          <ul role="list" {...stylex.props(styles.list)}>
            <li>
              Food photos in the Kalo screens via{' '}
              <a href="https://www.pexels.com/" {...link}>
                Pexels
              </a>
              .
            </li>
          </ul>
        </div>
      </section>
    </Main>
  )
}

const styles = stylex.create({
  section: { marginTop: space.s48 },
  group: { marginTop: space.s48 },
  list: {
    listStyle: 'none',
    display: 'grid',
    rowGap: space.s24,
    maxWidth: '40rem',
    fontSize: type.body,
    lineHeight: leading.body,
    color: colors.muted,
  },
})

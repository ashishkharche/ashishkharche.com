import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { Availability } from '~/components/Availability'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { Rows } from '~/components/Rows'
import { Figure, Leg, legSpace } from '~/components/Scene'
import { certificationsNote, maestroArticles, roles, tools, workIntro } from '~/content/work'
import { seo } from '~/lib/seo'
import { breakpoints, colors, type } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'
import { ui } from '~/styles/ui'

export const Route = createFileRoute('/work')({
  head: () =>
    seo({
      path: '/work/',
      title: 'Work',
      description:
        'Work history of Ashish Kharche: senior mobile engineer at Paythru (iOS, Android and AWS), QA engineer at SpaceX Super Intelligence (formerly xAI) testing Grok iOS and web builds, Grok Bot and Grok Build before release, plus Maestro and Kingston University.',
    }),
  component: Work,
})

function Work() {
  return (
    <Main>
      <Leg from="edge" as="div" xstyle={legSpace.first}>
        <div {...stylex.props(legSpace.headScene)}>
          <div {...stylex.props(legSpace.headText)}>
            <PageHead title="Work" lead={workIntro} />
          </div>
          <Figure name="walk" xstyle={legSpace.headFigure} />
        </div>
      </Leg>

      <section aria-labelledby="roles-title">
        <h2 id="roles-title" {...stylex.props(ui.visuallyHidden)}>
          Roles
        </h2>
        {/* Each role is a stretch of the line, the words on the side it comes down. */}
        <ol role="list" {...stylex.props(styles.entries)}>
          {roles.map((role, index) => (
            <Leg
              key={role.org}
              as="li"
              from={index % 2 === 0 ? 'right' : 'left'}
              stroke={index % 2 === 0 ? 2 : 1}
              xstyle={legSpace.text}
            >
              <div {...stylex.props(styles.entry, legSpace.columnWide)}>
                <p {...stylex.props(styles.when)}>
                  {role.when ?? <span {...stylex.props(ui.visuallyHidden)}>No dates</span>}
                </p>
                <div>
                  <h3 {...stylex.props(ui.h3, styles.org)}>
                    {role.logo ? (
                      <span {...stylex.props(styles.mark)}>
                        <Logo name={role.logo} size={32} />
                      </span>
                    ) : null}
                    <span>
                      {role.org}
                      {role.orgNote ? (
                        <>
                          {' '}
                          <span {...stylex.props(ui.muted)}>{role.orgNote}</span>
                        </>
                      ) : null}
                    </span>
                  </h3>
                  {(typeof role.role === 'string' ? [role.role] : role.role).map((line) => (
                    <p key={line} {...stylex.props(styles.role)}>
                      {line}
                    </p>
                  ))}
                  {role.paragraphs.map((text) => (
                    <p key={text.slice(0, 32)} {...stylex.props(styles.para)}>
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </Leg>
          ))}
        </ol>
        <Leg as="div" from={roles.length % 2 === 0 ? 'right' : 'left'} xstyle={[legSpace.text, styles.shortLeg]}>
          <p {...stylex.props(styles.certs, legSpace.columnWide, roles.length % 2 === 0 && legSpace.toRight)}>
            {certificationsNote}
          </p>
        </Leg>
      </section>

      <Leg
        from={roles.length % 2 === 0 ? 'left' : 'right'}
        stroke={2}
        labelledBy="writing-title"
        xstyle={legSpace.text}
      >
        <div {...stylex.props(legSpace.columnWide, roles.length % 2 !== 0 && legSpace.toRight)}>
          <h2 id="writing-title" {...stylex.props(ui.h2, styles.h2)}>
            Writing for Maestro
          </h2>
          <p {...stylex.props(ui.muted)}>Six of the 14 posts I wrote for the Maestro blog in 2023.</p>
          <Rows spaced rows={maestroArticles.map((a) => ({ title: a.title, href: a.href, date: a.date }))} />
        </div>
      </Leg>

      <Leg from={roles.length % 2 === 0 ? 'right' : 'left'} labelledBy="tools-title" xstyle={legSpace.text}>
        <div {...stylex.props(legSpace.columnWide, roles.length % 2 === 0 && legSpace.toRight)}>
          <h2 id="tools-title" {...stylex.props(ui.h2, styles.h2)}>
            Tools
          </h2>
          <dl {...stylex.props(ui.mt1)}>
            {tools.map((tool, index) => (
              <div key={tool.area} {...stylex.props(index > 0 && sk.ruleTop, styles.skill)}>
                <dt {...stylex.props(ui.muted)}>{tool.area}</dt>
                <dd>{tool.items}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Leg>

      <Leg
        from={roles.length % 2 === 0 ? 'left' : 'right'}
        to="edge"
        stroke={2}
        labelledBy="cv-title"
        xstyle={legSpace.text}
      >
        <div {...stylex.props(legSpace.columnWide, roles.length % 2 !== 0 && legSpace.toRight)}>
          <h2 id="cv-title" {...stylex.props(ui.h2, styles.h2)}>
            CV
          </h2>
          <Availability />
        </div>
      </Leg>
    </Main>
  )
}

const styles = stylex.create({
  h2: { marginBottom: '0.75rem' },
  entries: { listStyle: 'none' },
  entry: {
    display: 'grid',
    gridTemplateColumns: { default: '10rem 1fr', [breakpoints.tablet]: '1fr' },
    gap: { default: '1.5rem', [breakpoints.tablet]: '0.2rem' },
  },
  shortLeg: { paddingTop: { default: '3rem', [breakpoints.phone]: '2.5rem' } },
  certs: { color: colors.muted, fontSize: type.meta },
  when: { color: colors.muted, fontSize: type.meta, paddingTop: '0.1rem', textWrap: 'balance' },
  org: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  // Each company mark in a drawn box of the same size.
  mark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.75rem',
    height: '2.5rem',
    flex: 'none',
  },
  role: { color: colors.muted, marginTop: { default: '0.5rem', ':nth-child(n+3)': '0.1rem' }, textWrap: 'pretty' },
  para: { marginTop: '1rem', lineHeight: 1.75, textWrap: 'pretty' },
  skill: {
    display: 'grid',
    gridTemplateColumns: { default: '7rem 1fr', [breakpoints.phone]: '1fr' },
    gap: { default: '1rem', [breakpoints.phone]: 0 },
    paddingBlock: '0.55rem',
  },
})

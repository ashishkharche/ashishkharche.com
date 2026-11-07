import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { Availability } from '~/components/Availability'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { Rows } from '~/components/Rows'
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
        'Work history of Ashish Kharche: senior mobile engineer at Paythru (iOS, Android and AWS), QA on more than 500 Grok builds at SpaceX Super Intelligence (formerly xAI), Maestro and Kingston University.',
    }),
  component: Work,
})

function Work() {
  return (
    <Main>
      <div {...stylex.props(ui.columnWide)}>
        <PageHead title="Work" lead={workIntro} />

        <section aria-labelledby="roles-title" {...stylex.props(ui.section)}>
          <h2 id="roles-title" {...stylex.props(ui.visuallyHidden)}>
            Roles
          </h2>
          <ol role="list" {...stylex.props(sk.ruleBottom, styles.entries)}>
            {roles.map((role, index) => (
              <li key={role.org} {...stylex.props(index > 0 && sk.ruleTop, styles.entry)}>
                <p {...stylex.props(styles.when)}>
                  {role.when ?? <span {...stylex.props(ui.visuallyHidden)}>No dates</span>}
                </p>
                <div>
                  <h3 {...stylex.props(ui.h3, styles.org)}>
                    {role.logo ? (
                      <span {...stylex.props(sk.box, styles.mark)}>
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
                  <p {...stylex.props(styles.role)}>{role.role}</p>
                  {role.paragraphs.map((text) => (
                    <p key={text.slice(0, 32)} {...stylex.props(styles.para)}>
                      {text}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <p {...stylex.props(ui.note)}>{certificationsNote}</p>
        </section>

        <section aria-labelledby="writing-title" {...stylex.props(ui.section)}>
          <h2 id="writing-title" {...stylex.props(ui.h2, styles.h2)}>
            Writing for Maestro
          </h2>
          <p {...stylex.props(ui.muted)}>Six of the 14 posts I wrote for the Maestro blog in 2023.</p>
          <Rows spaced rows={maestroArticles.map((a) => ({ title: a.title, href: a.href, date: a.date }))} />
        </section>

        <section aria-labelledby="tools-title" {...stylex.props(ui.section)}>
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
        </section>

        <section aria-labelledby="cv-title" {...stylex.props(ui.section)}>
          <h2 id="cv-title" {...stylex.props(ui.h2, styles.h2)}>
            CV
          </h2>
          <Availability />
        </section>
      </div>
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
    paddingBlock: '1.75rem',
  },
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
  role: { color: colors.muted, marginTop: '0.4rem', textWrap: 'pretty' },
  para: { marginTop: '0.75rem', textWrap: 'pretty' },
  skill: {
    display: 'grid',
    gridTemplateColumns: { default: '7rem 1fr', [breakpoints.phone]: '1fr' },
    gap: { default: '1rem', [breakpoints.phone]: 0 },
    paddingBlock: '0.55rem',
  },
})

import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { Availability } from '~/components/Availability'
import { Logo } from '~/components/Logo'
import { Main } from '~/components/Main'
import { PageHead } from '~/components/PageHead'
import { Rows } from '~/components/Rows'
import { certificationsNote, maestroArticles, roles, tools, workIntro } from '~/content/work'
import { seo } from '~/lib/seo'
import { breakpoints, colors, layout, leading, space, type } from '~/styles/tokens.stylex'
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
      <PageHead title="Work" lead={workIntro} figure="walk" />

      <section aria-labelledby="roles-title" {...stylex.props(ui.wrap, styles.first)}>
        <h2 id="roles-title" {...stylex.props(ui.visuallyHidden)}>
          Roles
        </h2>
        {/* Each role on the shared grid: its dates in the rail, the role at the content edge, 48 between roles. */}
        <ol role="list" {...stylex.props(styles.entries)}>
          {roles.map((role, index) => (
            <li key={role.org} {...stylex.props(ui.rail, styles.entry, index > 0 && [sk.ruleTop, styles.entryNext])}>
              <p {...stylex.props(ui.railText, styles.when)}>
                {role.when ?? <span {...stylex.props(ui.visuallyHidden)}>No dates</span>}
              </p>
              <div {...stylex.props(styles.entryBody)}>
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
            </li>
          ))}
        </ol>
        <div {...stylex.props(ui.rail, styles.certsRow)}>
          <span />
          <p {...stylex.props(styles.certs)}>{certificationsNote}</p>
        </div>
      </section>

      <section aria-labelledby="writing-title" {...stylex.props(ui.wrap, ui.penSection, ui.rail)}>
        <p {...stylex.props(ui.railText)}>2023</p>
        <div {...stylex.props(styles.body)}>
          <h2 id="writing-title" {...stylex.props(ui.h2, styles.h2)}>
            Writing for Maestro
          </h2>
          <p {...stylex.props(ui.muted)}>Six of the 14 posts I wrote for the Maestro blog in 2023.</p>
          <Rows spaced rows={maestroArticles.map((a) => ({ title: a.title, href: a.href, date: a.date }))} />
        </div>
      </section>

      <section aria-labelledby="tools-title" {...stylex.props(ui.wrap, ui.penSection, ui.rail)}>
        <span />
        <div {...stylex.props(styles.body)}>
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
      </section>

      <section aria-labelledby="cv-title" {...stylex.props(ui.wrap, ui.penSection, ui.rail)}>
        <span />
        <div {...stylex.props(styles.body)}>
          <h2 id="cv-title" {...stylex.props(ui.h2, styles.h2)}>
            CV
          </h2>
          <Availability />
        </div>
      </section>
    </Main>
  )
}

const styles = stylex.create({
  first: { marginTop: space.s48 },
  h2: { marginBottom: space.s16 },
  body: { minWidth: 0, maxWidth: layout.columnWide },
  entries: { listStyle: 'none' },
  entry: { rowGap: space.s8 },
  // Roles sit 48 apart, a pen line halfway between them.
  entryNext: { marginTop: space.s24, paddingTop: space.s24 },
  entryBody: { minWidth: 0, maxWidth: layout.columnWide },
  certsRow: { marginTop: space.s48 },
  certs: { color: colors.muted, fontSize: type.meta, lineHeight: leading.meta, maxWidth: layout.columnWide },
  when: { paddingTop: '0.2rem', textWrap: 'balance' },
  org: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  mark: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.75rem',
    height: '2.5rem',
    flex: 'none',
  },
  role: { color: colors.muted, marginTop: { default: space.s8, ':nth-child(n+3)': '0.1rem' }, textWrap: 'pretty' },
  para: { marginTop: space.s16, lineHeight: leading.body, textWrap: 'pretty' },
  skill: {
    display: 'grid',
    gridTemplateColumns: { default: '7rem 1fr', [breakpoints.phone]: '1fr' },
    gap: { default: '1rem', [breakpoints.phone]: 0 },
    paddingBlock: '0.55rem',
  },
})

import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { useId } from 'react'
import { Logo } from './Logo'
import { SketchArrow } from './SketchArrow'
import { DeviceStage } from './Screens'
import { screenshotSrc, screenshotSrcSet, type ProjectCard as Card } from '~/content/projects'
import { breakpoints, colors, fonts, type, weights } from '~/styles/tokens.stylex'
import { device, sk } from '~/styles/sketch'
import { ui } from '~/styles/ui'

interface Props {
  card: Card
  headingLevel?: 'h2' | 'h3'
  /** For a project at the top of the page: load its images straight away, without the scroll fade. */
  priority?: boolean
}

/**
 * A project shown as its screenshots, large on the page, with the title and
 * summary underneath: either three phone screens in a row or, for a project
 * with a stage, an iPad and two iPhones layered on a soft panel. A project
 * with neither shows only its title and summary. Projects after the first get
 * a thin rule above.
 */
export function ProjectCard({ card, headingLevel = 'h3', priority = false }: Props) {
  const Heading = headingLevel
  const stackId = useId()
  const linkProps = stylex.props(styles.link)
  const label = (
    <>
      {card.title} <SketchArrow dir={card.external ? 'out' : 'right'} xstyle={styles.arrow} />
    </>
  )
  return (
    <article {...stylex.props(stylex.defaultMarker(), sk.ruleTop, styles.project)}>
      {card.stage ? (
        <DeviceStage ipad={card.stage.ipad} phones={card.stage.phones} priority={priority} />
      ) : card.shots?.length ? (
        <div {...stylex.props(styles.media)}>
          {(card.shots ?? []).map((shot, index) => (
            <span key={shot.name} {...stylex.props(device.phone, styles.phone)}>
              <img
                src={screenshotSrc(shot.name)}
                srcSet={screenshotSrcSet(shot.name)}
                sizes="(max-width: 760px) 30vw, 290px"
                width={480}
                height={1038}
                alt={shot.alt}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority && index === 1 ? 'high' : 'auto'}
                decoding="async"
                {...stylex.props(styles.shot)}
              />
            </span>
          ))}
        </div>
      ) : null}
      <div {...stylex.props(styles.body, !card.stage && !card.shots?.length && styles.bodyOnly)}>
        <div {...stylex.props(styles.head)}>
          <Logo name={card.logo} size={40} />
          <div>
            <Heading {...stylex.props(styles.title)}>
              {card.external ? (
                <a href={card.href} {...linkProps}>
                  {label}
                </a>
              ) : (
                <Link to={card.href} {...linkProps}>
                  {label}
                </Link>
              )}
            </Heading>
            <p {...stylex.props(styles.meta)}>{card.meta}</p>
          </div>
        </div>
        <div>
          <p {...stylex.props(styles.text)}>{card.summary}</p>
          {card.links?.length ? (
            <p {...stylex.props(styles.outLinks)}>
              {card.links.map((link) => (
                <a key={link.href} href={link.href} {...stylex.props(ui.link, styles.outLink)}>
                  {link.label} <SketchArrow dir="out" />
                </a>
              ))}
            </p>
          ) : null}
          {card.stack?.length ? (
            <div role="group" aria-label="Built with" {...stylex.props(styles.stack)}>
              {card.stack.map((group, index) => (
                <div key={group.label} {...stylex.props(styles.stackRow)}>
                  <span id={`${stackId}-${index}`} {...stylex.props(styles.stackLabel)}>
                    {group.label}
                  </span>
                  <ul role="list" aria-labelledby={`${stackId}-${index}`} {...stylex.props(styles.tags)}>
                    {group.items.map((item) => (
                      <li key={item} {...stylex.props(sk.box, styles.tag)}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

const styles = stylex.create({
  project: {
    position: 'relative',
    paddingTop: { default: '4.5rem', ':first-child': 0, [breakpoints.tablet]: '3rem' },
    '::before': { display: { default: 'block', ':first-child': 'none' } },
  },
  media: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  phone: {
    display: 'block',
    flex: 'none',
    width: { default: '30%', [breakpoints.tablet]: '31.5%' },
  },
  shot: {
    display: 'block',
    width: '100%',
    borderRadius: { default: '18px', [breakpoints.tablet]: '10px' },
  },
  body: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr 1.4fr', [breakpoints.tablet]: '1fr' },
    columnGap: '3rem',
    rowGap: '0.6rem',
    alignItems: 'baseline',
    marginTop: { default: '2.5rem', [breakpoints.tablet]: '1.75rem' },
  },
  // A project shown without screens: just the title and summary under the rule.
  bodyOnly: { marginTop: 0 },
  head: { display: 'flex', alignItems: 'flex-start', gap: '1rem' },
  title: {
    fontFamily: fonts.serif,
    fontSize: type.title,
    fontWeight: weights.regular,
    lineHeight: 1.15,
    letterSpacing: '-0.01em',
  },
  link: {
    color: { default: colors.text, [stylex.when.ancestor(':hover')]: colors.accent },
    textDecorationLine: { default: 'none', ':focus-visible': 'underline' },
    textUnderlineOffset: '0.2em',
    outline: 'none',
    '::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
    },
  },
  // Geist Serif has no diagonal arrow, so the arrows use the body font.
  arrow: { width: '0.8em', height: '0.8em', verticalAlign: '-0.02em' },
  meta: { marginTop: '0.4rem', fontSize: type.meta, color: colors.muted },
  // Sit above the card's full-size link so these open their own pages.
  outLinks: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexWrap: 'wrap',
    rowGap: '0.4rem',
    columnGap: '1.25rem',
    marginTop: '1rem',
    fontSize: type.body,
  },
  outLink: { position: 'relative', zIndex: 1 },
  // The stack as small outlined tags in the meta size, one row per group.
  stack: { display: 'grid', rowGap: '0.6rem', marginTop: '1.4rem' },
  stackRow: {
    display: 'grid',
    gridTemplateColumns: { default: '5.5rem minmax(0, 1fr)', [breakpoints.phone]: '1fr' },
    alignItems: 'baseline',
    columnGap: '0.75rem',
    rowGap: '0.35rem',
  },
  stackLabel: {
    fontSize: type.meta,
    color: colors.muted,
  },
  tags: { listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' },
  tag: {
    fontSize: type.meta,
    lineHeight: 1.4,
    paddingBlock: '0.2rem',
    paddingInline: '0.55rem',
    color: colors.text,
  },
  text: { fontSize: type.body, lineHeight: 1.55, color: colors.muted, maxWidth: '34em' },
})

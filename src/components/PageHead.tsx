import * as stylex from '@stylexjs/stylex'
import type { ReactNode } from 'react'
import { colors, fonts, type, weights } from '~/styles/tokens.stylex'

export function PageHead({ title, lead, icon }: { title: string; lead?: ReactNode; icon?: ReactNode }) {
  return (
    <header>
      {icon ? <div {...stylex.props(styles.icon)}>{icon}</div> : null}
      <h1 {...stylex.props(styles.title)}>{title}</h1>
      {lead ? <p {...stylex.props(styles.lead)}>{lead}</p> : null}
    </header>
  )
}

const styles = stylex.create({
  icon: { marginBottom: '1rem' },
  title: {
    fontFamily: fonts.serif,
    fontSize: type.title,
    lineHeight: 1.15,
    textWrap: 'balance',
    fontWeight: weights.display,
    letterSpacing: '-0.012em',
  },
  lead: {
    marginTop: '1.25rem',
    fontSize: type.lead,
    lineHeight: 1.6,
    color: colors.muted,
    maxWidth: '36em',
    textWrap: 'pretty',
  },
})

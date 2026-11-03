import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { breakpoints, colors, type } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

export interface Row {
  title: string
  /** Internal path or external URL. Rows without a link are shown muted. */
  href?: string
  date: string
  desc?: string
}

export function Rows({ rows, spaced = false }: { rows: Row[]; spaced?: boolean }) {
  return (
    <ul role="list" {...stylex.props(styles.list, spaced && ui.mt1)}>
      {rows.map((row) => (
        <li key={row.title} {...stylex.props(styles.row)}>
          {row.href === undefined ? (
            <span {...stylex.props(ui.muted)}>{row.title}</span>
          ) : row.href.startsWith('/') ? (
            <Link to={row.href} {...stylex.props(ui.link)}>
              {row.title}
            </Link>
          ) : (
            <a href={row.href} {...stylex.props(ui.link)}>
              {row.title}
            </a>
          )}
          <span {...stylex.props(styles.date)}>{row.date}</span>
          {row.desc ? <span {...stylex.props(styles.desc)}>{row.desc}</span> : null}
        </li>
      ))}
    </ul>
  )
}

const styles = stylex.create({
  list: {
    listStyle: 'none',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
  },
  row: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr auto', [breakpoints.phone]: '1fr' },
    rowGap: '0.25rem',
    columnGap: '1.5rem',
    alignItems: 'baseline',
    paddingBlock: '0.85rem',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.line,
  },
  date: { color: colors.muted, fontSize: type.meta, whiteSpace: 'nowrap' },
  desc: { gridColumnStart: 1, gridColumnEnd: -1, color: colors.muted, fontSize: type.body, textWrap: 'pretty' },
})

import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { breakpoints, colors, type } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'
import { ui } from '~/styles/ui'
import { SketchArrow } from './SketchArrow'

export interface Row {
  title: string
  /** Internal path or external URL. Rows without a link are shown muted. */
  href?: string
  date: string
  desc?: string
}

export function Rows({ rows, spaced = false }: { rows: Row[]; spaced?: boolean }) {
  return (
    <ul role="list" {...stylex.props(sk.ruleTop, styles.list, spaced && ui.mt1)}>
      {/* A drawn line between rows only: the section line after the list closes it, so the last row has none. */}
      {rows.map((row, index) => (
        <li key={row.title} {...stylex.props(index < rows.length - 1 && sk.ruleBottom, styles.row)}>
          {row.href === undefined ? (
            <span {...stylex.props(ui.muted)}>{row.title}</span>
          ) : row.href.startsWith('/') ? (
            <Link to={row.href} {...stylex.props(ui.link, ui.plainLink)}>
              {row.title} <SketchArrow />
            </Link>
          ) : (
            <a href={row.href} {...stylex.props(ui.link, ui.plainLink)}>
              {row.title} <SketchArrow dir="out" />
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
  list: { listStyle: 'none' },
  row: {
    display: 'grid',
    gridTemplateColumns: { default: '1fr auto', [breakpoints.phone]: '1fr' },
    rowGap: '0.25rem',
    columnGap: '1.5rem',
    alignItems: 'baseline',
    paddingBlock: '0.85rem',
  },
  date: { color: colors.muted, fontSize: type.meta, whiteSpace: 'nowrap' },
  desc: { gridColumnStart: 1, gridColumnEnd: -1, color: colors.muted, fontSize: type.body, textWrap: 'pretty' },
})

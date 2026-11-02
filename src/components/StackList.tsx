import * as stylex from '@stylexjs/stylex'
import { useId } from 'react'
import type { StackEntry } from '~/content/projects'
import { stackIcons } from '~/content/stackIcons'
import { ui } from '~/styles/ui'
import { breakpoints, colors, type, weights } from '~/styles/tokens.stylex'

type Group = { label: string; items: StackEntry[] }

/**
 * How the stack is laid out.
 * - `grid`: each group on one line of icon chips (icon and name); what each item does sits in a
 *   "What each one does" disclosure under the chips.
 * - `list`: the full list (icon, name and note) for the first two groups, the rest behind a
 *   "Show all" disclosure.
 */
export type StackLayout = 'grid' | 'list'

interface Props {
  groups: Group[]
  layout?: StackLayout
}

/** The layout the case study uses. */
export const stackLayout: StackLayout = 'grid'

/** Icon size in pixels, inside a 40px tile. Better Auth asks for its mark at 24px or more. */
const ICON = 24

function StackTile({ name }: { name: StackEntry['name'] }) {
  const icon = stackIcons[name]
  if (icon.kind === 'monogram') {
    return (
      <span aria-hidden="true" data-stack-tile="monogram" {...stylex.props(styles.tile, styles.monogram)}>
        {icon.letters}
      </span>
    )
  }
  return (
    <span data-stack-tile="mark" {...stylex.props(styles.tile)}>
      {(['light', 'dark'] as const).map((theme) => (
        <img
          key={theme}
          src={icon[theme]}
          width={ICON}
          height={ICON}
          alt=""
          loading="lazy"
          decoding="async"
          {...stylex.props(styles.icon, theme === 'light' ? styles.lightOnly : styles.darkOnly)}
        />
      ))}
    </span>
  )
}

function Groups({ groups, id, offset, layout }: { groups: Group[]; id: string; offset: number; layout: StackLayout }) {
  return groups.map((group, i) => {
    const index = offset + i
    return (
      <div key={group.label} {...stylex.props(layout === 'grid' && styles.row)}>
        <h3 id={`${id}-${index}`} {...stylex.props(styles.groupLabel, layout === 'list' && styles.groupLabelRule)}>
          {group.label}
        </h3>
        <ul
          role="list"
          aria-labelledby={`${id}-${index}`}
          {...stylex.props(layout === 'grid' ? styles.chips : styles.items)}
        >
          {group.items.map((item) => (
            <li key={item.name} {...stylex.props(layout === 'grid' ? styles.chip : styles.item)}>
              <StackTile name={item.name} />
              {layout === 'grid' ? (
                <span {...stylex.props(styles.chipName)}>{item.name}</span>
              ) : (
                <span {...stylex.props(styles.text)}>
                  <span {...stylex.props(styles.name)}>{item.name}</span>
                  <span {...stylex.props(styles.note)}>{item.note}</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    )
  })
}

/** The full stack under a few headings, each item with a small icon and its name, and what it does on request. */
export function StackList({ groups, layout = stackLayout }: Props) {
  const id = useId()
  const shown = layout === 'list' ? groups.slice(0, 2) : groups
  const rest = layout === 'list' ? groups.slice(2) : []
  const restCount = rest.reduce((sum, group) => sum + group.items.length, 0)
  return (
    <section aria-labelledby={`${id}-title`} data-stack={layout} {...stylex.props(styles.section)}>
      <h2 id={`${id}-title`} {...stylex.props(styles.title)}>
        Stack
      </h2>
      <div {...stylex.props(layout === 'grid' ? styles.rows : styles.groups)}>
        <Groups groups={shown} id={id} offset={0} layout={layout} />
        {rest.length > 0 ? (
          <details data-stack-more="" {...stylex.props(styles.more)}>
            <summary {...stylex.props(styles.summary, ui.focusRing)}>
              Show all {groups.reduce((sum, group) => sum + group.items.length, 0)} ({restCount} more)
            </summary>
            <div {...stylex.props(styles.groups, styles.moreBody)}>
              <Groups groups={rest} id={id} offset={shown.length} layout={layout} />
            </div>
          </details>
        ) : null}
      </div>
      {layout === 'grid' ? (
        <details data-stack-notes="" {...stylex.props(styles.notes)}>
          <summary {...stylex.props(styles.summary, ui.focusRing)}>What each one does</summary>
          <dl {...stylex.props(styles.noteList)}>
            {groups.flatMap((group) =>
              group.items.map((item) => (
                <div key={item.name} {...stylex.props(styles.noteRow)}>
                  <dt {...stylex.props(styles.noteTerm)}>{item.name}</dt>
                  <dd {...stylex.props(styles.note)}>{item.note}</dd>
                </div>
              )),
            )}
          </dl>
        </details>
      ) : null}
    </section>
  )
}

const styles = stylex.create({
  section: {
    paddingTop: '1.25rem',
    paddingBottom: '1.5rem',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.line,
  },
  title: {
    fontSize: type.meta,
    fontWeight: weights.regular,
    lineHeight: 1.4,
    color: colors.muted,
  },
  // Grid layout: one line per group, the label on the left and the chips after it.
  rows: { display: 'grid', rowGap: { default: '0.75rem', [breakpoints.phone]: '1rem' }, marginTop: '0.85rem' },
  row: {
    display: 'grid',
    gridTemplateColumns: { default: '9.5rem minmax(0, 1fr)', [breakpoints.phone]: 'minmax(0, 1fr)' },
    alignItems: { default: 'center', [breakpoints.phone]: 'start' },
    columnGap: '1rem',
    rowGap: '0.5rem',
  },
  chips: {
    listStyle: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: '1.25rem',
    rowGap: '0.5rem',
  },
  chip: { display: 'inline-flex', alignItems: 'center', columnGap: '0.6rem', minWidth: 0 },
  chipName: { fontSize: type.meta, lineHeight: 1.35, color: colors.text },
  // List layout: two columns of groups, each item with its note.
  groups: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [breakpoints.phone]: 'minmax(0, 1fr)' },
    columnGap: '2rem',
    rowGap: { default: '1.75rem', [breakpoints.phone]: '1.5rem' },
    marginTop: '1rem',
  },
  groupLabel: {
    fontSize: type.meta,
    fontWeight: weights.medium,
    lineHeight: 1.4,
    color: colors.text,
  },
  groupLabelRule: {
    paddingBottom: '0.6rem',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.line,
  },
  items: { listStyle: 'none', display: 'grid', rowGap: '0.75rem', marginTop: '0.85rem' },
  item: {
    display: 'grid',
    gridTemplateColumns: '2.5rem minmax(0, 1fr)',
    alignItems: 'center',
    columnGap: '0.85rem',
  },
  more: { gridColumnStart: 1, gridColumnEnd: -1 },
  moreBody: { marginTop: '1.25rem' },
  tile: {
    display: 'inline-flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.5rem',
    height: '2.5rem',
    borderRadius: '10px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.line,
    backgroundColor: colors.soft,
  },
  monogram: {
    fontSize: type.meta,
    fontWeight: weights.medium,
    letterSpacing: '0.01em',
    lineHeight: 1,
    color: colors.muted,
  },
  icon: { width: `${ICON}px`, height: `${ICON}px`, objectFit: 'contain' },
  lightOnly: { display: colors.sunDisplay },
  darkOnly: { display: colors.moonDisplay },
  text: { display: 'grid', minWidth: 0 },
  name: { fontSize: type.body, lineHeight: 1.35, color: colors.text },
  note: { fontSize: type.meta, lineHeight: 1.4, color: colors.muted },
  notes: { marginTop: '1rem' },
  summary: {
    display: 'list-item',
    width: 'fit-content',
    cursor: 'pointer',
    fontSize: type.meta,
    lineHeight: 1.4,
    color: colors.muted,
    paddingBlock: '0.25rem',
  },
  noteList: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(2, minmax(0, 1fr))', [breakpoints.phone]: 'minmax(0, 1fr)' },
    columnGap: '2rem',
    rowGap: '0.35rem',
    marginTop: '0.6rem',
  },
  noteRow: { display: 'flex', flexWrap: 'wrap', columnGap: '0.5rem', minWidth: 0 },
  noteTerm: { fontSize: type.meta, lineHeight: 1.4, color: colors.text },
})

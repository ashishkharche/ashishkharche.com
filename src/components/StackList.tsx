import * as stylex from '@stylexjs/stylex'
import { useId } from 'react'
import type { StackEntry } from '~/content/projects'
import { stackIconStyle, stackIcons, type StackIconStyle } from '~/content/stackIcons'
import { breakpoints, colors, type, weights } from '~/styles/tokens.stylex'

interface Props {
  groups: Array<{ label: string; items: StackEntry[] }>
  iconStyle?: StackIconStyle
}

/** Icon size in pixels. Better Auth asks for its mark at 24px or more. */
const ICON = 24

function StackTile({ name, iconStyle }: { name: StackEntry['name']; iconStyle: StackIconStyle }) {
  const icon = stackIcons[name]
  if (icon.kind === 'monogram') {
    return (
      <span aria-hidden="true" data-stack-tile="monogram" {...stylex.props(styles.tile, styles.monogram)}>
        {icon.letters}
      </span>
    )
  }
  const files = icon[iconStyle]
  const same = files.light === files.dark
  return (
    <span data-stack-tile="mark" {...stylex.props(styles.tile)}>
      <img
        src={files.light}
        width={ICON}
        height={ICON}
        alt=""
        loading="lazy"
        decoding="async"
        {...stylex.props(styles.icon, !same && styles.lightOnly)}
      />
      {same ? null : (
        <img
          src={files.dark}
          width={ICON}
          height={ICON}
          alt=""
          loading="lazy"
          decoding="async"
          {...stylex.props(styles.icon, styles.darkOnly)}
        />
      )}
    </span>
  )
}

/** The full stack under a few headings, each item with a small icon, its name and what it does. */
export function StackList({ groups, iconStyle = stackIconStyle }: Props) {
  const id = useId()
  return (
    <section aria-labelledby={`${id}-title`} data-stack="" {...stylex.props(styles.section)}>
      <h2 id={`${id}-title`} {...stylex.props(styles.title)}>
        Stack
      </h2>
      <div {...stylex.props(styles.groups)}>
        {groups.map((group, index) => (
          <div key={group.label}>
            <h3 id={`${id}-${index}`} {...stylex.props(styles.groupLabel)}>
              {group.label}
            </h3>
            <ul role="list" aria-labelledby={`${id}-${index}`} {...stylex.props(styles.items)}>
              {group.items.map((item) => (
                <li key={item.name} {...stylex.props(styles.item)}>
                  <StackTile name={item.name} iconStyle={iconStyle} />
                  <span {...stylex.props(styles.text)}>
                    <span {...stylex.props(styles.name)}>{item.name}</span>
                    <span {...stylex.props(styles.note)}>{item.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

const styles = stylex.create({
  section: {
    paddingTop: '1.25rem',
    paddingBottom: '1.75rem',
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
  tile: {
    display: 'inline-flex',
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
  icon: { display: 'block', width: `${ICON}px`, height: `${ICON}px`, objectFit: 'contain' },
  lightOnly: { display: colors.sunDisplay },
  darkOnly: { display: colors.moonDisplay },
  text: { display: 'grid', minWidth: 0 },
  name: { fontSize: type.body, lineHeight: 1.35, color: colors.text },
  note: { fontSize: type.meta, lineHeight: 1.4, color: colors.muted },
})

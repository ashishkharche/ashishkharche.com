import * as stylex from '@stylexjs/stylex'
import type { StackItem } from '~/content/projects'
import { stackIcons } from '~/content/stackIcons'
import { colors, type } from '~/styles/tokens.stylex'

/** Icon size in pixels. Better Auth asks for its mark at 24px or more. */
const ICON = 24

/**
 * One item of a stack, the same everywhere: the tool's real mark (where the repo has one; see
 * public/assets/stack/SOURCES.md) and its name, kept together on one line. Items without a published mark are the
 * name alone. One chip line is 24px tall, the same as the 16px text beside it, so a row label lines up with the first
 * chip.
 */
export function StackChip({ name }: { name: StackItem }) {
  const icon = stackIcons[name]
  return (
    <span data-stack-chip={icon.kind} {...stylex.props(styles.chip)}>
      {icon.kind === 'mark'
        ? (['light', 'dark'] as const).map((theme) => (
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
          ))
        : null}
      <span {...stylex.props(styles.name)}>{name}</span>
    </span>
  )
}

const styles = stylex.create({
  // A block-level flex row, so an item with a mark and one without sit on exactly the same line.
  chip: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '0.5rem',
    whiteSpace: 'nowrap',
    height: '1.5rem',
  },
  icon: { flexShrink: 0, width: `${ICON}px`, height: `${ICON}px`, objectFit: 'contain' },
  lightOnly: { display: colors.sunDisplay },
  darkOnly: { display: colors.moonDisplay },
  name: { fontSize: type.meta, lineHeight: '1.5rem', color: colors.text },
})

/** The gaps between chips, shared by every stack list. */
export const chipList = stylex.create({
  list: {
    listStyle: 'none',
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: '1.5rem',
    rowGap: '0.75rem',
    minWidth: 0,
  },
  label: { fontSize: type.meta, lineHeight: '1.5rem', color: colors.muted },
})

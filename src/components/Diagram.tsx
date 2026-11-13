import * as stylex from '@stylexjs/stylex'
import { breakpoints, colors, fonts, layout, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

const TITLE_PLACEHOLDER = '__DIAGRAM_TITLE__'

interface DiagramSource {
  id: string
  svg: string
}

interface Props {
  diagram: DiagramSource
  /** Full text alternative, read out instead of the drawing. */
  title: string
  caption: string
  wide?: boolean
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * A Mermaid diagram rendered to SVG at build time (see plugins/pele.ts).
 * Colours come from the site tokens, so it follows the theme. On small
 * screens it scrolls sideways instead of shrinking the text.
 */
export function Diagram({ diagram, title, caption, wide = false }: Props) {
  // data-scroll opts the drawing into the sideways-scrolling size on small screens (global.css).
  const svg = diagram.svg.replace(TITLE_PLACEHOLDER, escapeHtml(title)).replace('<svg ', '<svg data-scroll="" ')
  return (
    <figure data-wide={wide ? '' : undefined} {...stylex.props(styles.figure, wide && ui.wide)}>
      <div
        tabIndex={0}
        role="group"
        aria-label={`${caption} Scrolls sideways on small screens.`}
        {...stylex.props(styles.box, ui.focusRing)}
      >
        <div {...stylex.props(styles.svg)} dangerouslySetInnerHTML={{ __html: svg }} />
      </div>
      <figcaption {...stylex.props(styles.caption)}>
        {caption} <span {...stylex.props(styles.smallOnly)}>Scroll sideways to see all of it.</span>
      </figcaption>
    </figure>
  )
}

const styles = stylex.create({
  figure: {
    marginBlock: { default: '3.5rem', [breakpoints.phone]: '2.5rem' },
  },
  box: {
    overflowX: 'auto',
    paddingBlock: '0.5rem',
    scrollbarWidth: 'thin',
  },
  // Pele's SVG reads these custom properties for its colours and font.
  svg: {
    '--_bg': colors.bg,
    '--_fg': colors.text,
    '--_m': colors.muted,
    '--_l': colors.muted,
    '--_s': colors.soft,
    '--_a': 'transparent',
    '--_b': colors.inkStrong,
    '--_c': colors.accent,
    '--_r': '6px',
    '--_hw': weights.medium,
    '--_fm': fonts.mono,
    color: colors.text,
    fontFamily: fonts.sans,
    fontSize: '16px',
    lineHeight: 'normal',
    maxWidth: layout.wide,
  },
  caption: {
    marginTop: '0.7rem',
    // Starts at the text column's left edge and keeps its measure, even under a wide drawing.
    maxWidth: layout.column,
    fontSize: type.meta,
    lineHeight: 1.5,
    color: colors.muted,
  },
  smallOnly: {
    display: { default: 'none', [breakpoints.phone]: 'inline' },
  },
})

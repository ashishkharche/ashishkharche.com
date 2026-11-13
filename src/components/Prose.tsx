import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import type { MDXComponents } from 'mdx/types'
import { Children, isValidElement, type ComponentPropsWithoutRef, type ReactElement, type ReactNode } from 'react'
import { CodeBlock } from '~/components/CodeBlock'
import { SketchArrow } from '~/components/SketchArrow'
import { headingId } from '~/lib/headings'
import { breakpoints, colors, fonts, layout, space, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

/** Container for long-form text: case studies, notes and the About page. */
export function Prose({
  children,
  as: Tag = 'div',
  ...rest
}: { children: ReactNode; as?: 'div' | 'article' } & Omit<ComponentPropsWithoutRef<'div'>, 'className' | 'style'>) {
  return (
    <Tag {...rest} {...stylex.props(styles.prose)}>
      {children}
    </Tag>
  )
}

function Anchor({ href = '', children, ...rest }: ComponentPropsWithoutRef<'a'>) {
  if (href.startsWith('/')) {
    return (
      <Link to={href} {...stylex.props(ui.link)}>
        {children}
      </Link>
    )
  }
  return (
    <a href={href} {...rest} {...stylex.props(ui.link)}>
      {children}
    </a>
  )
}

/** Paragraph helpers for MDX, e.g. <Muted>…</Muted>. */
export function Muted({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.block, ui.muted)}>{children}</div>
}

export function Lead({ children }: { children: ReactNode }) {
  return <p {...stylex.props(styles.block, styles.lead)}>{children}</p>
}

/** The plain text of a heading's children, for its id. */
function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement(node)) return textOf((node.props as { children?: ReactNode }).children)
  return ''
}

/**
 * A paragraph that is only an outside link is a pointer to read more, not a heading: it is set at the regular weight
 * with an outward arrow.
 */
function Paragraph({ children }: { children?: ReactNode }) {
  const only = Children.toArray(children)
  const link =
    only.length === 1 && isValidElement(only[0]) ? (only[0] as ReactElement<ComponentPropsWithoutRef<'a'>>) : null
  if (link?.props.href && /^https?:/.test(link.props.href)) {
    return (
      <p {...stylex.props(styles.block)}>
        <a href={link.props.href} {...stylex.props(ui.link, ui.plainLink, styles.readMore)}>
          {link.props.children} <SketchArrow dir="out" />
        </a>
      </p>
    )
  }
  return <p {...stylex.props(styles.block)}>{children}</p>
}

export const mdxComponents: MDXComponents = {
  a: Anchor,
  p: Paragraph,
  h2: ({ children }) => (
    <h2 id={headingId(textOf(children))} {...stylex.props(ui.h2, styles.h2)}>
      {children}
    </h2>
  ),
  h3: ({ children }) => <h3 {...stylex.props(ui.h3, styles.h3)}>{children}</h3>,
  ul: ({ children }) => <ul {...stylex.props(styles.block, styles.list)}>{children}</ul>,
  ol: ({ children }) => <ol {...stylex.props(styles.block, styles.list)}>{children}</ol>,
  li: ({ children }) => <li {...stylex.props(styles.item)}>{children}</li>,
  // The site uses two weights, so bold text is the medium weight, not the browser's 700.
  strong: ({ children }) => <strong {...stylex.props(styles.strong)}>{children}</strong>,
  // Inline `code` gets the chip style. Code inside a fenced block is marked by Shiki and left plain.
  code: ({ children, ...rest }: ComponentPropsWithoutRef<'code'> & { 'data-language'?: string }) =>
    rest['data-language'] ? <code>{children}</code> : <code {...stylex.props(styles.code)}>{children}</code>,
  pre: CodeBlock,
}

const styles = stylex.create({
  // Long words and URLs wrap instead of pushing the page wider on phones.
  prose: { overflowWrap: 'break-word' },
  block: {
    marginTop: { default: space.s24, ':first-child': 0 },
    maxWidth: layout.column,
    textWrap: 'pretty',
  },
  lead: { fontSize: type.lead, lineHeight: 1.6667 },
  strong: { fontWeight: weights.medium },
  readMore: { color: colors.text },
  // Each part of a note starts on a pen line: 96 above the heading with the line halfway, 24 below it.
  h2: {
    position: 'relative',
    maxWidth: layout.column,
    marginTop: { default: space.s48, ':first-child': 0, [breakpoints.phone]: space.s24 },
    paddingTop: { default: space.s48, [breakpoints.phone]: space.s24 },
    scrollMarginTop: space.s24,
    '::before': {
      content: '""',
      position: 'absolute',
      top: '-8px',
      // On wide screens the rail holds the contents list, so the line starts at the text; below 1100px it comes in
      // from the line down the page.
      left: {
        default: 0,
        [breakpoints.tablet]: `calc(-1 * ${layout.spineGap})`,
        [breakpoints.phone]: `calc(-1 * ${layout.spineGapPhone})`,
      },
      right: 0,
      height: '16px',
      backgroundColor: colors.ink,
      maskImage: 'url("/assets/img/scene/line-h1.svg")',
      maskRepeat: 'no-repeat',
      maskSize: '100% 100%',
      pointerEvents: 'none',
    },
  },
  h3: { maxWidth: layout.column, marginTop: { default: space.s48, ':first-child': 0 } },
  list: { paddingLeft: '1.25rem' },
  item: {
    marginTop: { default: '0.45rem', ':first-child': 0 },
    '::marker': { color: colors.muted },
  },
  code: {
    fontFamily: fonts.mono,
    fontSize: '1rem',
    // A drawn outline round the code, no fill behind it.
    position: 'relative',
    '::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: colors.ink,
      borderRadius: '4px',
      filter: 'url(#sk-pen)',
      pointerEvents: 'none',
    },
    overflowWrap: 'break-word',
    paddingBlock: '0.05em',
    paddingInline: '0.35em',
    borderRadius: '5px',
  },
})

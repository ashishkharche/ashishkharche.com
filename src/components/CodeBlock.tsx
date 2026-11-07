import * as stylex from '@stylexjs/stylex'
import { useRef, useState, useSyncExternalStore } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import { breakpoints, colors, fonts } from '~/styles/tokens.stylex'
import { sk } from '~/styles/sketch'
import { ui } from '~/styles/ui'

const languageNames: Record<string, string> = {
  python: 'Python',
  json: 'JSON',
  swift: 'Swift',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  tsx: 'TSX',
  shell: 'Shell',
  sh: 'Shell',
  text: 'Text',
}

const noop = () => () => {}

/** True once the page has hydrated and the clipboard can be written to. */
function useCanCopy(): boolean {
  return useSyncExternalStore(
    noop,
    () => typeof navigator !== 'undefined' && !!navigator.clipboard,
    () => false,
  )
}

type PreProps = ComponentPropsWithoutRef<'pre'> & { 'data-language'?: string }

/**
 * A fenced code block from MDX, already highlighted by Shiki at build time.
 * Shows the language and, once JavaScript has loaded, a copy button.
 */
export function CodeBlock({ children, 'data-language': language = 'text' }: PreProps) {
  const pre = useRef<HTMLPreElement>(null)
  const canCopy = useCanCopy()
  const [copied, setCopied] = useState(false)
  const label = languageNames[language] ?? language
  // `code` is the hook for the token colours in global.css.
  const preClass = stylex.props(ui.focusRing, styles.pre)

  async function copy() {
    const text = pre.current?.textContent ?? ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard access was refused; the code can still be selected by hand.
      setCopied(false)
    }
  }

  return (
    <div {...stylex.props(sk.box, styles.block)}>
      <div {...stylex.props(styles.bar)}>
        <span {...stylex.props(styles.language)}>{label}</span>
        {canCopy ? (
          <button type="button" onClick={copy} {...stylex.props(styles.copy, ui.focusRing)}>
            <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
            <span {...stylex.props(ui.visuallyHidden)}> {label} code</span>
          </button>
        ) : null}
      </div>
      <pre
        ref={pre}
        tabIndex={0}
        aria-label={`${label} code`}
        data-language={language}
        className={['code', preClass.className].filter(Boolean).join(' ')}
      >
        {children}
      </pre>
    </div>
  )
}

const styles = stylex.create({
  block: {
    marginTop: { default: '1.5rem', ':first-child': 0 },
    marginBottom: '1.5rem',
    // On wider screens the box reaches past the text column, so the code lines up with the text.
    marginInline: { default: null, [breakpoints.desktop]: '-1rem' },
    // A drawn box on the paper (sk.box): no fill behind the code.
  },
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '2.25rem',
    paddingInline: '1rem',
    position: 'relative',
    '::after': {
      content: '""',
      position: 'absolute',
      left: '0.5rem',
      right: '0.5rem',
      bottom: '-5px',
      height: '10px',
      borderTopWidth: '1.5px',
      borderTopStyle: 'dashed',
      borderTopColor: colors.ink,
      filter: 'url(#sk-pen-2)',
      pointerEvents: 'none',
    },
    fontSize: '1rem',
    color: colors.muted,
  },
  language: { fontWeight: 400, letterSpacing: '0.01em' },
  copy: {
    appearance: 'none',
    marginRight: '-0.5rem',
    paddingBlock: '0.3rem',
    paddingInline: '0.5rem',
    borderWidth: 0,
    borderRadius: '6px',
    backgroundColor: 'transparent',
    color: { default: colors.muted, ':hover': colors.text },
    font: 'inherit',
    cursor: 'pointer',
  },
  pre: {
    overflowX: 'auto',
    paddingBlock: '0.9rem',
    paddingInline: '1rem',
    fontFamily: fonts.mono,
    fontSize: '1rem',
    lineHeight: 1.6,
    color: colors.text,
    tabSize: 4,
    outlineOffset: { default: null, ':focus-visible': '-2px' },
  },
})

import { Toggle } from '@base-ui/react/toggle'
import * as stylex from '@stylexjs/stylex'
import { useSyncExternalStore } from 'react'
import { currentTheme, setTheme, subscribeTheme, type Theme } from '~/lib/theme'
import { colors } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

// The server does not know the visitor's theme. Rendering "unknown" first keeps
// hydration consistent; the real value is read straight after.
const getServerSnapshot = (): Theme | null => null

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, getServerSnapshot)
  const isDark = theme === 'dark'

  return (
    <Toggle
      pressed={isDark}
      onPressedChange={(pressed) => setTheme(pressed ? 'dark' : 'light')}
      aria-label="Dark theme"
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      {...stylex.props(styles.button, ui.focusRing)}
    >
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" {...stylex.props(styles.sun)}>
        <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
        </g>
      </svg>
      <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" {...stylex.props(styles.moon)}>
        <path
          d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    </Toggle>
  )
}

const styles = stylex.create({
  button: {
    display: 'grid',
    placeItems: 'center',
    flex: 'none',
    width: '36px',
    height: '36px',
    padding: 0,
    borderWidth: 0,
    borderRadius: '50%',
    backgroundColor: 'transparent',
    color: { default: colors.muted, ':hover': colors.text },
    cursor: 'pointer',
  },
  sun: { display: colors.sunDisplay },
  moon: { display: colors.moonDisplay },
})

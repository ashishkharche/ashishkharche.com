import * as stylex from '@stylexjs/stylex'

/**
 * The pen. Every rule and outline on the site is an ordinary CSS line passed
 * through one of these filters, which bends it a little along its length so it
 * reads as drawn by hand, in the same way as the line art in the footer. The
 * noise is fixed (a set seed and no animation), so a line looks the same on
 * every visit and nothing moves.
 */
export function SketchDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" {...stylex.props(styles.defs)}>
      <defs>
        <filter id="sk-pen" x="-5%" y="-25%" width="110%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          {/* The displaced line lands on whole pixels; a touch of blur smooths the steps back into a pen line. */}
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
        <filter id="sk-pen-2" x="-5%" y="-25%" width="110%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="11" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="G" yChannelSelector="R" />
          <feGaussianBlur stdDeviation="0.35" />
        </filter>
      </defs>
    </svg>
  )
}

const styles = stylex.create({
  defs: { position: 'absolute', width: 0, height: 0, overflow: 'hidden' },
})

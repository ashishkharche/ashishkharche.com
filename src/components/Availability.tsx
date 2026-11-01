import * as stylex from '@stylexjs/stylex'
import { links, site } from '~/content/site'
import { ui } from '~/styles/ui'

/** Short contact note with the phone-free role CV downloads. Used on the home, work and about pages. */
export function Availability({ email = true }: { email?: boolean }) {
  return (
    <div {...stylex.props(styles.box)}>
      <p>
        <strong {...stylex.props(styles.strong)}>Based in London.</strong> The best way to reach me is{' '}
        {email ? (
          <>
            email:{' '}
            <a href={`mailto:${site.email}`} {...stylex.props(ui.link)}>
              {site.email}
            </a>
          </>
        ) : (
          <a href={`mailto:${site.email}`} {...stylex.props(ui.link)}>
            email
          </a>
        )}
        .
      </p>
      <p {...stylex.props(ui.mt06)}>
        CVs (PDF):{' '}
        {links.roleCvs.map((cv, index) => (
          <span key={cv.href}>
            {index > 0 ? ' · ' : null}
            <a href={cv.href} type="application/pdf" {...stylex.props(ui.link)}>
              {cv.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  )
}

const styles = stylex.create({
  // No border: the note sits on the page background like the text around it.
  box: { marginTop: '1.5rem' },
  strong: { fontWeight: 600 },
})

import * as stylex from '@stylexjs/stylex'
import { links, site } from '~/content/site'
import { weights } from '~/styles/tokens.stylex'
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
      <p {...stylex.props(ui.mt06)}>CVs (PDF):</p>
      <ul role="list" aria-label="CV downloads" {...stylex.props(styles.downloads)}>
        {links.roleCvs.map((cv) => (
          <li key={cv.href}>
            <a href={cv.href} type="application/pdf" {...stylex.props(ui.link, ui.plainLink, styles.download)}>
              {cv.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

const styles = stylex.create({
  // No border: the note sits on the page background like the text around it.
  downloads: {
    listStyle: 'none',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    columnGap: '2rem',
    marginTop: '0.5rem',
  },
  download: { display: 'inline-flex', minHeight: '2.75rem', alignItems: 'center' },
  box: { marginTop: '1.5rem' },
  strong: { fontWeight: weights.medium },
})

import * as stylex from '@stylexjs/stylex'
import { Link } from '@tanstack/react-router'
import { fonts, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'
import { Main } from './Main'

export function NotFound() {
  return (
    <Main>
      {/* Rendered here rather than in a route head() so unknown URLs get them too; React puts them in <head>. */}
      <title>Page not found · Ashish Kharche</title>
      <meta name="robots" content="noindex" />
      <meta name="description" content="Page not found." />
      <div {...stylex.props(ui.column)}>
        <h1 {...stylex.props(styles.title)}>Page not found.</h1>
        <p {...stylex.props(ui.mt1)}>
          <Link to="/" {...stylex.props(ui.link)}>
            Back to the homepage
          </Link>
        </p>
      </div>
    </Main>
  )
}

const styles = stylex.create({
  title: { fontFamily: fonts.serif, fontSize: type.title, fontWeight: weights.regular, lineHeight: 1.15 },
})

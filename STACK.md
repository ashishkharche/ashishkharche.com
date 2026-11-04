# Stack

Checked against the official docs and npm on 30 October 2026.

## Decision

| Part              | Choice                                                                                                                        | Version                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Framework         | TanStack Start (React), static prerendering, no server at runtime                                                             | `@tanstack/react-start` 1.169                                  |
| Routing           | TanStack Router, file-based routes in `src/routes`, trailing slashes                                                          | `@tanstack/react-router` 1.170                                 |
| Build             | Vite 8 (Rolldown)                                                                                                             | `vite` 8.3                                                     |
| UI                | React 19                                                                                                                      | `react` 19.3                                                   |
| Styling           | StyleX, compiled to one static CSS file                                                                                       | `@stylexjs/stylex` 0.19, `@stylexjs/unplugin` 0.19             |
| Interactive parts | Base UI (theme toggle)                                                                                                        | `@base-ui/react` 1.9                                           |
| Long-form content | MDX files in `content/`, with YAML frontmatter for notes                                                                      | `@mdx-js/rollup` 3.1                                           |
| Diagrams          | Mermaid sources rendered to SVG at build time with Pele                                                                       | `pele` 1.12                                                    |
| Code highlighting | Shiki through `@shikijs/rehype`, at build time, tokens written as classes                                                     | `shiki` 4.5, `@shikijs/rehype` 4.5                             |
| Fonts             | Geist for body text, Geist Serif for headings, Geist Mono for code; self-hosted Latin subsets                                 | `geist` 1.9 font files                                         |
| Language          | TypeScript, strict (`strict`, `noUncheckedIndexedAccess`)                                                                     | TypeScript 7 for `tsc`, TypeScript 6 API for typescript-eslint |
| Package manager   | pnpm                                                                                                                          | 10.34                                                          |
| Checks            | ESLint (typescript-eslint, StyleX, jsx-a11y, React Hooks), Prettier, Vitest, Playwright with axe-core, linkinator, Lighthouse |                                                                |

The default plan (TanStack Start + StyleX + Base UI + MDX + Pele + pnpm) held up. Nothing had to be swapped out.

## Why each piece

**TanStack Start.** 1.0 was announced stable on 13 October 2026 (React Start 1.169.0 changelog: "TanStack Start is stable"). It has a
first-party static prerendering mode: every route is rendered to HTML at build time (`prerender.enabled`, `crawlLinks`,
`autoSubfolderIndex`), so `/work/` becomes `work/index.html` and every page works with JavaScript turned off. After the page loads,
React hydrates and links navigate on the client, with route code split per page. Its hosting guide sends Vercel users through Nitro for
server rendering; this site does not need a server, so it skips Nitro and ships only `dist/client` as static files.

**StyleX.** Styles are written next to components, type-checked, and compiled at build time into atomic classes in a single CSS file.
That keeps the strict `style-src 'self'` policy: no runtime style injection and no inline `style` attributes. Integration is through
`@stylexjs/unplugin`, the official Vite plugin, placed before the TanStack Start plugin, with `runtimeInjection: false` and CSS layers.
Colours are `defineVars` tokens whose defaults follow `prefers-color-scheme`; the light and dark themes from the toggle are
`createTheme` classes put on `<html>`. Hover effects that depend on a parent (the project cards) use `stylex.when.ancestor`.
One thing StyleX does not cover is markup produced by other tools: Pele's SVG is sized by a few lines in `src/styles/global.css`, next
to the `@font-face` rules and a small reset (in a CSS layer that sits before StyleX's layers).

**Base UI.** Stable since v1.0.0 (11 December 2025). The package is now `@base-ui/react` (renamed from `@base-ui-components/react`);
the current release is 1.9.0 (9 October 2026). It is used for the theme toggle (`Toggle`, which gives a real button with
`aria-pressed`). The main navigation is four plain links in a `<nav>`, which is the most accessible option and needs no JavaScript, so
it does not use Base UI's `NavigationMenu`. There is no dialog or tooltip on the site; if one is added, it should come from Base UI.

**MDX.** The case study and notes are MDX in `content/`, so the prose reads like Markdown while still using components for diagrams,
screenshot rows and the gallery. A small Vite plugin (`plugins/content.ts`) lets list pages import only a note's frontmatter
(`note.mdx?frontmatter`), so the notes index does not ship note bodies.

**Fonts.** Body text is Geist, headings are Geist Serif and code is Geist Mono, all from the `geist` 1.9 package and under the
SIL Open Font License (the licence is in `public/assets/fonts/Geist-OFL.txt`). Each is cut down to a Latin subset and served from
`public/assets/fonts` (no font CDN, so `font-src 'self'` holds). Geist and Geist Mono keep their weight axis from 400 to 700; Geist Serif
has one weight, so headings set in it use 400. Geist and Geist Serif are preloaded because both are above the fold on every page. Local
fallback faces scaled to Geist's metrics (`size-adjust` and the ascent and descent overrides in `src/styles/global.css`) keep the swap
from moving text.

**Pele.** The same plugin turns `import diagram from './x.mmd'` into a build-time Pele render. The output is cleaned the same way as on
the previous site (root `style` removed, `rx` attributes instead of inline styles, `role="img"` and a `<title>`), and its colours come
from the StyleX tokens, so diagrams follow light and dark mode. The SVG markup is byte-for-byte the same as the old site's.

**Shiki.** Fenced code blocks in MDX are highlighted at build time by Shiki (`@shikijs/rehype`, added as a rehype plugin to
the MDX compiler), so no highlighter ships to the browser. It uses the same TextMate grammars as VS Code, which gives accurate
Python, Swift and JSON. Shiki normally writes inline `style` attributes on every token, which the `style-src 'self'` policy would
block, so `plugins/highlight.ts` uses a CSS variables theme and turns each token's style into a class (`tok-keyword`,
`tok-string`, ...). The colours for those classes are in `src/styles/global.css`, with light and dark values. Each block shows its
language and, once the page has hydrated, a small copy button. Pele only renders Mermaid diagrams, so it has no part in this.

## Compromises

- **Client JavaScript.** The previous site had a few lines of JS. This one hydrates React and the router: about 110 KB compressed on
  first load (React DOM is most of it), plus a small chunk per page. Pages are fully rendered HTML before any of it runs, so it does
  not block the first paint; Lighthouse is 100 on mobile and desktop for every page.
- **Content-Security-Policy.** TanStack Start writes small inline scripts into each page (router state and scroll restoration) whose
  contents change with every build. The post-build step hashes the inline scripts on each page and adds a per-page
  `<meta http-equiv="Content-Security-Policy">` with exactly those hashes. `frame-ancestors` cannot be set from a meta tag, so
  `vercel.json` still sends a header with `frame-ancestors 'none'`, `object-src 'none'` and `base-uri 'self'`. Styles are
  `style-src 'self'` plus the hash of the page's one inline `<style>` (its critical CSS, below); never `'unsafe-inline'`, so
  `style` attributes stay blocked.
- **Slow connections (src/lib/critical.ts).** The post-build step inlines, per page, the rules of the StyleX stylesheet that can
  match that page (a superset: every rule whose classes all appear in the HTML) in place of the render-blocking `<link>`. The
  entry module, its module preloads and the whole stylesheet are then requested by a small inline loader once the first paint has
  been reported, so on a slow connection they do not compete with the HTML, fonts and hero images. React finds the stylesheet and
  the entry script already in the document when it hydrates. The `@font-face` rules live only in the inline CSS (the stylesheet's
  copies are removed, so the fonts are not fetched and swapped twice), and the font preloads come first in `<head>`.
- **Diagram SVG in JavaScript too.** A hydrated page has to be able to render itself, so the case study's diagrams are also in that
  page's JS chunk (about 8 KB compressed for the case study page).
- **`head()` keeps one meta tag per name.** The two `theme-color` tags (light and dark) are written directly in the root document.

## Sources

- TanStack Start 1.0 announcement: https://tanstack.com/blog/tanstack-start-1-0
- React Start changelog (1.169.0, "TanStack Start is stable"): https://github.com/TanStack/router/blob/main/packages/react-start/CHANGELOG.md
- Static prerendering: https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering
- SPA mode (not used, but explains the shell and rewrites): https://tanstack.com/start/latest/docs/framework/react/guide/spa-mode
- Hosting, including Vercel: https://tanstack.com/start/latest/docs/framework/react/guide/hosting
- CSS in Start: https://tanstack.com/start/latest/docs/framework/react/guide/css-styling
- Official static example: https://github.com/TanStack/router/tree/main/examples/react/start-basic-static
- StyleX with Vite: https://stylexjs.com/docs/learn/installation/vite
- StyleX Vite + React: https://stylexjs.com/docs/learn/installation/vite/vite-react
- `@stylexjs/unplugin` options: https://stylexjs.com/docs/api/configuration/unplugin/
- Base UI v1.0.0 (stable, package rename): https://base-ui.com/react/overview/releases/v1-0-0
- Base UI releases (v1.9.0): https://base-ui.com/react/overview/releases
- `@base-ui/react` on npm: https://www.npmjs.com/package/@base-ui/react
- Pele: https://pele.run and https://github.com/obsidianmd/pele
- Shiki rehype plugin: https://shiki.style/packages/rehype
- Shiki CSS variables theme: https://shiki.style/guide/theme-colors
- MDX with Rollup and Vite: https://mdxjs.com/packages/rollup/

# ashishkharche.com

The personal site and portfolio of Ashish Kharche, a software engineer in London.

Live at [ashishkharche.com](https://ashishkharche.com).

## What's here

- **Home**: a short introduction, selected work, recent notes and contact links.
- **Work**: roles and dates, published writing, tools, and the CV.
- **Projects**: case studies, starting with Workout Director.
- **Notes**: longer technical write-ups with diagrams and code samples.
- **About**: background.
- **CV**: downloadable PDFs (general and iOS), linked from the Home, Work and About pages.

Every page is prerendered to static HTML and works with JavaScript turned off.

## Stack

| Part        | Choice                                                                 |
| ----------- | ---------------------------------------------------------------------- |
| Framework   | TanStack Start 1.169 with TanStack Router 1.170, React 19              |
| Build       | Vite 8, static prerendering (no server at runtime)                     |
| Language    | TypeScript (strict)                                                    |
| Styling     | StyleX 0.19, compiled to a single static CSS file                      |
| UI          | Base UI 1.9 (theme toggle)                                             |
| Content     | MDX with YAML frontmatter                                              |
| Diagrams    | Mermaid sources rendered to SVG at build time with Pele 1.12           |
| Code blocks | Shiki 4.5, highlighted at build time                                   |
| Fonts       | Geist, Geist Serif (headings), Geist Mono (code); self-hosted, SIL OFL |
| Checks      | ESLint, Prettier, Vitest, Playwright with axe-core, linkinator         |
| Hosting     | Vercel, as static files                                                |

A strict Content Security Policy is applied: no inline styles, and each page gets a policy with the hashes of its own inline
scripts. See [STACK.md](STACK.md) for the reasoning behind each choice.

## Running locally

Requires Node 22.18 or newer and pnpm 10.

```sh
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # static site in dist/client
pnpm preview    # serves dist/client on http://localhost:4173
```

## Tests and checks

```sh
pnpm check          # runs typecheck, lint, format:check, test, build, test:e2e and check:links in order
pnpm typecheck      # tsc --noEmit
pnpm lint           # ESLint
pnpm format:check   # Prettier
pnpm test           # Vitest unit tests
pnpm test:e2e       # Playwright: every page, no-JS, theme and axe checks in light and dark (needs a build)
pnpm check:links    # crawls the build and checks every link and image
pnpm lighthouse     # mobile and desktop scores for every page
```

Playwright, Lighthouse and the screenshot script use the installed Chrome. To use Playwright's own browser instead, run
`pnpm exec playwright install chromium` and set `PW_CHANNEL=chromium`.

The build also runs its own checks (`scripts/postbuild.ts`). It fails if a page has an inline style, a page in the sitemap
was not prerendered, a link preview image is missing or the wrong size, or a CV PDF in the output differs from the one in
`public/`. Content rules in `src/content/rules.ts` are checked against the source by `tests/unit/content-rules.test.ts` and
again against the built HTML.

Other scripts: `pnpm screenshots` (full-page screenshots at three widths in light and dark, with `pnpm preview` running) and
`pnpm og-images` (redraws the link preview cards in `public/assets/og`). `pnpm wd-screens <folder>` makes the AVIF and WebP copies of the
Workout Director App Store screens in `public/assets/img/wd`; which screens are shown is set in
`src/content/workoutDirectorScreens.ts`.

## Chart builder (/lab/charts/)

A page for making dark charts to post on X, linked from Projects. It runs in the browser: the chart is drawn
on a canvas (PNG at 1x or 2x) or into an SVG, with Inter served from `public/lab/charts/fonts/`.

Kinds: headline number, ranked list, head to head, rank over time and iOS vs Android (live), plus scatter (data files).

- `src/lib/charts/tdn.ts`: the live data client. Every request goes to the same-origin proxy,
  `GET /api/tdn?endpoint=<name>&<params>`, once per page load. Icons load only from the hosts in `ICON_HOST`, which
  must match `chartIconHosts` in `src/lib/csp.ts` (img-src on /lab/charts/ only).
- `src/lib/charts/live.ts`: the live templates (the question, the requests, at most 5 per template, and a pure mapper
  from the API answers to a chart model) and their rules (`validateLive`): the data time is on the chart, three footnote
  lines of at most 110 characters, and every number shown is in the answers. If the proxy fails, no chart is shown.
- `src/lib/charts/kinds.ts`: draws the live kinds with the same header and footnote as the scatter charts.
- Tests answer the proxy from `tests/fixtures/tdn/responses.json`, shaped like the public API reference. The numbers in
  it are test values.

- `src/lib/charts/config.ts`: the chart config types and the data rules (`validate`). A chart that breaks a rule is
  not drawn and cannot be downloaded: ranks need their coverage, ranks are never averaged over charted countries only,
  any stand-in rank for unranked countries is stated, stale rows are marked, on-chart caveats stay visible, there is
  no brand mark or site name, and the footnote is three lines starting with "Source:".
- `src/lib/charts/render.ts` and `svg.ts`: the renderer (a port of the matplotlib layout) and an SVG back end.
- `src/lib/charts/data.ts`: the data adapter. `createLocalSource` reads the templates in `public/lab/charts/data/`.
- `src/lib/charts/spec.ts`: output sizes and the X pages they come from.
- Templates are copied from a local chart folder with
  `node scripts/lab-charts-data.ts <chart folder> "<source name>"`. The script drops page links and ids, replaces the
  source name with `{source}`, and fails if the output has a banned term.

`api/tdn.ts` is the read-only proxy for the live data (see DEPLOY.md). It is deployed with the static files.

## Deployment

The site is hosted on Vercel as plain static files from `dist/client`. Vercel can build it from this repository using the
settings in `vercel.json`, or a local build can be uploaded as it is, with no build step on Vercel. [DEPLOY.md](DEPLOY.md) has the details and a
post-deploy checklist.

## Project structure

```
content/
  diagrams/      Mermaid diagram sources (.mmd)
  notes/         notes in MDX, one file each
  projects/      case study text in MDX
plugins/         Vite plugins for content imports and Shiki highlighting
public/          favicons, fonts, images, CV PDFs, link preview images
scripts/         post-build checks, local server, link check, Lighthouse, screenshots
src/
  routes/        one file per page
  components/    header, footer, cards, figures, prose
  content/       site data: links, work history, projects, notes, content rules
  lib/           SEO tags, URLs, dates, sitemap, CSP
  styles/        StyleX tokens and global CSS
tests/
  unit/          Vitest
  e2e/           Playwright
```

## Adding a note

1. Create `content/notes/<slug>.mdx` with frontmatter: `title`, `date` (YYYY-MM-DD), `series`, `part`, `listLabel` and
   `description`.
2. Add `/notes/<slug>/` to `sitemapPaths` in `src/content/site.ts`, and remove the title from `comingNotes` in
   `src/content/notes.ts` if it is listed there.
3. For a diagram, add a `.mmd` file to `content/diagrams`, import it in the note and use
   `<Diagram diagram={...} title="..." caption="..." />`.
4. For code, use a fenced block with a language tag. The language must be listed in `plugins/highlight.ts`.
5. Add a link preview card in `src/content/ogImages.ts` and `scripts/og-images.ts`, then run `pnpm og-images`. The build fails
   if a page's preview image is missing.

## Usage

There is no licence file. The writing, images and CV are © Ashish Kharche. The code is public so it can be read for reference.

# Deploying

The site builds to plain static files in `dist/client`, plus one Vercel function, `api/tdn.ts` (the chart builder's live
data proxy, see below). Two ways to put it on the Vercel project `ashishkharche` (domain ashishkharche.com):

## Before either option

```sh
pnpm install --frozen-lockfile
pnpm check        # typecheck, lint, format, unit tests, build, Playwright + axe, link check
pnpm lighthouse   # optional; needs Chrome (set CHROME_PATH if it is not found)
```

`pnpm build` runs `vite build` and then `scripts/postbuild.ts`, which:

- writes `dist/client/sitemap.xml`, with each page's `lastmod` taken from its content date or the last git commit that touched its source files (never the build time),
- writes the Atom feed of the notes to `dist/client/feed.xml`,
- adds a per-page Content-Security-Policy meta tag with the hashes of that page's inline scripts,
- copies the headers from `vercel.json` into `dist/client/vercel.json` (without the build settings),
- fails the build if a page has an inline style, a banned word (see `src/content/rules.ts`), or a sitemap page is missing.

Requires Node 22.18 or newer (the scripts are TypeScript run directly by Node) and pnpm 10.

## Option A: static upload (what the current site uses)

Upload the contents of `dist/client` as they are, plus `api/tdn.ts`, with no build step on Vercel.

1. `pnpm build && pnpm deploy:manifest`. This writes `dist/deploy-manifest.json`: every file under `dist/client` with its path,
   SHA-1 and size (about 70 files, 1.7 MB), and `api/tdn.ts` as `api/tdn.ts` at the root of the upload, next to
   `vercel.json`. (`pnpm deploy:manifest --static-only` leaves the function out.)
2. Upload each file through the Vercel REST API (`POST /v2/files`), sending the file's bytes with its SHA-1 in the
   `x-vercel-digest` header and its size as the content length. Files Vercel already has are skipped by digest.
3. Create a deployment through the Vercel REST API (`POST /v13/deployments`) for project `ashishkharche`, scoped to the
   Vercel team that owns it, with:
   - `files`: the manifest entries (`{ "file": "work/index.html", "sha": "…", "size": … }`),
   - `projectSettings`: `{ "framework": null, "buildCommand": "", "installCommand": "", "outputDirectory": null }`.
     The empty build and install commands tell Vercel to skip both steps and serve the files exactly as uploaded. Leaving
     them as `null` makes Vercel fall back to the project's framework setting and run `vite build`, which fails because
     the upload has no source. With the build step skipped, Vercel still builds `api/tdn.ts` as a Node.js function
     (it has no imports, so it needs no `package.json` or install). Do not set `framework`, `rootDirectory` or
     `outputDirectory` to anything else, and do not add a `functions` block: the defaults (Node.js runtime from the
     project's Node.js version, default region and duration) are what it was tested with.
   - `target`: `production` (or leave it out for a preview first).
4. Check the preview URL, including `/api/tdn` (see the checks at the end), then promote or alias it as usual.

`dist/client/vercel.json` is part of the upload and carries the headers (security headers, `frame-ancestors`, long caching for
fonts and hashed JS/CSS) and `"trailingSlash": true`, which redirects `/work` to `/work/`. `404.html` is served for unknown paths.
It is rendered at build time from a path no route matches (see `src/server.ts`), so it hydrates the same way in the
browser on any unknown URL.
`dist/server` is a by-product of the build and is not deployed.

## Option B: Vercel builds from GitHub (`ashishkharche/ashishkharche.com`)

1. Push this folder as the repository root.
2. In Vercel, connect the repository to the `ashishkharche` project. `vercel.json` in the repo sets everything the build needs:
   - Framework preset: none (`"framework": null`)
   - Install: `pnpm install --frozen-lockfile`
   - Build: `pnpm build`
   - Output directory: `dist/client`
   - Node.js: 22.x or 24.x (project setting; 22.18+ is required)
3. Every push to the production branch deploys; pull requests get preview deployments.

The project's settings in the dashboard are not changed by this repository; `vercel.json` overrides them per deployment.

## The chart builder's live data proxy (`api/tdn.ts`)

`api/tdn.ts` is a Vercel function that adds a bearer key to read-only requests to the upstream public API
(`UPSTREAM` in `api/tdn.ts`; its OpenAPI document is `/api/v1/openapi.json` on the same host), so the chart builder can show live
data: `/api/tdn?endpoint=rankings&store=apple&country=us&limit=5`.

- It answers GET and HEAD only (anything else is 405), for a fixed list of endpoints and query parameters. Every value
  is checked (enums, integer ranges, id format, our own country list) and anything else is answered 400 without
  calling upstream, because upstream 400s and 404s still cost units.
- It sets its own `Cache-Control`: `public, s-maxage=3600, stale-while-revalidate=86400` for rankings, app details,
  rank history, exports, compare, charts and movers, and `public, s-maxage=21600, stale-while-revalidate=86400` for
  tech stacks and SDK adoption. Errors are `no-store`, except upstream 404s (`public, s-maxage=600`).
- Only its own headers go back to the browser: the upstream `RateLimit-*`, `Set-Cookie` and cache headers are dropped.
  Upstream 429s pass through with `Retry-After`; upstream 5xx answers become 502 and timeouts (8 s) 504, as
  `{ error, code }` JSON. There are no CORS headers, so only this site can read it from a browser.
- Each instance also stops itself at 50 requests a minute and 900 units a day (the free key allows 60 and 1,000).
- The upstream body is passed through unchanged, so `meta.recordedAt` / `meta.capturedAt` stay in it.
- It needs one environment variable on the project, `TDN_API_KEY` (sensitive, Production and Preview), set by the
  owner in the Vercel dashboard. Without it, it answers 503 `not_configured`. The key is never logged or sent to the
  browser. For local tests, mock `fetch` (see `tests/unit/tdn.test.ts`); do not call the real API with a local key.
- GitHub builds (Option B): Vercel deploys `api/` from the repository root on its own.
- The page's CSP keeps `connect-src 'self'`, which already allows `/api/tdn`. On `/lab/charts/` only, `img-src` also
  allows the App Store and Google Play icon hosts (`chartIconHosts` in `src/lib/csp.ts`).

## After deploying

- Open `/`, `/work/`, `/projects/workout-director/`, `/notes/workout-director-1/` and a made-up URL (should show the 404 page).
- Open `/api/tdn?endpoint=rankings&limit=5` (200, `Cache-Control: public, s-maxage=3600, …`, no `RateLimit-*` headers,
  `meta.recordedAt` in the body) and `/api/tdn?endpoint=nope` (400).
- Check the browser console for Content-Security-Policy errors (there should be none).
- Run Lighthouse against the live URL if anything about images or scripts changed.

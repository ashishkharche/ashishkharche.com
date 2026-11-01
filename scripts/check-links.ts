// Crawls the built site and checks every link and image. Internal links must
// all resolve; external links are checked too unless --internal is passed.
// LinkedIn refuses automated requests (status 999), so it is skipped. Links to
// the site's own address (such as the og:image URLs) are checked against this
// build, so new files are covered before they are deployed.
import { spawn } from 'node:child_process'
import { setTimeout as sleep } from 'node:timers/promises'
import { LinkChecker } from 'linkinator'
import { site } from '../src/content/site.ts'

const port = Number(process.env.LINKS_PORT ?? 4174)
const base = `http://localhost:${port}/`
const internalOnly = process.argv.includes('--internal')

const server = spawn('node', ['scripts/serve.mjs'], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' })
await sleep(800)

try {
  const checker = new LinkChecker()
  const result = await checker.check({
    path: base,
    recurse: true,
    timeout: 15000,
    concurrency: 8,
    retry: true,
    urlRewriteExpressions: [{ pattern: new RegExp(`^${site.url.replace(/[.]/g, '\\.')}/`), replacement: base }],
    linksToSkip: ['^mailto:', 'linkedin\\.com', ...(internalOnly ? ['^https?://(?!localhost)'] : [])],
  })
  const broken = result.links.filter((link) => link.state === 'BROKEN')
  const checked = result.links.filter((link) => link.state === 'OK')
  const internal = checked.filter((link) => link.url.startsWith(base))
  console.log(
    `Checked ${checked.length} links (${internal.length} internal, ${checked.length - internal.length} external).`,
  )
  if (broken.length > 0) {
    for (const link of broken) console.error(`BROKEN ${link.status ?? ''} ${link.url} (on ${link.parent})`)
    process.exitCode = 1
  } else {
    console.log('No broken links.')
  }
} finally {
  server.kill()
}

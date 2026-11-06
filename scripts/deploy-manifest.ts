// Lists every file in dist/client with its SHA-1 and size, in the shape the
// Vercel deployments API expects for a static upload. Writes
// dist/deploy-manifest.json. See DEPLOY.md.
//
// It also lists the chart builder’s Vercel functions (api/tdn.ts for live data,
// api/icon.ts for same-origin app icons), so both ship next to the static files.
// `--static-only` leaves them out.
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { DEPLOY_API_FILES } from './deploy-api-files.ts'

const root = new URL('../dist/client/', import.meta.url).pathname

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])),
  )
  return nested.flat()
}

const files = []
let total = 0
for (const path of (await walk(root)).sort()) {
  const data = await readFile(path)
  total += data.length
  files.push({ file: relative(root, path), sha: createHash('sha1').update(data).digest('hex'), size: data.length })
}
if (!process.argv.includes('--static-only')) {
  for (const file of DEPLOY_API_FILES) {
    const path = new URL(`../${file}`, import.meta.url).pathname
    const data = await readFile(path)
    total += data.length
    files.push({ file, sha: createHash('sha1').update(data).digest('hex'), size: data.length })
  }
}
await writeFile(new URL('../dist/deploy-manifest.json', import.meta.url), `${JSON.stringify(files, null, 2)}\n`)
console.log(`${files.length} files, ${(total / 1024).toFixed(0)} KB, written to dist/deploy-manifest.json`)

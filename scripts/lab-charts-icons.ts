// Bakes the app icons of the build snapshot into the deploy, so visitors never depend on the icon hosts:
//
//   node scripts/lab-charts-icons.ts
//
// Reads public/lab/charts/snapshot.json, finds every allowed icon URL in it (Apple's isN-ssl.mzstatic.com and
// Google's play-lh.googleusercontent.com), downloads each, and writes it as a 256 px WebP to
// public/lab/charts/icons/<first 16 hex of sha1(url)>.webp with public/lab/charts/icons/index.json ({ url: file }).
// Icons that were baked before and still appear are kept if a download fails; icons no longer in the snapshot are
// removed. An icon that cannot be baked is left to the /api/icon/ route on the page.
import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { BAKED_SIZE, type IconManifest } from '../src/lib/charts/icons.ts'
import { iconAllowed } from '../src/lib/charts/tdn.ts'

const root = new URL('../public/lab/charts/', import.meta.url).pathname
const dir = `${root}icons/`
await mkdir(dir, { recursive: true })

const urls = new Set<string>()
const walk = (v: unknown): void => {
  if (typeof v === 'string') {
    if (iconAllowed(v)) urls.add(v)
  } else if (Array.isArray(v)) v.forEach(walk)
  else if (v && typeof v === 'object') Object.values(v).forEach(walk)
}
walk(JSON.parse(await readFile(`${root}snapshot.json`, 'utf8')))

const before: IconManifest = await readFile(`${dir}index.json`, 'utf8')
  .then((t) => JSON.parse(t) as IconManifest)
  .catch(() => ({ savedAt: '', files: {} }))
const fileFor = (url: string) => `${createHash('sha1').update(url).digest('hex').slice(0, 16)}.webp`
const files: Record<string, string> = {}
const failed: string[] = []

async function bake(url: string) {
  const file = fileFor(url)
  for (const wait of [0, 2000, 5000]) {
    if (wait) await new Promise((r) => setTimeout(r, wait))
    try {
      const res = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const input = Buffer.from(await res.arrayBuffer())
      const out = await sharp(input).resize(BAKED_SIZE, BAKED_SIZE, { fit: 'cover' }).webp({ quality: 90 }).toBuffer()
      await writeFile(`${dir}${file}`, out)
      files[url] = file
      return
    } catch {
      // try again
    }
  }
  if (before.files[url] === file) files[url] = file
  else failed.push(url)
}

const list = [...urls].sort()
for (let i = 0; i < list.length; i += 6) await Promise.all(list.slice(i, i + 6).map(bake))

const keep = new Set(Object.values(files))
for (const name of await readdir(dir)) if (name.endsWith('.webp') && !keep.has(name)) await rm(`${dir}${name}`)
const manifest: IconManifest = {
  savedAt: new Date().toISOString(),
  files: Object.fromEntries(Object.entries(files).sort()),
}
await writeFile(`${dir}index.json`, `${JSON.stringify(manifest)}\n`)
console.log(`Baked ${keep.size} of ${list.length} icons into public/lab/charts/icons/`)
if (failed.length) console.warn(`Left to /api/icon/ (download failed): ${failed.length}\n${failed.join('\n')}`)

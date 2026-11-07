// Draws the per-page link preview cards (1200 by 630 PNG) into
// public/assets/og/. Run with `pnpm og-images` after changing a card, and
// commit the images. Uses the installed Chrome, like the screenshot script.
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium } from '@playwright/test'
import { noteOgImages, ogImages } from '../src/content/ogImages.ts'
import { footageCredit, type ScreenId } from '../src/content/workoutDirectorScreens.ts'

const root = new URL('../', import.meta.url).pathname
const publicDir = join(root, 'public')
const asset = (path: string) => `file://${join(publicDir, path)}`

interface Card {
  src: string
  eyebrow: string
  title: string
  subtitle?: string
  footer?: string
  /** Phone screenshots shown on the right, upright. */
  phones?: string[]
  /** Transparent figures shown on the right instead of phones. */
  figures?: string[]
}

const cards: Card[] = [
  {
    src: ogImages.workoutDirector.src,
    eyebrow: 'Case study',
    title: 'Workout Director',
    subtitle: 'An iPhone and iPad training app that counts reps on the device, with a voice coach.',
    footer: 'SwiftUI · TypeScript on AWS Lambda',
    phones: ['/assets/img/wd/iphone/02-voice-800.webp', '/assets/img/wd/iphone/07-progress-800.webp'],
  },
  {
    src: ogImages.projects.src,
    eyebrow: 'Projects',
    title: 'Workout Director and Kalo',
    subtitle: 'Two iPhone apps: a training app that counts reps and a macro tracker.',
    footer: 'ashishkharche.com/projects',
    // One dark Workout Director screen, so the card keeps one tone and the title fits on two lines.
    phones: ['/assets/img/wd/iphone/02-voice-800.webp'],
  },
]

/** The AK lockup paths, read from the header component so there is one source. */
async function lockup(): Promise<string> {
  const source = await readFile(join(root, 'src/components/Brand.tsx'), 'utf8')
  const paths = [...source.matchAll(/<path\s+(?:transform="([^"]+)"\s+)?d="([^"]+)"/g)].map(
    ([, transform, d]) => `<path${transform ? ` transform="${transform}"` : ''} d="${d}"/>`,
  )
  if (paths.length !== 2) throw new Error('Could not read the AK lockup from Brand.tsx')
  return `<svg viewBox="0 0 194.21 21" height="30" fill="#090a0b" xmlns="http://www.w3.org/2000/svg">${paths.join('')}</svg>`
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function html(card: Card, brand: string): string {
  const art = card.phones
    ? card.phones.map((src) => `<img class="phone" src="${asset(src)}" alt="">`).join('')
    : (card.figures ?? []).map((src) => `<img class="figure" src="${asset(src)}" alt="">`).join('')
  // The camera screens show stock footage, credited under the phones.
  const ids = (card.phones ?? []).map((src) => /\/([0-9]{2}-[a-z-]+)-800\.webp$/.exec(src)?.[1] as ScreenId)
  const footage = footageCredit(ids).replace(/\.$/, '')
  const textWidth = card.phones
    ? 1200 - 144 - card.phones.length * 245 - 40
    : card.figures
      ? 1200 - 144 - card.figures.length * 230 - 40
      : 1056
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Geist; src: url('${asset('/assets/fonts/Geist-Latin.woff2')}') format('woff2'); font-weight: 400 700; }
@font-face { font-family: 'Geist Serif'; src: url('${asset('/assets/fonts/GeistSerif-Latin.woff2')}') format('woff2'); font-weight: 400; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1200px; height: 630px; background: #ffffff; }
body { font-family: Geist, sans-serif; color: #090a0b; -webkit-font-smoothing: antialiased; }
.card { position: relative; width: 1200px; height: 630px; padding: 64px 72px; display: flex; gap: 40px; }
.text > svg { align-self: flex-start; width: auto; flex-shrink: 0; }
.text { width: ${textWidth}px; display: flex; flex-direction: column; }
.eyebrow { margin-top: 64px; font-size: 26px; font-weight: 500; color: #4d5755; }
.title { margin-top: 18px; font-family: 'Geist Serif', serif; font-size: ${card.title.length > 18 ? 60 : 72}px; line-height: 1.08; font-weight: 400; letter-spacing: -0.015em; text-wrap: balance; }
.subtitle { margin-top: 24px; font-size: 27px; line-height: 1.4; color: #4d5755; text-wrap: pretty; }
.footer { margin-top: auto; font-size: 23px; color: #4d5755; }
.art { margin-left: auto; display: flex; gap: 0; align-items: center; }
.phone + .phone { margin-left: 20px; }
.phone { height: 502px; width: auto; border-radius: 30px; border: 1px solid rgb(9 10 11 / 0.1); }
.figure { width: 230px; height: auto; }
.credit { position: absolute; right: 72px; bottom: 24px; font-size: 16px; color: #4d5755; }
</style></head><body><div class="card">
<div class="text">${brand}
<p class="eyebrow">${escape(card.eyebrow)}</p>
<h1 class="title">${escape(card.title)}</h1>
${card.subtitle ? `<p class="subtitle">${escape(card.subtitle)}</p>` : ''}
${card.footer ? `<p class="footer">${escape(card.footer)}</p>` : ''}
</div>
${art ? `<div class="art">${art}</div>` : ''}
${footage ? `<p class="credit">${escape(footage)}</p>` : ''}
</div></body></html>`
}

const brand = await lockup()
const work = join(tmpdir(), `og-images-${process.pid}`)
await mkdir(work, { recursive: true })
await mkdir(join(publicDir, 'assets/og'), { recursive: true })
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? 'chrome' })
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
for (const card of cards) {
  const file = join(work, 'card.html')
  await writeFile(file, html(card, brand))
  await page.goto(`file://${file}`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  const overflow = await page.evaluate(() => (document.querySelector('.text')?.scrollHeight ?? 0) > 630 - 128)
  if (overflow) throw new Error(`Text does not fit on the card for ${card.src}`)
  await page.screenshot({ path: join(publicDir, card.src), clip: { x: 0, y: 0, width: 1200, height: 630 } })
  console.log(`Wrote public${card.src}`)
}
await browser.close()
await rm(work, { recursive: true, force: true })

// Keep the approved note banners as their link previews rather than redrawing old cards.
for (const [slug, name] of [
  ['workout-director-1', 'note-01-counting'],
  ['workout-director-2', 'note-02-figure-pipeline'],
] as const) {
  await copyFile(join(publicDir, 'assets/banners', `${name}-1200x630.png`), join(publicDir, noteOgImages[slug].src))
}

import { expect, test } from '@playwright/test'
import { gotoHydrated } from './hydration'
import { routes } from './routes'

// Ashish: "Why 2 lines". A straight rule, a ground line or a drawn section line must never sit right on top of
// another one with nothing between them. Each page is scrolled through first so every section has revealed.
// Lines are element borders, <hr>, thin masked pen lines and the drawn ::before/::after lines; form controls and
// tables are left out (their outlines are not dividers). Two lines count as doubled when they overlap sideways by
// more than half, are under 160px apart and no visible text, picture or control sits between them.
type Line = { kind: string; x1: number; x2: number; y: number; el: string; tag: string; txt: string }
type Box = { y1: number; y2: number; x1: number; x2: number }

const findDoubled = () => {
  const lines: Line[] = []
  const vis = (s: CSSStyleDeclaration) => s.display !== 'none' && s.visibility !== 'hidden' && parseFloat(s.opacity) > 0
  const push = (kind: string, el: Element, x1: number, x2: number, y: number) => {
    if (x2 - x1 >= 120)
      lines.push({
        kind,
        x1,
        x2,
        y: y + scrollY,
        el: el.closest('[data-stack]')
          ? 'stack'
          : (el.closest('section')?.getAttribute('aria-labelledby') ??
            el.closest('section')?.getAttribute('aria-label') ??
            el.tagName),
        tag: el.tagName,
        txt: (el.textContent || '').trim().slice(0, 30),
      })
  }
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('input,textarea,button,select,table,summary,[role="tablist"]')) continue
    const s = getComputedStyle(el)
    if (!vis(s) || !el.checkVisibility({ contentVisibilityAuto: true })) continue
    const r = el.getBoundingClientRect()
    if (!r.width) continue
    for (const side of ['Top', 'Bottom'] as const) {
      const w = parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`))
      const st = s.getPropertyValue(`border-${side.toLowerCase()}-style`)
      const c = s.getPropertyValue(`border-${side.toLowerCase()}-color`)
      if (w >= 1 && st !== 'none' && !/rgba\(.*, 0\)|transparent/.test(c))
        push('border' + side, el, r.left, r.right, side === 'Top' ? r.top : r.bottom)
    }
    if (el.tagName === 'HR') push('hr', el, r.left, r.right, r.top)
    if (s.maskImage && s.maskImage !== 'none' && r.height <= 20) push('pen', el, r.left, r.right, r.top + r.height / 2)
    for (const pe of ['::before', '::after']) {
      const p = getComputedStyle(el, pe)
      const ph = parseFloat(p.height) || 0
      if (ph > 20) continue
      if (p.content === 'none' || !p.maskImage || p.maskImage === 'none' || !/url\(/.test(p.maskImage)) continue
      const h = parseFloat(p.height) || 0
      let top = p.top !== 'auto' ? r.top + parseFloat(p.top) : r.bottom - parseFloat(p.bottom) - h
      if (Number.isNaN(top)) top = r.top
      const left = p.left !== 'auto' && !Number.isNaN(parseFloat(p.left)) ? r.left + parseFloat(p.left) : r.left
      const right =
        p.right !== 'auto' && !Number.isNaN(parseFloat(p.right))
          ? r.right - parseFloat(p.right)
          : left + (parseFloat(p.width) || r.width)
      push('pen' + pe, el, left, right, top + h / 2)
    }
  }
  lines.sort((a, b) => a.y - b.y)
  // Anything a reader sees between two lines: text, pictures, controls.
  const content: Box[] = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (
      !n.textContent?.trim() ||
      !n.parentElement?.checkVisibility({
        contentVisibilityAuto: true,
        opacityProperty: true,
        visibilityProperty: true,
      })
    )
      continue
    const range = document.createRange()
    range.selectNodeContents(n)
    for (const r of range.getClientRects())
      if (r.width && r.height) content.push({ y1: r.top + scrollY, y2: r.bottom + scrollY, x1: r.left, x2: r.right })
  }
  for (const el of document.querySelectorAll('img,svg,video,canvas,picture,input,textarea,button,select,iframe')) {
    if (
      el.closest('[aria-hidden="true"]') ||
      !el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true })
    )
      continue
    const r = el.getBoundingClientRect()
    if (r.width > 4 && r.height > 4)
      content.push({ y1: r.top + scrollY, y2: r.bottom + scrollY, x1: r.left, x2: r.right })
  }
  const pairs: { dy: number; a: string; b: string; y: number }[] = []
  for (let i = 0; i < lines.length; i++)
    for (let j = i + 1; j < lines.length && (lines[j]?.y ?? 0) - (lines[i]?.y ?? 0) < 160; j++) {
      const a = lines[i]
      const b = lines[j]
      if (!a || !b) continue
      const ov = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1)
      const lo = Math.max(a.x1, b.x1),
        hi = Math.min(a.x2, b.x2)
      const between = content.some((c) => c.y2 > a.y + 1 && c.y1 < b.y - 1 && c.x2 > lo && c.x1 < hi)
      if (!between && ov > 0.5 * Math.min(a.x2 - a.x1, b.x2 - b.x1) && Math.abs(b.y - a.y) > 0.5)
        pairs.push({
          dy: +(b.y - a.y).toFixed(1),
          a: `${a.kind} ${a.tag} ${a.el} "${a.txt}"`,
          b: `${b.kind} ${b.tag} ${b.el} "${b.txt}"`,
          y: Math.round(a.y),
        })
    }
  return pairs
}

for (const width of [390, 768, 1440]) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`no two dividers sit next to each other at ${width} (${scheme})`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'viewport set here; once is enough')
      test.setTimeout(120_000)
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' })
      await page.setViewportSize({ width, height: 900 })
      for (const path of [...routes, '/no-such-page/']) {
        await gotoHydrated(page, path)
        await page.evaluate(async () => {
          document.querySelectorAll('details').forEach((d) => (d.open = false))
          for (let y = 0; y < document.body.scrollHeight; y += 400) {
            scrollTo(0, y)
            await new Promise((r) => setTimeout(r, 30))
          }
          scrollTo(0, 0)
          await new Promise((r) => setTimeout(r, 300))
        })
        expect(await page.evaluate(findDoubled), path).toEqual([])
      }
    })
  }
}

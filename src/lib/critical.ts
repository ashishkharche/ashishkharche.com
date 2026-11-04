// Build-time changes that let a page paint from its HTML alone on a slow connection (run by scripts/postbuild.ts):
// - The rules of the site stylesheet that can match the page are inlined in a <style> (allowed by hash in the CSP),
//   in place of the render-blocking <link>. The whole stylesheet still loads, without blocking, before hydration.
// - The app's JavaScript (entry module and module preloads) is requested only after the first paint, so it does not
//   compete with the HTML, fonts and above-the-fold images for bandwidth. The page is fully rendered HTML, so
//   nothing on screen waits for it.
import postcss, { type AtRule, type Rule } from 'postcss'

/** Every word-like token in the page (class names, and the theme classes inside the theme script). */
export function pageTokens(html: string): Set<string> {
  return new Set(html.match(/[\w-]+/g) ?? [])
}

/** Drops the arguments of functional pseudo-classes (:not(), :where(), :is(), :has()), keeping the rest. */
function withoutPseudoArgs(selector: string): string {
  let out = ''
  let depth = 0
  for (let i = 0; i < selector.length; i++) {
    const ch = selector[i]
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)
    else if (depth === 0) out += ch
  }
  return out
}

/** True when every class the selector needs (outside pseudo-class arguments) is somewhere in the page. */
export function selectorMayMatch(selector: string, tokens: Set<string>): boolean {
  const classes = withoutPseudoArgs(selector).match(/\.(-?[_a-zA-Z][\w-]*)/g) ?? []
  return classes.every((name) => tokens.has(name.slice(1)))
}

/**
 * The rules of `css` that can apply to `html`: a rule is kept when any of its selectors could match (rules without
 * classes always are). @font-face, @keyframes and @layer order statements are kept as they are, so the cascade is the
 * same as with the whole file. This is a superset of what the page uses, never a subset.
 */
export function criticalCss(css: string, html: string): string {
  const tokens = pageTokens(html)
  const root = postcss.parse(css)
  // Layer order is set by where each layer first appears. Name them all up front, so that a layer this page does not
  // use still sorts in the same place when the whole stylesheet arrives later.
  const layers: string[] = []
  root.walkAtRules('layer', (at: AtRule) => {
    for (const name of at.params.split(',').map((part) => part.trim()))
      if (name && !layers.includes(name)) layers.push(name)
  })
  root.walkRules((rule: Rule) => {
    const parent = rule.parent
    if (parent?.type === 'atrule' && /keyframes$/i.test((parent as AtRule).name)) return
    if (!rule.selectors.some((selector) => selectorMayMatch(selector, tokens))) rule.remove()
  })
  // Remove blocks left empty, innermost first (a @media inside a @layer can empty the layer).
  let removed = true
  while (removed) {
    removed = false
    root.walkAtRules((at: AtRule) => {
      if (at.nodes && at.nodes.length === 0) {
        at.remove()
        removed = true
      }
    })
  }
  return (layers.length ? `@layer ${layers.join(',')};` : '') + root.toString()
}

/**
 * The stylesheet without its @font-face rules. Every page already declares the faces in its inline critical CSS, so
 * the faces are declared once; a second, identical declaration arriving with the stylesheet would make the browser
 * fetch and swap the fonts again.
 */
export function withoutFontFaces(css: string): string {
  const root = postcss.parse(css)
  root.walkAtRules('font-face', (at: AtRule) => {
    at.remove()
  })
  return root.toString()
}

/**
 * The inline script that loads the stylesheet and the app once the first contentful paint has been reported (or after
 * the next frame where the Paint Timing API is missing, or after 3 s at the latest). A hidden tab does not paint, so it
 * loads straight away there. Plain ES5 so it runs anywhere the HTML does.
 */
export function loaderScript(stylesheet: string, entry: string, preloads: readonly string[]): string {
  const data = JSON.stringify({ c: stylesheet, e: entry, p: preloads })
  return (
    `(function(a){var d=document,h=d.head,done=0;function go(){if(done)return;done=1;` +
    `var l=d.createElement('link');l.rel='stylesheet';l.href=a.c;l.setAttribute('data-precedence','default');h.appendChild(l);` +
    `a.p.forEach(function(u){var p=d.createElement('link');p.rel='modulepreload';p.href=u;p.setAttribute('fetchpriority','low');h.appendChild(p)});` +
    `var s=d.createElement('script');s.type='module';s.setAttribute('async','');s.src=a.e;d.body.appendChild(s)}` +
    `function later(){setTimeout(go,0)}` +
    `if(d.visibilityState==='hidden'||!window.requestAnimationFrame){go();return}setTimeout(go,3000);` +
    `var P=window.PerformanceObserver,t=P&&P.supportedEntryTypes;` +
    `if(t&&t.indexOf('paint')>=0){new P(function(l,o){if(l.getEntriesByName('first-contentful-paint').length){o.disconnect();later()}}).observe({type:'paint',buffered:true})}` +
    `else requestAnimationFrame(later)})(${data})`
  )
}

const stylesheetLink = /<link rel="stylesheet" href="([^"]+\.css)" data-precedence="default"\/>/g
const preloadLink = /<link rel="modulepreload" href="([^"]+\.js)"(?: fetchPriority="low")?\/>/g
const fontPreload = /<link rel="preload" href="[^"]+\.woff2" as="font" type="font\/woff2" crossorigin="anonymous"\/>/g
const viewportMeta = /<meta name="viewport" content="[^"]*"\/>/
const entryScript = /<script type="module" async="" src="([^"]+\.js)"><\/script>/g

/**
 * Rewrites one prerendered page: inlines its critical CSS and defers the stylesheet and scripts to the loader.
 * `readCss` gives the contents of a stylesheet by its URL path. Throws when the page does not have exactly the tags
 * this expects, so a change in the framework's output fails the build instead of shipping a broken page.
 */
export function deferAssets(html: string, readCss: (href: string) => string): string {
  const sheets = [...html.matchAll(stylesheetLink)]
  const entries = [...html.matchAll(entryScript)]
  if (sheets.length !== 1) throw new Error(`expected one stylesheet link, found ${sheets.length}`)
  if (entries.length !== 1) throw new Error(`expected one entry module script, found ${entries.length}`)
  const sheet = sheets[0]?.[1] ?? ''
  const entry = entries[0]?.[1] ?? ''
  const preloads = [...html.matchAll(preloadLink)].map((match) => match[1] ?? '')
  if (!preloads.includes(entry)) throw new Error('the entry module is not among the module preloads')
  const critical = criticalCss(readCss(sheet), html)
  if (/<\/style/i.test(critical)) throw new Error('critical CSS contains </style')
  // The font preloads go first in <head>, ahead of the inline CSS, so the browser starts the fonts from the first bytes.
  const fonts = html.match(fontPreload) ?? []
  if (!viewportMeta.test(html)) throw new Error('no viewport meta tag to put the font preloads after')
  return html
    .replace(fontPreload, '')
    .replace(viewportMeta, (meta) => meta + fonts.join(''))
    .replace(stylesheetLink, () => `<style>${critical}</style>`)
    .replace(preloadLink, '')
    .replace(entryScript, () => `<script>${loaderScript(sheet, entry, preloads)}</script>`)
}

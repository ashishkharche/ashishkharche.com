import { describe, expect, it } from 'vitest'
import { criticalCss, deferAssets, loaderScript, selectorMayMatch, withoutFontFaces } from '~/lib/critical'
import { inlineStyles, pagePolicy, sha256Source } from '~/lib/csp'

const css =
  '@layer reset,priority1;@font-face{font-family:Geist;src:url(/a.woff2)}' +
  '@layer reset{body{margin:0}}' +
  '@layer priority1{.xa{color:red}.xb{color:blue}.xa:hover{color:green}}' +
  '@media (width<=560px){.xb{color:pink}}' +
  '@keyframes spin{to{transform:rotate(1turn)}}' +
  '.xa:not(.xmissing){top:0}:root,.xtheme{--c:1}.xmarker:hover .xa{left:0}'

describe('critical CSS', () => {
  it('keeps the rules a page can use and drops the rest', () => {
    const out = criticalCss(css, '<p class="xa">x</p>')
    expect(out).toContain('.xa{color:red}')
    expect(out).toContain('.xa:hover{color:green}')
    expect(out).toContain('.xa:not(.xmissing){top:0}')
    expect(out).toContain('body{margin:0}')
    expect(out).toContain('@font-face')
    expect(out).toContain('@keyframes spin')
    expect(out).toContain('@layer reset,priority1;')
    expect(out).toContain(':root,.xtheme{--c:1}')
    expect(out).not.toContain('.xb')
    expect(out).not.toContain('@media')
    expect(out).not.toContain('.xmarker')
  })
  it('names every layer up front, so the order holds when the whole stylesheet arrives', () => {
    expect(criticalCss('@layer a{.xa{top:0}}@layer b{.xb{top:1px}}@layer c{.xa{left:0}}', 'xa')).toMatch(
      /^@layer a,b,c;/,
    )
  })
  it('leaves the font faces to the inline CSS', () => {
    const out = withoutFontFaces(css)
    expect(out).not.toContain('@font-face')
    expect(out).toContain('.xa{color:red}')
  })
  it('counts classes named only inside scripts (the theme classes)', () => {
    expect(criticalCss(css, '<script>var c="xb xmarker"</script><p class="xa"></p>')).toContain('.xmarker:hover .xa')
  })
  it('only needs the classes outside pseudo-class arguments', () => {
    const tokens = new Set(['xa'])
    expect(selectorMayMatch('.xa:where(.xother) ', tokens)).toBe(true)
    expect(selectorMayMatch('.xa.xb', tokens)).toBe(false)
    expect(selectorMayMatch('html[data-theme=dark]', tokens)).toBe(true)
  })
})

const page =
  '<html><head><meta name="viewport" content="width=device-width"/>' +
  '<link rel="stylesheet" href="/assets/global-1.css" data-precedence="default"/>' +
  '<link rel="modulepreload" href="/assets/index-1.js" fetchPriority="low"/>' +
  '<link rel="modulepreload" href="/assets/route-1.js" fetchPriority="low"/>' +
  '<link rel="preload" href="/assets/fonts/G.woff2" as="font" type="font/woff2" crossorigin="anonymous"/></head>' +
  '<body><p class="xa">Hi</p><script type="module" async="" src="/assets/index-1.js"></script></body></html>'

describe('deferAssets', () => {
  const out = deferAssets(page, () => css)
  it('inlines the critical CSS in place of the stylesheet link', () => {
    expect(out).not.toContain('<link rel="stylesheet"')
    expect(out).toMatch(/<\/head>/)
    expect(out).toMatch(/as="font"[^>]*\/><style>[^<]*\.xa\{color:red\}/)
  })
  it('puts the font preloads ahead of the inline CSS', () => {
    expect(out.indexOf('as="font"')).toBeLessThan(out.indexOf('<style>'))
    expect(out.match(/as="font"/g)).toHaveLength(1)
  })
  it('requests the scripts only from the loader', () => {
    expect(out).not.toContain('rel="modulepreload"')
    expect(out).not.toContain('<script type="module"')
    expect(out).toContain(
      `<script>${loaderScript('/assets/global-1.css', '/assets/index-1.js', ['/assets/index-1.js', '/assets/route-1.js'])}</script>`,
    )
  })
  it('allows the inline style by hash only', () => {
    const [style] = inlineStyles(out)
    expect(pagePolicy(out)).toContain(`style-src 'self' ${sha256Source(style ?? '')};`)
    expect(pagePolicy(out)).not.toContain('unsafe-inline')
  })
  it('fails on a page without the tags it expects', () => {
    expect(() => deferAssets('<html><head></head><body></body></html>', () => css)).toThrow()
  })
})

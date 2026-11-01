import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { chartIconHosts, inlineScripts, pagePolicy, withPolicy } from '~/lib/csp'
import { ICON_HOST } from '~/lib/charts/tdn'

const html =
  '<html><head><script>a()</script><script type="application/ld+json">{"x":1}</script>' +
  '<script type="module" src="/assets/x.js"></script></head><body><script data-x="">b()</script></body></html>'

describe('csp', () => {
  it('collects only inline scripts that run', () => {
    expect(inlineScripts(html)).toEqual(['a()', 'b()'])
  })
  it('allows each inline script by hash and nothing else inline', () => {
    const policy = pagePolicy(html)
    const hash = createHash('sha256').update('a()').digest('base64')
    expect(policy).toContain(`'sha256-${hash}'`)
    expect(policy).toContain("style-src 'self'")
    expect(policy).not.toContain('unsafe-inline')
  })
  it('puts the policy before the first script', () => {
    const out = withPolicy(html)
    expect(out.indexOf('Content-Security-Policy')).toBeLessThan(out.indexOf('<script'))
    expect(() => withPolicy(out)).toThrow()
  })
  it('allows icon hosts only where asked, and the same hosts the chart builder loads', () => {
    expect(pagePolicy(html)).toContain("img-src 'self' data:;")
    expect(pagePolicy(html, chartIconHosts)).toContain(`img-src 'self' data: ${chartIconHosts.join(' ')};`)
    for (const host of chartIconHosts) expect(ICON_HOST.test(`${host}/icon.png`)).toBe(true)
    expect(ICON_HOST.test('https://is6-ssl.mzstatic.com/icon.png')).toBe(false)
    expect(ICON_HOST.test('https://example.com/icon.png')).toBe(false)
  })
})

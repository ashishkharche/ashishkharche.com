import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkIconUrl, handle, ICON_BROWSER_CACHE, ICON_CDN_CACHE, ICON_HOSTNAME, resetIcons } from '../../api/icon'
import { iconRouteUrl, iconSources, manifestLoader } from '~/lib/charts/icons'
import { ICON_HOST } from '~/lib/charts/tdn'

const APPLE = 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/ea/52/3a/x/chat.png/512x512bb.jpg'
const GOOGLE = 'https://play-lh.googleusercontent.com/37tKpf8CVekD3Ui1KEoCGY-jjBO2dhWfE5qAd0Yc9'
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])
const ok = (type = 'image/png', body: BodyInit = png) =>
  vi.fn(async () => new Response(body, { status: 200, headers: { 'content-type': type } }))
const get = (search: string, method = 'GET') => new Request(`https://ashishkharche.com/api/icon/?${search}`, { method })
const u = (url: string) => `u=${encodeURIComponent(url)}`

beforeEach(() => resetIcons())

describe('icon route allowlist', () => {
  it('accepts only https URLs on the TDN icon hosts, in normal form', () => {
    expect(checkIconUrl(APPLE)?.href).toBe(APPLE)
    expect(checkIconUrl(GOOGLE)?.href).toBe(GOOGLE)
    for (const bad of [
      null,
      '',
      'http://is1-ssl.mzstatic.com/a.png',
      'https://is0-ssl.mzstatic.com/a.png',
      'https://is10-ssl.mzstatic.com/a.png',
      'https://is1-ssl.mzstatic.com.evil.com/a.png',
      'https://evil.com/https://is1-ssl.mzstatic.com/a.png',
      'https://user@is1-ssl.mzstatic.com/a.png',
      'https://is1-ssl.mzstatic.com@evil.com/a.png',
      'https://is1-ssl.mzstatic.com:8443/a.png',
      'https://IS1-SSL.MZSTATIC.COM/a.png',
      'https://is1-ssl.mzstatic.com/a/../b.png',
      'https://is1-ssl.mzstatic.com/a.png#x',
      'https://lh3.googleusercontent.com/a',
      'https://169.254.169.254/latest/meta-data',
      'file:///etc/passwd',
      `https://play-lh.googleusercontent.com/${'a'.repeat(700)}`,
    ]) {
      expect(checkIconUrl(bad), String(bad)).toBeNull()
    }
  })

  it('never fetches a URL that is not allowed, and refuses extra parameters and other methods', async () => {
    const fetcher = ok()
    for (const search of [
      u('https://evil.com/a.png'),
      u('https://is1-ssl.mzstatic.com.evil.com/a.png'),
      `${u(APPLE)}&u=${encodeURIComponent('https://evil.com/')}`,
      `${u(APPLE)}&x=1`,
      'url=' + encodeURIComponent(APPLE),
      '',
    ]) {
      const res = await handle(get(search), fetcher)
      expect(res.status, search).toBe(400)
      expect(res.headers.get('cache-control')).toBe('no-store')
    }
    expect((await handle(get(u(APPLE), 'POST'), fetcher)).status).toBe(405)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('uses the same hosts as the chart builder', () => {
    for (const url of [
      APPLE,
      GOOGLE,
      'https://is9-ssl.mzstatic.com/a',
      'https://evil.com/a',
      'https://is0-ssl.mzstatic.com/a',
    ]) {
      expect(ICON_HOSTNAME.test(new URL(url).hostname)).toBe(ICON_HOST.test(url))
    }
  })
})

describe('icon route answers', () => {
  it('sends the image with long CDN caching and safe headers', async () => {
    const fetcher = ok('image/jpeg')
    const res = await handle(get(u(APPLE)), fetcher)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/jpeg')
    expect(res.headers.get('vercel-cdn-cache-control')).toBe(ICON_CDN_CACHE)
    expect(ICON_CDN_CACHE).toMatch(/s?max-age=2592000/)
    expect(ICON_CDN_CACHE).toContain('stale-while-revalidate=')
    expect(ICON_CDN_CACHE).toContain('stale-if-error=')
    expect(res.headers.get('cache-control')).toBe(ICON_BROWSER_CACHE)
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('content-security-policy')).toContain('sandbox')
    expect(res.headers.get('set-cookie')).toBeNull()
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(png)
    expect(fetcher).toHaveBeenCalledWith(APPLE, expect.objectContaining({ redirect: 'error' }))
  })

  it('refuses bodies that are not images, and does not cache errors', async () => {
    const res = await handle(get(u(GOOGLE)), ok('text/html', '<script>alert(1)</script>'))
    expect(res.status).toBe(502)
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('vercel-cdn-cache-control')).toBeNull()
  })

  it('sends the kept copy when the host rate limits, and 503 with no-store when there is none', async () => {
    const limited = vi.fn(async () => new Response('', { status: 429 }))
    const none = await handle(get(u(GOOGLE)), limited)
    expect(none.status).toBe(503)
    expect(none.headers.get('cache-control')).toBe('no-store')
    await handle(get(u(GOOGLE)), ok())
    const copy = await handle(get(u(GOOGLE)), limited)
    expect(copy.status).toBe(200)
    expect(copy.headers.get('x-icon-stale')).toBe('1')
    const down = await handle(
      get(u(GOOGLE)),
      vi.fn(async () => Promise.reject(new TypeError('network'))),
    )
    expect(down.status).toBe(200)
  })
})

describe('icon sources on the page', () => {
  it('tries the baked copy first, then the same-origin route, and never the icon host', () => {
    const manifest = { savedAt: '', files: { [GOOGLE]: '0123456789abcdef.webp' } }
    expect(iconSources(GOOGLE, manifest)).toEqual(['/lab/charts/icons/0123456789abcdef.webp', iconRouteUrl(GOOGLE)])
    expect(iconSources(APPLE, manifest)).toEqual([`/api/icon/?u=${encodeURIComponent(APPLE)}`])
    expect(iconSources(APPLE, null)).toEqual([iconRouteUrl(APPLE)])
    expect(iconSources('https://evil.com/a.png', manifest)).toEqual([])
    expect(iconSources(GOOGLE, { savedAt: '', files: { [GOOGLE]: '../../x.svg' } })).toEqual([iconRouteUrl(GOOGLE)])
    for (const src of iconSources(GOOGLE, manifest)) expect(src.startsWith('/')).toBe(true)
  })

  it('reads the baked list once and treats a broken one as none', async () => {
    const load = vi.fn(async () => Promise.reject(new Error('404')))
    const read = manifestLoader(load)
    expect(await read()).toBeNull()
    expect(await read()).toBeNull()
    expect(load).toHaveBeenCalledTimes(1)
  })
})

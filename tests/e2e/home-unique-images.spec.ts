import { expect, test } from '@playwright/test'

// Every image on the home page is a different picture: no screen, photo or
// figure is shown twice, at any width or in any format. Logos (/assets/logos/)
// are marks, not pictures, and the Workout Director icon heads both the intro
// and its Selected work card, so they are left out. Copies of one image
// differ only in their width suffix and format (02-voice-400.avif and
// 02-voice-800.webp are the same picture), so both are stripped before comparing.
function imageKey(src: string): string {
  const path = new URL(src, 'http://localhost').pathname
  return path.replace(/(-\d+)?\.(avif|webp|png|jpe?g|svg)$/, '')
}

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
]) {
  test(`at ${viewport.width} wide no image appears twice on the home page`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')
    // Every candidate a <picture> or <img> could load, not only the one the browser picked.
    const sources = await page.evaluate(() => {
      const images = [...document.querySelectorAll('img')].filter(
        (img) => !(img.getAttribute('src') ?? '').startsWith('/assets/logos/'),
      )
      return images.map((img) => {
        const picture = img.closest('picture')
        const candidates = [
          img.getAttribute('src') ?? '',
          ...(img.getAttribute('srcset') ?? '').split(','),
          ...[...(picture?.querySelectorAll('source') ?? [])].flatMap((s) =>
            (s.getAttribute('srcset') ?? '').split(','),
          ),
        ]
          .map((c) => c.trim().split(/\s+/)[0] ?? '')
          .filter((c) => c !== '')
        return candidates
      })
    })
    expect(sources.length).toBeGreaterThan(3)
    const keys = sources.map((candidates) => {
      const set = new Set(candidates.map(imageKey))
      expect(set.size, `one <img> mixes pictures: ${[...set].join(', ')}`).toBe(1)
      return [...set][0] ?? ''
    })
    const repeated = keys.filter((key, index) => keys.indexOf(key) !== index)
    expect(repeated, `shown more than once: ${repeated.join(', ')}`).toEqual([])
    // The Voice screen and the hero front phone come from the same Mixkit clip, so they never share the page.
    expect(keys.filter((key) => /\/(02-voice|pushup-mixkit)$/.test(key)).length).toBeLessThanOrEqual(1)
    // The same holds for the Pexels deadlift clip: 02-voice-pexels and the hero back phone.
    expect(keys.filter((key) => /\/(02-voice-pexels|deadlift-pexels)$/.test(key)).length).toBeLessThanOrEqual(1)
  })
}

import * as stylex from '@stylexjs/stylex'
import { useLayoutEffect, useRef, useState } from 'react'
import { colors } from '~/styles/tokens.stylex'

/**
 * Where the pen line down the page meets the footer drawing, it runs into the A of the AK mark: above the drawing it
 * leaves the left edge, bends once and arrives level at the A's top-left corner, so it carries on as the A's top edge
 * and the letter keeps its own outline. The drawing itself is not touched.
 *
 * The bend depends on where the line and the drawing sit at the current width, so it is measured after layout and
 * again whenever the page changes size. Without JavaScript the line simply ends above the footer (see __root.tsx).
 */

// The A in the footer drawing (both footer-identity.svg and footer-identity-phone.svg, in drawing units): its top-left
// corner, where the top edge meets the left leg, and the stroke width.
const APEX = { x: 305.6, y: 164 }
const ART_STROKE = 2.4
// The pen line down the page: a 1.5px stroke drawn 16px wide (see public/assets/img/scene/line-v.svg).
const SPINE_STROKE = 1.5
// How far the drawn line sits from the middle of its 16px box (tenths of a pixel), at y = 0, then every 10px from
// y = 15 to 1195, then y = 1200. Taken from line-v.svg, so the bend starts exactly where the line ends.
const WOBBLE =
  '0,2,3,3,3,2,2,1,1,0,-1,-1,-2,-2,-3,-3,-4,-4,-5,-5,-6,-7,-7,-8,-8,-9,-9,-8,-8,-8,-7,-6,-5,-4,-4,-3,-3,-3,-3,-3,-3,-4,-4,-4,-5,-5,-5,-4,-4,-4,-4,-3,-3,-3,-4,-4,-4,-4,-4,-4,-3,-3,-2,-1,1,2,4,5,7,8,9,10,10,11,11,11,11,11,10,10,10,10,10,10,10,9,9,8,7,6,4,3,2,1,0,-1,-1,-2,-2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,0,0,0'
    .split(',')
    .map((n) => Number(n) / 10)

function wobbleAt(y: number): number {
  const t = ((y % 1200) + 1200) % 1200
  const ys = WOBBLE.map((_, k) => (k === 0 ? 0 : k === WOBBLE.length - 1 ? 1200 : 10 * k + 5))
  for (let k = 1; k < ys.length; k++) {
    const y1 = ys[k] ?? 1200
    const y0 = ys[k - 1] ?? 0
    if (t <= y1) {
      const a = WOBBLE[k - 1] ?? 0
      const b = WOBBLE[k] ?? 0
      return a + ((b - a) * (t - y0)) / (y1 - y0)
    }
  }
  return 0
}

type Pt = { x: number; y: number }
type Merge = { outline: string; centre: Pt[]; spineBottom: number } | { end: true }

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): { p: Pt; d: Pt } {
  const u = 1 - t
  return {
    p: {
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    },
    d: {
      x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
      y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
    },
  }
}

function measure(scene: HTMLElement): Merge {
  const spine = scene.querySelector<HTMLElement>('[data-pen-spine]')
  const row = scene.querySelector<HTMLElement>('[data-footer-row]')
  const art = Array.from(scene.querySelectorAll<HTMLImageElement>('[data-footer-art]')).find(
    (img) => img.getBoundingClientRect().width > 0,
  )
  if (!spine || !row || !art) return { end: true }
  const box = scene.getBoundingClientRect()
  const sp = spine.getBoundingClientRect()
  const ar = art.getBoundingClientRect()
  const [vx = 0, vy = 0, vw = 1] = (art.dataset.viewbox ?? '').split(' ').map(Number)
  const scale = ar.width / vw
  const apex = { x: ar.left - box.left + (APEX.x - vx) * scale, y: ar.top - box.top + (APEX.y - vy) * scale }
  const spineTop = sp.top - box.top
  const centreX = sp.left - box.left + 8
  const across = apex.x - centreX
  // The bend starts just under the footer's text row, and no higher than it needs to.
  const start = Math.max(
    row.getBoundingClientRect().bottom - box.top + 4,
    apex.y - Math.min(160, Math.max(64, Math.abs(across) * 1.2)),
  )
  const drop = apex.y - start
  // Too little room for a clean bend: the line ends above the footer instead.
  if (drop < 40 || drop < Math.abs(across) * 0.5) return { end: true }
  const p0 = { x: centreX + wobbleAt(start - spineTop), y: start }
  // One gentle bend: straight down off the line, then level into the A's top-left corner, so the line runs on into
  // the top edge of the A. Both handles stay inside the box between the two ends, so the bend never passes the
  // corner, never swings back and leaves the A's own outline as drawn.
  const p1 = { x: p0.x, y: start + drop * 0.55 }
  const p2 = { x: apex.x - (apex.x - p0.x) * 0.55, y: apex.y }
  const p3 = apex
  const from = SPINE_STROKE
  const to = ART_STROKE * scale
  const left: Pt[] = []
  const right: Pt[] = []
  const centre: Pt[] = []
  const steps = 48
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const { p, d } = cubic(p0, p1, p2, p3, t)
    const len = Math.hypot(d.x, d.y) || 1
    const n = { x: -d.y / len, y: d.x / len }
    const half = (from + (to - from) * t * t * (3 - 2 * t)) / 2
    centre.push(p)
    left.push({ x: p.x + n.x * half, y: p.y + n.y * half })
    right.push({ x: p.x - n.x * half, y: p.y - n.y * half })
  }
  const pts = [...left, ...right.reverse()]
  const outline = `M${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('L')}Z`
  return { outline, centre, spineBottom: box.height - start }
}

export function PenMerge() {
  const ref = useRef<SVGSVGElement>(null)
  const [merge, setMerge] = useState<Merge>({ end: true })
  useLayoutEffect(() => {
    const scene = ref.current?.parentElement
    if (!scene) return
    const spine = scene.querySelector<HTMLElement>('[data-pen-spine]')
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = measure(scene)
        if (spine) spine.style.bottom = 'end' in next ? '' : `${next.spineBottom}px`
        setMerge(next)
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(scene)
    const images = scene.querySelectorAll('[data-footer-art]')
    images.forEach((img) => img.addEventListener('load', update))
    void document.fonts.ready.then(update)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      images.forEach((img) => img.removeEventListener('load', update))
    }
  }, [])
  const merged = !('end' in merge)
  return (
    <svg
      ref={ref}
      aria-hidden="true"
      data-pen-merge={merged ? 'merge' : 'end'}
      data-centre={
        merged
          ? JSON.stringify(merge.centre.map((p) => [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]))
          : undefined
      }
      {...stylex.props(styles.svg)}
    >
      {merged ? <path d={merge.outline} {...stylex.props(styles.ink)} /> : null}
    </svg>
  )
}

const styles = stylex.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflow: 'visible',
    pointerEvents: 'none',
  },
  ink: { fill: colors.ink },
})

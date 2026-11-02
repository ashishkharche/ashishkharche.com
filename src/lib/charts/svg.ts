/**
 * A stand-in for the parts of CanvasRenderingContext2D the renderer uses,
 * writing SVG instead of pixels. Text is measured on a real canvas so it is
 * placed exactly as in the PNG, and the chart fonts are embedded so the file
 * looks the same anywhere.
 */
import type { Ctx } from './render.ts'

type Matrix = [number, number, number, number, number, number]

interface State {
  matrix: Matrix
  clip?: string
  font: string
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  lineCap: CanvasLineCap
  letterSpacing: string
  dash: number[]
}

const esc = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const n = (value: number) => String(Math.round(value * 100) / 100)

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ]
}

export interface SvgFont {
  family: string
  /** A CSS font-weight value: "400", or a range like "400 500" for a variable font. */
  weight: string
  /** A data: URL of the font file. */
  url: string
}

export class SvgContext {
  private parts: string[] = []
  private defs: string[] = []
  private path: string[] = []
  private stack: State[] = []
  private state: State = {
    matrix: [1, 0, 0, 1, 0, 0],
    font: '10px sans-serif',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    letterSpacing: '0px',
    dash: [],
  }
  private ids = 0
  private images = new Map<CanvasImageSource, string>()
  textAlign: CanvasTextAlign = 'left'
  textBaseline: CanvasTextBaseline = 'alphabetic'
  fontKerning: CanvasFontKerning = 'none'
  imageSmoothingQuality: ImageSmoothingQuality = 'high'

  constructor(
    private width: number,
    private height: number,
    private measure: CanvasRenderingContext2D,
    private imageUrl: (image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number) => string,
  ) {}

  get font() {
    return this.state.font
  }
  set font(value: string) {
    this.state.font = value
  }
  get fillStyle() {
    return this.state.fillStyle
  }
  set fillStyle(value: string | CanvasGradient | CanvasPattern) {
    this.state.fillStyle = String(value)
  }
  get strokeStyle() {
    return this.state.strokeStyle
  }
  set strokeStyle(value: string | CanvasGradient | CanvasPattern) {
    this.state.strokeStyle = String(value)
  }
  get lineWidth() {
    return this.state.lineWidth
  }
  set lineWidth(value: number) {
    this.state.lineWidth = value
  }
  get lineCap() {
    return this.state.lineCap
  }
  set lineCap(value: CanvasLineCap) {
    this.state.lineCap = value
  }
  get letterSpacing() {
    return this.state.letterSpacing
  }
  set letterSpacing(value: string) {
    this.state.letterSpacing = value
  }

  save() {
    this.stack.push({ ...this.state, dash: [...this.state.dash] })
  }
  restore() {
    this.state = this.stack.pop() ?? this.state
  }
  translate(x: number, y: number) {
    this.state.matrix = multiply(this.state.matrix, [1, 0, 0, 1, x, y])
  }
  rotate(angle: number) {
    const c = Math.cos(angle)
    const s = Math.sin(angle)
    this.state.matrix = multiply(this.state.matrix, [c, s, -s, c, 0, 0])
  }
  setLineDash(segments: number[]) {
    this.state.dash = [...segments]
  }
  private point(x: number, y: number) {
    const m = this.state.matrix
    return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]] as const
  }
  beginPath() {
    this.path = []
  }
  moveTo(x: number, y: number) {
    const [px, py] = this.point(x, y)
    this.path.push(`M${n(px)} ${n(py)}`)
  }
  lineTo(x: number, y: number) {
    const [px, py] = this.point(x, y)
    this.path.push(`L${n(px)} ${n(py)}`)
  }
  rect(x: number, y: number, w: number, h: number) {
    this.moveTo(x, y)
    this.lineTo(x + w, y)
    this.lineTo(x + w, y + h)
    this.lineTo(x, y + h)
    this.path.push('Z')
  }
  /** Only full circles are drawn by the renderer. */
  arc(x: number, y: number, r: number) {
    const [cx, cy] = this.point(x, y)
    this.path.push(`M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0Z`)
  }
  /** Clip paths are in page coordinates, so clipped elements go in a group without a transform. */
  private emit(element: string) {
    this.parts.push(this.state.clip ? `<g clip-path="url(#${this.state.clip})">${element}</g>` : element)
  }
  clip() {
    const id = `c${this.ids++}`
    const parent = this.state.clip ? ` clip-path="url(#${this.state.clip})"` : ''
    this.defs.push(`<clipPath id="${id}"${parent}><path d="${this.path.join('')}"/></clipPath>`)
    this.state.clip = id
  }
  fill() {
    this.emit(`<path d="${this.path.join('')}" fill="${this.state.fillStyle}"/>`)
  }
  stroke() {
    const dash = this.state.dash.length ? ` stroke-dasharray="${this.state.dash.map(n).join(' ')}"` : ''
    this.emit(
      `<path d="${this.path.join('')}" fill="none" stroke="${this.state.strokeStyle}" stroke-width="${n(this.state.lineWidth)}" stroke-linecap="${this.state.lineCap}"${dash}/>`,
    )
  }
  fillRect(x: number, y: number, w: number, h: number) {
    this.beginPath()
    this.rect(x, y, w, h)
    this.fill()
  }
  measureText(text: string) {
    this.measure.font = this.state.font
    this.measure.letterSpacing = this.state.letterSpacing
    this.measure.fontKerning = 'none'
    return this.measure.measureText(text)
  }
  fillText(text: string, x: number, y: number) {
    const [, size = '10', family = 'sans-serif'] = /(\d+(?:\.\d+)?)px\s+(.+)$/.exec(this.state.font) ?? []
    const weight = /^(\d{3})\s/.exec(this.state.font)?.[1] ?? '400'
    const m = this.state.matrix
    const spacing = Number.parseFloat(this.state.letterSpacing) || 0
    this.emit(
      `<text transform="matrix(${m.map(n).join(' ')})" x="${n(x)}" y="${n(y)}" font-family="${esc(family)}" font-weight="${weight}" font-size="${n(Number(size))}"${
        spacing ? ` letter-spacing="${n(spacing)}"` : ''
      } fill="${this.state.fillStyle}" font-kerning="none" xml:space="preserve">${esc(text)}</text>`,
    )
  }
  drawImage(
    image: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ) {
    const key = `${sx},${sy}`
    let id = this.images.get(image)
    if (!id) {
      id = `i${this.ids++}`
      this.images.set(image, id)
    }
    const symbol = `${id}-${key.replace(',', '-')}`
    if (!this.defs.some((d) => d.includes(`id="${symbol}"`))) {
      this.defs.push(
        `<image id="${symbol}" width="${sw}" height="${sh}" href="${this.imageUrl(image, sx, sy, sw, sh)}"/>`,
      )
    }
    const [x, y] = this.point(dx, dy)
    this.emit(`<use href="#${symbol}" transform="translate(${n(x)} ${n(y)}) scale(${n(dw / sw)} ${n(dh / sh)})"/>`)
  }

  /** The finished SVG document. */
  toString(fonts: SvgFont[] = []): string {
    const faces = fonts
      .map((f) => `@font-face{font-family:"${f.family}";font-weight:${f.weight};src:url(${f.url}) format("woff2")}`)
      .join('')
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">`,
      `<defs>${faces ? `<style>${faces}</style>` : ''}${this.defs.join('')}</defs>`,
      ...this.parts,
      '</svg>',
    ].join('\n')
  }
}

/** Typed as the renderer's context. */
export function asCtx(svg: SvgContext): Ctx {
  return svg as unknown as Ctx
}

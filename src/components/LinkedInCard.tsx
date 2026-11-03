import * as stylex from '@stylexjs/stylex'
import { Fragment, useId, useState, type ReactNode } from 'react'
import { liHeadline, type LiImage } from '~/content/linkedinV11Li'
import { paragraphsOf } from '~/lib/linkedinCopy'
import { breakpoints, colors } from '~/styles/tokens.stylex'

/**
 * A copy of a LinkedIn feed card, on desktop (555 px feed column) or in the phone app (390 px), folded at "…more"
 * until opened. Sizes, colours and the image grid follow the sources in cardNotes; anything marked UNVERIFIED there
 * is a best match, not a measured LinkedIn value. Used by the private drafts board.
 */

export type Device = 'desktop' | 'mobile'

/** Width over height, held between LinkedIn's limits of 3:1 and 4:5 (taller images are centre-cropped to 4:5). */
const ratio = (img: LiImage) => Math.min(3, Math.max(0.8, img.w / img.h))

/** The page CSP blocks inline styles, so ratios snap to the nearest of a fixed set (exact for 4:5 and 1:1). */
const steps = [0.8, 1, 1.3333, 1.91, 3] as const
const snap = (r: number) => steps.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a))
const arStyle = (r: number) => ({ 0.8: s.ar08, 1: s.ar1, 1.3333: s.ar133, 1.91: s.ar191, 3: s.ar3 })[snap(r)]
const cellStyle = (r: number) =>
  ({
    0.8: [s.grow08, s.ar08],
    1: [s.grow1, s.ar1],
    1.3333: [s.grow133, s.ar133],
    1.91: [s.grow191, s.ar191],
    3: [s.grow3, s.ar3],
  })[snap(r)]
/** Left column layout: the box ratio is 1.5 x the first image's ratio (it fills 2/3 of the width). */
const leftBox = (r: number) => (snap(r) === 0.8 ? s.ar12 : s.ar15)
const leftRows = (k: number) => (k <= 1 ? s.leftRows1 : k === 2 ? s.leftRows2 : s.leftRows3)

function Tile({ img, extra, index }: { img: LiImage; extra?: number; index: number }) {
  return (
    <div {...stylex.props(s.tile)} data-li-tile={index + 1}>
      <img
        src={img.src}
        width={img.w}
        height={img.h}
        alt={img.alt}
        loading="eager"
        decoding="async"
        {...stylex.props(s.tileImg)}
      />
      {extra ? <span {...stylex.props(s.plus)}>+{extra}</span> : null}
    </div>
  )
}

/** LinkedIn Help a527229: 2 images side by side; 3+ led by the first image, left column if it is portrait or square. */
function ImageGrid({ images }: { images: LiImage[] }) {
  const [first, ...rest] = images
  if (!first) return null
  if (images.length === 1)
    return (
      <div {...stylex.props(s.media, arStyle(ratio(first)))} data-li-grid="1">
        <Tile img={first} index={0} />
      </div>
    )
  if (images.length === 2)
    return (
      <div {...stylex.props(s.media, s.row)} data-li-grid="2">
        {images.map((img, i) => (
          <div key={img.key} {...stylex.props(cellStyle(ratio(img)))}>
            <Tile img={img} index={i} />
          </div>
        ))}
      </div>
    )
  const shown = rest.slice(0, 3)
  const hidden = rest.length - shown.length
  const r1 = ratio(first)
  if (r1 <= 4 / 3)
    return (
      <div
        {...stylex.props(s.media, s.leftGrid, leftRows(shown.length), leftBox(r1))}
        data-li-grid={`${images.length}-left`}
      >
        <div {...stylex.props(s.leftCell)}>
          <Tile img={first} index={0} />
        </div>
        {shown.map((img, i) => (
          <Tile
            key={img.key}
            img={img}
            index={i + 1}
            extra={i === shown.length - 1 && hidden > 0 ? hidden : undefined}
          />
        ))}
      </div>
    )
  return (
    <div {...stylex.props(s.media, s.topGrid)} data-li-grid={`${images.length}-top`}>
      <div {...stylex.props(arStyle(r1))}>
        <Tile img={first} index={0} />
      </div>
      <div {...stylex.props(s.row, s.ar3)}>
        {shown.map((img, i) => (
          <div key={img.key} {...stylex.props(cellStyle(1))}>
            <Tile img={img} index={i + 1} extra={i === shown.length - 1 && hidden > 0 ? hidden : undefined} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** One paragraph of post text as LinkedIn shows it: line breaks kept (pre-wrap), links blue. */
function LiText({ text }: { text: string }) {
  const parts: ReactNode[] = []
  const re = /https?:\/\/\S+/g
  let last = 0
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0
    if (at > last) parts.push(text.slice(last, at))
    parts.push(
      <span key={at} {...stylex.props(s.link)}>
        {m[0]}
      </span>,
    )
    last = at + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return <>{parts}</>
}

const Globe = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" {...stylex.props(s.globe)}>
    <path
      fill="currentColor"
      d="M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7zM3 8a5 5 0 0 1 1-3l.55.55A1.5 1.5 0 0 1 5 6.62v1.07a.75.75 0 0 0 .22.53l.56.56a.75.75 0 0 0 .53.22H7v.69a.75.75 0 0 0 .22.53l.56.56a.75.75 0 0 1 .22.53V13a5 5 0 0 1-5-5zm6.24 4.83l2-2.46a.75.75 0 0 0 .09-.82l-.58-1.16A.76.76 0 0 0 10 8H7v-.19a.51.51 0 0 1 .28-.45l.38-.19a.74.74 0 0 1 .68 0L9 7.5l.38-.7a1 1 0 0 0 .12-.48v-.85a.78.78 0 0 1 .21-.53l1.07-1.09a5 5 0 0 1-1.54 9z"
    />
  </svg>
)

const icons: Record<string, string> = {
  Like: 'M19.46 11l-3.91-3.91a7 7 0 01-1.69-2.74l-.49-1.47A2.76 2.76 0 0010.76 1 2.75 2.75 0 008 3.74v1.12a9.19 9.19 0 00.46 2.85L8.89 9H4.12A2.12 2.12 0 002 11.12a2.16 2.16 0 00.92 1.76A2.11 2.11 0 002 14.62a2.14 2.14 0 001.28 2 2 2 0 00-.28 1 2.12 2.12 0 002 2.12v.14A2.12 2.12 0 007.12 22h7.49a8.08 8.08 0 003.58-.84l.31-.16H21V11zM19 19h-1l-.73.37a6.14 6.14 0 01-2.69.63H7.72a1 1 0 01-1-.72l-.25-.87-.85-.41A1 1 0 015 17l.17-1-.76-.74A1 1 0 014.27 14l.66-1.09-.73-1.1a.49.49 0 01.08-.7.48.48 0 01.34-.11h7.05l-1.31-3.92A7 7 0 0110 4.86V3.75a.77.77 0 01.75-.75.75.75 0 01.71.51L12 5a9 9 0 002.13 3.5l4.5 4.5H19z',
  Comment:
    'M7 9h10v1H7zm0 4h7v-1H7zm16-2a6.78 6.78 0 01-2.84 5.61L12 22v-4H8A7 7 0 018 4h8a7 7 0 017 7zm-2 0a5 5 0 00-5-5H8a5 5 0 000 10h6v2.28L19 15a4.79 4.79 0 002-4z',
  Repost:
    'M13.96 5H6c-.55 0-1 .45-1 1v10H3V6c0-1.66 1.34-3 3-3h7.96L12 0h2.37L17 4l-2.63 4H12l1.96-3zm5.04 3v10c0 .55-.45 1-1 1h-7.96L12 16H9.63L7 20l2.63 4H12l-1.96-3H18c1.66 0 3-1.34 3-3V8h-2z',
  Send: 'M21 3L0 10l7.66 4.26L16 8l-6.26 8.34L14 24l7-21z',
}

function ActionBar({ device }: { device: Device }) {
  return (
    <div {...stylex.props(s.actions)} data-li-actions>
      {['Like', 'Comment', 'Repost', 'Send'].map((label) => (
        <span key={label} {...stylex.props(s.action, device === 'mobile' && s.actionMobile)}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" {...stylex.props(s.actionIcon)}>
            <path fill="currentColor" d={icons[label]} />
          </svg>
          <span {...stylex.props(device === 'mobile' ? s.actionLabelMobile : s.actionLabel)}>{label}</span>
        </span>
      ))}
    </div>
  )
}

/** What a feed card needs. */
export interface CardPost {
  id: string
  text: string
  images: LiImage[]
}

export function FeedCard({ draft, device }: { draft: CardPost; device: Device }) {
  // A one line text (such as a placeholder) has nothing to fold.
  const short = !draft.text.includes('\n') && draft.text.length <= 120
  const [open, setOpen] = useState(short)
  const textId = useId()
  return (
    <article
      {...stylex.props(s.card, device === 'mobile' ? s.cardMobile : s.cardDesktop)}
      data-li-card={`${draft.id}-${device}`}
      data-li-open={open ? 'true' : 'false'}
    >
      <header {...stylex.props(s.actor)}>
        <img
          src="/assets/img/preview/ashish-kharche-x-avatar.webp"
          width={160}
          height={160}
          alt=""
          decoding="async"
          {...stylex.props(s.avatar)}
        />
        <div {...stylex.props(s.actorText)}>
          <p {...stylex.props(s.nameLine)}>
            <span {...stylex.props(s.name)}>Ashish Kharche</span>
            <span {...stylex.props(s.degree)}> • 1st</span>
          </p>
          <p {...stylex.props(s.headline)}>{liHeadline}</p>
          <p {...stylex.props(s.time)}>
            1h • <Globe />
          </p>
        </div>
        <span aria-hidden="true" {...stylex.props(s.controls)}>
          ⋯{device === 'desktop' ? '\u2002✕' : ''}
        </span>
      </header>
      <div {...stylex.props(s.textWrap)}>
        <div id={textId} data-li-text={`${draft.id}-${device}`} {...stylex.props(s.text, !open && s.folded)}>
          {paragraphsOf(draft.text).map((lines, i) => (
            <Fragment key={i}>
              {/* An empty paragraph between paragraphs, as LinkedIn's composer stores a blank line, so text selected
                  by hand keeps the gap when pasted there. */}
              {i > 0 ? (
                <p {...stylex.props(s.para)}>
                  <br />
                </p>
              ) : null}
              <p {...stylex.props(s.para)}>
                <LiText text={lines.join('\n')} />
              </p>
            </Fragment>
          ))}
        </div>
        {!open && (
          <button
            type="button"
            aria-expanded={false}
            aria-controls={textId}
            onClick={() => setOpen(true)}
            {...stylex.props(s.more)}
          >
            …more
          </button>
        )}
      </div>
      <ImageGrid images={draft.images} />
      <ActionBar device={device} />
    </article>
  )
}

/** The card on a feed background, as LinkedIn shows it. */
export function CardFrame({ label, device, children }: { label: string; device: Device; children: ReactNode }) {
  return (
    <figure {...stylex.props(s.frame, device === 'mobile' ? s.frameMobile : s.frameDesktop)}>
      <figcaption {...stylex.props(s.frameLabel)}>{label}</figcaption>
      <div {...stylex.props(s.feedBg, device === 'mobile' && s.feedBgMobile)}>{children}</div>
    </figure>
  )
}

/** Where each tile sits in the grid layouts above. */
function position(i: number, count: number) {
  if (count === 1) return 'the only image'
  if (count === 2) return i === 0 ? 'shown first, on the left' : 'shown last, on the right'
  if (i === 0) return 'shown first, large on the left'
  if (i === count - 1) return count > 4 ? 'shown last, behind the +N tile' : 'shown last, bottom right'
  return i === 1 ? 'top right' : 'right column'
}

export function ImageOrder({ id, images }: { id: string; images: LiImage[] }) {
  return (
    <ol {...stylex.props(s.list)} data-li-order={id}>
      {images.map((img, i) => (
        <li key={img.key} data-li-order-item={i + 1}>
          <strong>
            Image {i + 1}
            {` (${position(i, images.length)})`}:
          </strong>{' '}
          {img.name} (
          {img.w > img.h
            ? 'landscape'
            : img.w === img.h
              ? 'square 1:1'
              : img.h / img.w > 1.25
                ? `tall ${img.w}x${img.h}`
                : 'portrait 4:5'}
          )
          <br />
          <span {...stylex.props(s.path)}>Upload: {img.upload}</span>
          {img.note ? (
            <>
              <br />
              <span {...stylex.props(s.note)}>{img.note}</span>
            </>
          ) : null}
        </li>
      ))}
    </ol>
  )
}

export const cardNotes: { text: string; src?: { label: string; href: string }[] }[] = [
  {
    text: 'Fold: organic posts show a 3 line preview before “…more”, on desktop and on phones; phones fit fewer characters per line (about 140 against 210 on desktop). Blank lines take up preview lines. If line 2 is blank and line 3 is not, all 3 lines show, which is the case for D1, D2 and D3.',
    src: [
      {
        label: 'Espirian, LinkedIn see more breakpoints',
        href: 'https://espirian.co.uk/linkedin-see-more-breakpoints/',
      },
      {
        label: 'Content Drifter, measured 7 Aug 2026',
        href: 'https://www.contentdrifter.com/tools/linkedin-post-preview',
      },
    ],
  },
  {
    text: 'UNVERIFIED: on a phone, the first line of D1 wraps onto two lines, so the third preview line is the blank line. Espirian says desktop then shows only a 2 line preview; I found no source for the phone app. The phone cards here keep 3 lines with “…more” on the blank line.',
    src: [{ label: 'Espirian', href: 'https://espirian.co.uk/linkedin-see-more-breakpoints/' }],
  },
  {
    text: 'Text style: system font stack, 14 px, 21 px line height, weight 400, rgba(0,0,0,0.9), line breaks kept (pre-wrap). Measured by a third party on public post pages, not published by LinkedIn.',
    src: [
      {
        label: 'Sellable, LinkedIn preview rendering',
        href: 'https://cdn.jsdelivr.net/npm/@sellable/mcp@0.1.901/skills/create-post/references/linkedin-preview-rendering.md',
      },
    ],
  },
  {
    text: 'Images: aspect ratio 3:1 to 4:5, anything taller is centre-cropped to 4:5. Multi-image posts put more emphasis on the first image. Two images show side by side, keeping their ratios. With three or more, a portrait or square first image goes in the left column and the rest stack on the right; a landscape first image goes on top with the rest in a row below. Up to 20 images. A post can have a link preview or images, not both.',
    src: [
      {
        label: 'LinkedIn Help, Share photos on LinkedIn (a527229)',
        href: 'https://www.linkedin.com/help/linkedin/answer/a527229',
      },
    ],
  },
  {
    text: 'Five or more images show four tiles with a “+N” count on the last one (third-party tools; LinkedIn Help does not say). Some tools show four images as a 2 by 2 grid, which conflicts with LinkedIn Help’s left column rule. WD batch 2, post 4 has five images, so its card shows four tiles with +1 on the last.',
    src: [
      { label: 'Influentae post preview', href: 'https://influentae.com/tools/linkedin-post-preview' },
      {
        label: 'Ordinal, multiple images',
        href: 'https://www.tryordinal.com/blog/how-to-post-multiple-images-on-linkedin',
      },
    ],
  },
  {
    text: 'Links: LinkedIn shortens any link longer than 26 characters once you click Post (lnkd.in). D3 carries links in the text; the cards show them in full because the short codes do not exist yet. Because D3 has images, no link preview card shows. D1 and D2 have no links in the text.',
    src: [
      {
        label: 'LinkedIn Help, Short URLs in shared posts (a521889)',
        href: 'https://www.linkedin.com/help/linkedin/answer/a521889/short-urls-in-shared-posts',
      },
    ],
  },
  {
    text: 'Link preview card (for a link post with no images): built from the page’s og:title and og:image; image at least 1200 x 627 (1.91:1); images under 401 px wide show as a small thumbnail.',
    src: [
      {
        label: 'LinkedIn Help, Make your website shareable (a521928)',
        href: 'https://www.linkedin.com/help/linkedin/answer/a521928',
      },
    ],
  },
  {
    text: 'Documents (the planned D3 deck): one PDF, PPT or DOC file, up to 100 MB and 300 pages, shown as swipeable pages with a title; viewers can download it as a PDF. A post holds either a document or images.',
    src: [
      {
        label: 'LinkedIn Help, Upload and share documents (a518909)',
        href: 'https://www.linkedin.com/help/linkedin/answer/a518909',
      },
    ],
  },
  {
    text: 'UNVERIFIED (my best match, no source found): the exact column split of the three image grid (2/3 and 1/3 here), the 2 px gap between tiles, card padding (16 px), avatar size (48 px), the “1h • globe” line, the icons and labels of the Like, Comment, Repost, Send bar, the headline cut to one line, the phone card layout, and the desktop text width (sources give 526 to 582 px; this card uses 523 px). The desktop column width of 555 px comes from preview tools, not from LinkedIn.',
    src: [{ label: 'Ziplined post preview (555 px column)', href: 'https://ziplined.io/tools/linkedin-post-preview' }],
  },
]

export function CardNotes() {
  return (
    <ol {...stylex.props(s.list)} data-card-notes>
      {cardNotes.map((note, i) => (
        <li key={i}>
          {note.text}
          {note.src?.map((src) => (
            <span key={src.href}>
              {' '}
              <a href={src.href} rel="noreferrer" {...stylex.props(s.srcLink)}>
                {src.label}
              </a>
              .
            </span>
          ))}
        </li>
      ))}
    </ol>
  )
}

const s = stylex.create({
  frame: { margin: 0, minWidth: 0, maxWidth: '100%' },
  frameDesktop: { width: '587px' },
  frameMobile: {
    width: { default: '390px', [breakpoints.phone]: '100vw' },
    maxWidth: { default: '100%', [breakpoints.phone]: 'none' },
    marginLeft: { default: 0, [breakpoints.phone]: 'calc(50% - 50vw)' },
    flexShrink: { default: 1, [breakpoints.phone]: 0 },
  },
  frameLabel: {
    fontSize: '0.8rem',
    color: colors.muted,
    marginBottom: '0.35rem',
    paddingInline: { default: 0, [breakpoints.phone]: '0.75rem' },
  },
  feedBg: {
    backgroundColor: '#f4f2ee',
    paddingBlock: { default: '16px', [breakpoints.phone]: '8px' },
    paddingInline: { default: '16px', [breakpoints.phone]: '8px' },
    borderRadius: '6px',
    colorScheme: 'light',
  },
  feedBgMobile: {
    paddingBlock: { default: '8px', [breakpoints.phone]: '8px' },
    paddingInline: { default: 0, [breakpoints.phone]: 0 },
    borderRadius: { default: '6px', [breakpoints.phone]: 0 },
  },
  card: {
    backgroundColor: '#ffffff',
    color: 'rgba(0, 0, 0, 0.9)',
    fontFamily:
      '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Fira Sans", Ubuntu, Oxygen, "Oxygen Sans", Cantarell, "Droid Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Lucida Grande", Helvetica, Arial, sans-serif',
    fontSize: '14px',
    lineHeight: '21px',
    overflow: 'hidden',
    textAlign: 'left',
  },
  cardDesktop: {
    width: '555px',
    maxWidth: '100%',
    borderRadius: '8px',
    boxShadow: '0 0 0 1px rgba(140, 140, 140, 0.2)',
  },
  cardMobile: { width: '390px', maxWidth: '100%' },
  actor: {
    display: 'flex',
    gap: '8px',
    paddingTop: '12px',
    paddingRight: '16px',
    paddingBottom: 0,
    paddingLeft: '16px',
    alignItems: 'flex-start',
  },
  avatar: { width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0, objectFit: 'cover' },
  actorText: { minWidth: 0, flexGrow: 1 },
  nameLine: {
    margin: 0,
    fontSize: '14px',
    lineHeight: '20px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  name: { fontWeight: 600, color: 'rgba(0, 0, 0, 0.9)' },
  degree: { color: 'rgba(0, 0, 0, 0.6)', fontWeight: 400 },
  headline: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '16px',
    color: 'rgba(0, 0, 0, 0.6)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  time: {
    margin: 0,
    fontSize: '12px',
    lineHeight: '16px',
    color: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  globe: { width: '16px', height: '16px' },
  controls: { color: 'rgba(0, 0, 0, 0.6)', fontSize: '18px', lineHeight: '20px', flexShrink: 0, letterSpacing: '2px' },
  textWrap: { position: 'relative', marginTop: '8px', marginRight: '16px', marginBottom: 0, marginLeft: '16px' },
  text: { whiteSpace: 'pre-wrap', overflowWrap: 'break-word', color: 'rgba(0, 0, 0, 0.9)' },
  para: { margin: 0, whiteSpace: 'pre-wrap' },
  folded: { maxHeight: '63px', overflow: 'hidden' },
  more: {
    position: 'absolute',
    zIndex: 1,
    right: 0,
    bottom: 0,
    borderWidth: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: '24px',
    margin: 0,
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: '21px',
    color: { default: 'rgba(0, 0, 0, 0.6)', ':hover': '#0a66c2' },
    textDecoration: { default: 'none', ':hover': 'underline' },
    cursor: 'pointer',
    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0), #fff 18px)',
    backgroundColor: 'transparent',
  },
  link: { color: '#0a66c2', fontWeight: 600 },
  media: { marginTop: '8px', width: '100%', overflow: 'hidden' },
  row: { display: 'flex', gap: '2px', alignItems: 'stretch' },
  leftGrid: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '2px' },
  leftRows1: { gridTemplateRows: 'minmax(0, 1fr)' },
  leftRows2: { gridTemplateRows: 'repeat(2, minmax(0, 1fr))' },
  leftRows3: { gridTemplateRows: 'repeat(3, minmax(0, 1fr))' },
  ar08: { aspectRatio: '0.8' },
  ar1: { aspectRatio: '1' },
  ar133: { aspectRatio: '1.3333' },
  ar12: { aspectRatio: '1.2' },
  ar15: { aspectRatio: '1.5' },
  ar191: { aspectRatio: '1.91' },
  ar3: { aspectRatio: '3' },
  grow08: { flexGrow: 0.8, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  grow1: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  grow133: { flexGrow: 1.3333, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  grow191: { flexGrow: 1.91, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  grow3: { flexGrow: 3, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  leftCell: { gridRowStart: 1, gridRowEnd: -1, minHeight: 0 },
  topGrid: { display: 'grid', gap: '2px' },
  tile: {
    position: 'relative',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    backgroundColor: '#e9e5df',
    minHeight: 0,
  },
  tileImg: { display: 'block', width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' },
  plus: {
    position: 'absolute',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: '24px',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    marginRight: '12px',
    marginBottom: 0,
    marginLeft: '12px',
    paddingTop: '4px',
    paddingRight: 0,
    paddingBottom: '4px',
    paddingLeft: 0,
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: 'rgba(140, 140, 140, 0.2)',
  },
  action: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    paddingTop: '10px',
    paddingRight: '8px',
    paddingBottom: '10px',
    paddingLeft: '8px',
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: '14px',
    fontWeight: 600,
    lineHeight: '20px',
  },
  actionMobile: {
    flexDirection: 'column',
    gap: '2px',
    paddingTop: '6px',
    paddingRight: '8px',
    paddingBottom: '6px',
    paddingLeft: '8px',
    flexGrow: 1,
  },
  actionIcon: { width: '24px', height: '24px', flexShrink: 0 },
  actionLabel: {},
  actionLabelMobile: { fontSize: '12px', lineHeight: '16px', fontWeight: 600 },
  list: {
    margin: 0,
    paddingLeft: '1.3rem',
    display: 'grid',
    gap: '0.55rem',
    lineHeight: 1.5,
    fontSize: '0.92rem',
    maxWidth: '50rem',
  },
  path: { fontSize: '0.8rem', color: colors.muted, wordBreak: 'break-all' },
  note: { fontSize: '0.82rem', color: colors.muted },
  srcLink: { color: colors.text, textDecoration: 'underline' },
})

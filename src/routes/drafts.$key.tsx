import * as stylex from '@stylexjs/stylex'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { NotFound } from '~/components/NotFound'
import { CardFrame, CardNotes, FeedCard, ImageOrder, type Device } from '~/components/LinkedInCard'
import { draftPosts, draftsSlug, lengths, mediaTypes, statuses, topics, type DraftPost } from '~/content/drafts'
import {
  arrange,
  counts,
  filtersToSearch,
  groupKeys,
  groups,
  parseFilters,
  type Filters,
  type GroupKey,
} from '~/lib/drafts'
import { copyForLinkedIn } from '~/lib/linkedinCopy'
import { pageMeta } from '~/lib/seo'
import { breakpoints, colors, fonts, type, weights } from '~/styles/tokens.stylex'
import { ui } from '~/styles/ui'

/**
 * Private drafts board: one current version of each LinkedIn draft, with filters, sorting and an index.
 * The route takes any key so the client route list never holds the real one; only draftsSlug (in the
 * component's own chunk) shows the board, and only that path is prerendered (vite.config.ts).
 * Not linked from any page, not in the sitemap, the feed or robots.txt, no canonical link and no og:url.
 * Search engines are told not to index it here and with an X-Robots-Tag header (vercel.json).
 * The filters live in the query string (?topic=coach&sort=topic), so a filtered view can be linked;
 * the hash stays free for the post anchors.
 */
export const Route = createFileRoute('/drafts/$key')({
  head: () => ({
    meta: [
      ...pageMeta({
        // og:url is dropped below, so this path is not printed anywhere.
        path: '/drafts/',
        title: 'Drafts',
        description: 'Private drafts. Not published.',
      }).filter((tag) => !('property' in tag && tag.property === 'og:url')),
      { name: 'robots', content: 'noindex, nofollow, noarchive' },
    ],
    links: [],
  }),
  component: DraftsBoard,
})

const CHANGE = 'drafts-filters'

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(CHANGE, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(CHANGE, onChange)
  }
}

function setFilters(f: Filters) {
  window.history.replaceState(null, '', window.location.pathname + filtersToSearch(f))
  window.dispatchEvent(new Event(CHANGE))
}

function DraftsBoard() {
  const { key } = Route.useParams()
  return key === draftsSlug ? <Board /> : <NotFound />
}

function Board() {
  const search = useSyncExternalStore(
    subscribe,
    () => window.location.search,
    () => '',
  )
  const f = useMemo(() => parseFilters(search), [search])
  const sections = arrange(draftPosts, f)
  const shown = sections.reduce((n, s) => n + s.posts.length, 0)
  const searchId = useId()
  const sortId = useId()
  const filtered = groupKeys.some((k) => f[k].length > 0) || f.q !== ''

  const toggle = (key: GroupKey, value: string) => {
    const list = f[key] as string[]
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    setFilters({ ...f, [key]: next })
  }

  return (
    <main id="main" {...stylex.props(styles.main)}>
      <div {...stylex.props(ui.wrap, styles.page)}>
        <header>
          <h1 {...stylex.props(styles.title)}>LinkedIn drafts</h1>
          <p {...stylex.props(styles.lead)}>
            Private. Not linked from the site, not in the sitemap, and not indexed. One current version of each draft;
            earlier versions are in git history. Nothing here is posted or scheduled, and each post still needs
            Ashish&apos;s OK on its exact text.
          </p>
        </header>

        <section aria-labelledby="drafts-filters" {...stylex.props(styles.toolbar)}>
          <h2 id="drafts-filters" {...stylex.props(ui.visuallyHidden)}>
            Filter and sort
          </h2>
          <div {...stylex.props(styles.row)}>
            <div {...stylex.props(styles.field, styles.searchField)}>
              <label htmlFor={searchId} {...stylex.props(styles.label)}>
                Search
              </label>
              <input
                id={searchId}
                type="search"
                value={f.q}
                placeholder="Words in the title, text or sources"
                onChange={(e) => setFilters({ ...f, q: e.target.value })}
                {...stylex.props(styles.input, ui.focusRing)}
              />
            </div>
            <div {...stylex.props(styles.field)}>
              <label htmlFor={sortId} {...stylex.props(styles.label)}>
                Sort
              </label>
              <select
                id={sortId}
                value={f.sort}
                onChange={(e) => setFilters({ ...f, sort: e.target.value === 'topic' ? 'topic' : 'newest' })}
                {...stylex.props(styles.input, ui.focusRing)}
              >
                <option value="newest">Newest first</option>
                <option value="topic">By topic</option>
              </select>
            </div>
            <fieldset {...stylex.props(styles.fieldset)}>
              <legend {...stylex.props(styles.label)}>Card</legend>
              <div {...stylex.props(styles.chips)}>
                {(['desktop', 'mobile'] as const).map((d) => (
                  <Chip key={d} pressed={f.view === d} onClick={() => setFilters({ ...f, view: d })}>
                    {d === 'desktop' ? 'Desktop' : 'Phone'}
                  </Chip>
                ))}
              </div>
            </fieldset>
          </div>
          {groupKeys.map((key) => (
            <fieldset key={key} {...stylex.props(styles.fieldset)} data-filter-group={key}>
              <legend {...stylex.props(styles.label)}>{groups[key].label}</legend>
              <div {...stylex.props(styles.chips)}>
                {groups[key].order.map((value) => (
                  <Chip
                    key={value}
                    pressed={(f[key] as string[]).includes(value)}
                    onClick={() => toggle(key, value)}
                    data={`${key}:${value}`}
                  >
                    {(groups[key].options as Record<string, string>)[value]}{' '}
                    <span {...stylex.props(styles.count)}>{counts[key][value]}</span>
                  </Chip>
                ))}
              </div>
            </fieldset>
          ))}
          <div {...stylex.props(styles.row)}>
            <p role="status" {...stylex.props(styles.status)} data-drafts-shown={shown}>
              Showing {shown} of {draftPosts.length} posts.
            </p>
            {filtered ? (
              <button
                type="button"
                onClick={() => setFilters({ ...f, topic: [], length: [], media: [], status: [], q: '' })}
                {...stylex.props(styles.clear, ui.focusRing)}
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </section>

        <nav aria-label="Posts on this page" {...stylex.props(styles.index)}>
          {sections.length === 0 ? (
            <p {...stylex.props(styles.status)}>No posts match these filters.</p>
          ) : (
            sections.map((section) => (
              <div key={section.heading}>
                <p {...stylex.props(styles.indexHead)}>{section.heading}</p>
                <ol {...stylex.props(styles.indexList)}>
                  {section.posts.map((p) => (
                    <li key={p.id}>
                      <a href={`#${p.id}`} {...stylex.props(ui.link, styles.indexLink)}>
                        {p.title}
                      </a>{' '}
                      <span {...stylex.props(styles.count)}>
                        {p.status === 'waiting'
                          ? 'waiting for media, '
                          : p.status === 'data-check'
                            ? 'data check, '
                            : ''}
                        {p.chars.toLocaleString('en-GB')} chars
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))
          )}
        </nav>

        {sections.map((section) => (
          <section key={section.heading} aria-labelledby={`h-${slug(section.heading)}`} {...stylex.props(styles.list)}>
            <h2 id={`h-${slug(section.heading)}`} {...stylex.props(styles.h2)}>
              {section.heading}
            </h2>
            {section.posts.map((p) => (
              <PostCard key={`${p.id}-${f.view}`} post={p} device={f.view} />
            ))}
          </section>
        ))}

        <details {...stylex.props(styles.details)}>
          <summary {...stylex.props(styles.summary, ui.focusRing)}>How the LinkedIn cards are drawn</summary>
          <div {...stylex.props(styles.detailsBody)}>
            <CardNotes />
          </div>
        </details>
      </div>
    </main>
  )
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function Chip({
  pressed,
  onClick,
  children,
  data,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  data?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      data-chip={data}
      {...stylex.props(styles.chip, pressed && styles.chipOn, ui.focusRing)}
    >
      {children}
    </button>
  )
}

function PostCard({ post, device }: { post: DraftPost; device: Device }) {
  return (
    <article id={post.id} aria-labelledby={`${post.id}-title`} data-draft={post.id} {...stylex.props(styles.post)}>
      <header {...stylex.props(styles.postHead)}>
        <h3 id={`${post.id}-title`} {...stylex.props(styles.h3)}>
          {post.title}
        </h3>
        <p {...stylex.props(styles.meta)}>
          {post.series} · {post.version} · updated {post.updatedLabel}
        </p>
        <ul aria-label="Tags" {...stylex.props(styles.tags)}>
          <li {...stylex.props(styles.tag, post.status !== 'ready' && styles.tagWaiting)}>{statuses[post.status]}</li>
          <li {...stylex.props(styles.tag)}>
            {lengths[post.length].split(' (')[0]}, {post.chars.toLocaleString('en-GB')} characters
          </li>
          {post.media.map((m) => (
            <li key={m} {...stylex.props(styles.tag)}>
              {mediaTypes[m]}
            </li>
          ))}
          {post.topics.map((t) => (
            <li key={t} {...stylex.props(styles.tag)}>
              {topics[t]}
            </li>
          ))}
        </ul>
      </header>
      <CardFrame label={device === 'mobile' ? 'Phone app' : 'Desktop feed'} device={device}>
        <FeedCard draft={post} device={device} />
      </CardFrame>
      <ImageDownloads post={post} />
      {post.textNote ? (
        <p {...stylex.props(styles.meta)}>{post.textNote} No copy button: the text on this page is not the post.</p>
      ) : (
        <CopyButton post={post} />
      )}
      <DataNotes post={post} />
      <details {...stylex.props(styles.details)} data-review={post.id}>
        <summary {...stylex.props(styles.summary, ui.focusRing)}>Sources and review notes</summary>
        <div {...stylex.props(styles.detailsBody)}>
          {post.concept ? (
            <p>
              <strong>Concept:</strong> {post.concept}.
            </p>
          ) : null}
          {post.mediaNote ? (
            <p>
              <strong>Media:</strong> {post.mediaNote}
            </p>
          ) : null}
          {post.notes.length > 0 ? (
            <>
              <h4 {...stylex.props(styles.h4)}>Review notes</h4>
              <ul {...stylex.props(styles.ul)}>
                {post.notes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </>
          ) : null}
          {post.images.length > 0 ? (
            <>
              <h4 {...stylex.props(styles.h4)}>Images, in upload order</h4>
              <ImageOrder id={post.id} images={post.images} />
            </>
          ) : null}
          {post.firstComment ? (
            <p>
              <strong>Link for the first comment:</strong> {post.firstComment}
            </p>
          ) : null}
          <h4 {...stylex.props(styles.h4)}>{post.textNote ? 'Text (not shown)' : 'Exact text to paste'}</h4>
          <pre tabIndex={0} {...stylex.props(styles.paste, ui.focusRing)} data-paste={post.id}>
            {post.text}
          </pre>
          <h4 {...stylex.props(styles.h4)}>Sources (internal, not in the post)</h4>
          <ul {...stylex.props(styles.ul)}>
            {post.sources.map((src) => (
              <li key={src}>{src}</li>
            ))}
          </ul>
        </div>
      </details>
    </article>
  )
}

const noop = () => () => {}

/**
 * For the Data posts: how long the numbers stay current, what to check before posting, and the sources to post as
 * the first comment (never part of the post text or of Copy for LinkedIn).
 */
function DataNotes({ post }: { post: DraftPost }) {
  if (!post.freshUntil && !post.firstCommentSources && !post.leastSure?.length) return null
  return (
    <div {...stylex.props(styles.dataNotes)} data-data-notes={post.id}>
      {post.freshUntil ? (
        <p {...stylex.props(styles.dataLine)} data-fresh-until={post.id}>
          <strong>Fresh until:</strong> {post.freshUntil.replace(/^Fresh until /, '')}
        </p>
      ) : null}
      {post.leastSure?.length ? (
        <>
          <h4 {...stylex.props(styles.h4)}>Data check: least sure</h4>
          <ul {...stylex.props(styles.ul)} data-least-sure={post.id}>
            {post.leastSure.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </>
      ) : null}
      {post.firstCommentSources ? (
        <>
          <h4 {...stylex.props(styles.h4)}>First comment (sources)</h4>
          <pre tabIndex={0} {...stylex.props(styles.paste, ui.focusRing)} data-first-comment={post.id}>
            {post.firstCommentSources}
          </pre>
          <CopyButton post={post} text={post.firstCommentSources} label="Copy first comment" />
        </>
      ) : null}
    </div>
  )
}

/**
 * One full quality PNG download per image (the cards show smaller WebP copies), saved under a clean file name for
 * the LinkedIn upload. A caption, such as the goblet squat reference credit, shows here and never in the post text.
 */
function ImageDownloads({ post }: { post: DraftPost }) {
  if (post.images.length === 0) return null
  const many = post.images.length > 1
  return (
    <ul aria-label={`Full quality images: ${post.title}`} {...stylex.props(styles.downloads)} data-downloads={post.id}>
      {post.images.map((img, i) => (
        <li key={img.key} {...stylex.props(styles.download)}>
          <a
            href={img.png}
            download={img.pngName}
            data-download-png={img.pngName}
            {...stylex.props(styles.downloadLink, ui.focusRing)}
          >
            Download image{many ? ` ${i + 1}` : ''} (PNG)
            <span {...stylex.props(ui.visuallyHidden)}>: {post.title}</span>
          </a>{' '}
          <span {...stylex.props(styles.downloadMeta)}>
            {img.w} x {img.h}, {img.pngName}
          </span>
          {img.caption ? (
            <span {...stylex.props(styles.caption)} data-caption={img.pngName}>
              {img.caption}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

/**
 * Copies the post's canonical text (post.text, credit lines included, review notes left out) in the form LinkedIn's
 * composer keeps blank lines from (see src/lib/linkedinCopy.ts). Shown once the page has hydrated.
 */
function CopyButton({
  post,
  text = post.text,
  label = 'Copy for LinkedIn',
}: {
  post: DraftPost
  text?: string
  label?: string
}) {
  const canCopy = useSyncExternalStore(
    noop,
    () => typeof navigator !== 'undefined' && !!navigator.clipboard,
    () => false,
  )
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    clearTimeout(timer.current)
    let next: string
    try {
      await copyForLinkedIn(text)
      next = 'Copied'
    } catch {
      next = 'Could not copy. Open “Sources and review notes” and select the text by hand.'
    }
    setMessage(next)
    timer.current = setTimeout(() => setMessage(''), 2000)
  }

  return (
    <div {...stylex.props(styles.copyRow)}>
      {canCopy ? (
        <button
          type="button"
          onClick={copy}
          {...(label === 'Copy for LinkedIn' ? { 'data-copy-linkedin': post.id } : { 'data-copy-comment': post.id })}
          {...stylex.props(styles.copyButton, ui.focusRing)}
        >
          {label}
          <span {...stylex.props(ui.visuallyHidden)}>: {post.title}</span>
        </button>
      ) : null}
      <span
        aria-live="polite"
        {...(label === 'Copy for LinkedIn' ? { 'data-copy-status': post.id } : { 'data-copy-comment-status': post.id })}
        {...stylex.props(styles.copyStatus)}
      >
        {message}
      </span>
    </div>
  )
}

const styles = stylex.create({
  copyRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', minHeight: '2.5rem' },
  copyButton: {
    fontFamily: fonts.sans,
    fontSize: type.meta,
    fontWeight: weights.medium,
    color: colors.bg,
    backgroundColor: colors.text,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.text,
    borderRadius: '999px',
    paddingBlock: '0.45rem',
    paddingInline: '1rem',
    minHeight: '2.5rem',
    cursor: 'pointer',
    opacity: { default: 1, ':hover': 0.88 },
  },
  downloads: { display: 'grid', gap: '0.35rem', margin: 0, padding: 0, listStyle: 'none', maxWidth: '50rem' },
  download: { fontSize: type.meta, lineHeight: 1.5 },
  downloadLink: {
    color: colors.text,
    fontWeight: weights.medium,
    textDecorationLine: 'underline',
    textUnderlineOffset: '3px',
  },
  downloadMeta: { color: colors.muted },
  caption: { display: 'block', color: colors.muted, fontSize: type.meta },
  copyStatus: { fontSize: type.meta, color: colors.text, fontWeight: weights.medium },
  main: { paddingTop: { default: '3rem', [breakpoints.phone]: '2rem' }, paddingBottom: '3rem' },
  page: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2rem', minWidth: 0 },
  title: {
    fontFamily: fonts.serif,
    fontSize: type.title,
    lineHeight: 1.15,
    fontWeight: weights.regular,
    letterSpacing: '-0.012em',
  },
  lead: { marginTop: '0.75rem', color: colors.muted, maxWidth: '44rem', lineHeight: 1.6 },
  toolbar: {
    display: 'grid',
    gap: '1rem',
    paddingTop: '1.25rem',
    paddingBottom: '1.25rem',
    paddingInline: '1.25rem',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.line,
    borderRadius: '8px',
    backgroundColor: colors.soft,
  },
  row: { display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' },
  field: { display: 'grid', gap: '0.35rem' },
  searchField: { flexGrow: 1, minWidth: 'min(100%, 16rem)' },
  label: {
    fontSize: type.meta,
    fontWeight: weights.medium,
    color: colors.text,
    paddingInline: 0,
    marginBottom: '0.35rem',
  },
  input: {
    fontFamily: fonts.sans,
    fontSize: type.body,
    color: colors.text,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.diagramEdge,
    borderRadius: '6px',
    paddingBlock: '0.45rem',
    paddingInline: '0.65rem',
    minHeight: '2.5rem',
  },
  fieldset: { margin: 0, padding: 0, borderWidth: 0, minWidth: 0 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '0.45rem' },
  chip: {
    fontFamily: fonts.sans,
    fontSize: type.meta,
    color: colors.text,
    backgroundColor: { default: colors.bg, ':hover': colors.panel },
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.diagramEdge,
    borderRadius: '999px',
    paddingBlock: '0.35rem',
    paddingInline: '0.8rem',
    minHeight: '2rem',
    cursor: 'pointer',
  },
  chipOn: {
    color: colors.bg,
    backgroundColor: { default: colors.text, ':hover': colors.text },
    borderColor: colors.text,
  },
  count: { fontSize: type.meta, opacity: 0.85 },
  status: { margin: 0, color: colors.muted, fontSize: type.meta },
  clear: {
    fontFamily: fonts.sans,
    fontSize: type.meta,
    color: colors.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
    textDecorationLine: 'underline',
    textUnderlineOffset: '3px',
    cursor: 'pointer',
    paddingBlock: '0.35rem',
    paddingInline: '0.25rem',
    minHeight: '2rem',
  },
  index: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(auto-fill, minmax(18rem, 1fr))', [breakpoints.phone]: '1fr' },
    rowGap: '1rem',
    columnGap: '2rem',
  },
  indexHead: { margin: 0, fontSize: type.meta, fontWeight: weights.medium, color: colors.muted },
  indexList: {
    margin: 0,
    marginTop: '0.35rem',
    paddingLeft: '1.2rem',
    display: 'grid',
    gap: '0.3rem',
    fontSize: type.meta,
  },
  indexLink: { lineHeight: 1.5 },
  list: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '2.5rem', minWidth: 0 },
  h2: { fontFamily: fonts.serif, fontWeight: weights.regular, fontSize: type.lead, margin: 0 },
  h3: { fontSize: type.lead, fontWeight: weights.medium, lineHeight: 1.4, margin: 0 },
  h4: { fontSize: type.meta, fontWeight: weights.medium, marginTop: '0.75rem', marginBottom: '0.35rem' },
  post: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: '0.9rem',
    minWidth: 0,
    paddingTop: '1.5rem',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: colors.line,
    scrollMarginTop: '1rem',
  },
  postHead: { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '0.4rem' },
  meta: { margin: 0, color: colors.muted, fontSize: type.meta, maxWidth: '50rem' },
  tags: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', margin: 0, padding: 0, listStyle: 'none' },
  tag: {
    fontSize: type.meta,
    color: colors.muted,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.line,
    borderRadius: '4px',
    paddingBlock: '0.1rem',
    paddingInline: '0.45rem',
  },
  tagWaiting: { color: colors.text, borderColor: colors.diagramEdge, fontWeight: weights.medium },
  details: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.line,
    borderRadius: '6px',
    maxWidth: '50rem',
  },
  summary: {
    cursor: 'pointer',
    paddingBlock: '0.6rem',
    paddingInline: '0.9rem',
    fontSize: type.meta,
    fontWeight: weights.medium,
  },
  detailsBody: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: '0.5rem',
    paddingInline: '0.9rem',
    paddingBottom: '0.9rem',
    fontSize: type.meta,
    lineHeight: 1.55,
    overflowWrap: 'anywhere',
  },
  ul: { margin: 0, paddingLeft: '1.2rem', display: 'grid', gap: '0.35rem' },
  dataNotes: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: '0.5rem',
    maxWidth: '50rem',
    fontSize: type.meta,
    lineHeight: 1.55,
    overflowWrap: 'anywhere',
  },
  dataLine: { margin: 0 },
  paste: {
    margin: 0,
    paddingBlock: '0.8rem',
    paddingInline: '0.9rem',
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    fontFamily: fonts.mono,
    fontSize: '0.8rem',
    lineHeight: 1.55,
    backgroundColor: colors.codeBg,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: colors.codeLine,
    borderRadius: '6px',
  },
})

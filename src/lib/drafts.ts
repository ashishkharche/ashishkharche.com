import type { Device } from '~/components/LinkedInCard'
import {
  draftPosts,
  lengths,
  mediaTypes,
  statuses,
  topicOrder,
  topics,
  type DraftPost,
  type Length,
  type Media,
  type Status,
  type Topic,
} from '~/content/drafts'

// Filters, sorting and the query string of the private drafts board (src/routes/drafts.$key.tsx).

type Sort = 'newest' | 'topic'

export interface Filters {
  topic: Topic[]
  length: Length[]
  media: Media[]
  status: Status[]
  q: string
  sort: Sort
  view: Device
}

export const groups = {
  topic: { label: 'Topic', options: topics, order: topicOrder },
  length: { label: 'Length', options: lengths, order: Object.keys(lengths) as Length[] },
  media: { label: 'Media', options: mediaTypes, order: Object.keys(mediaTypes) as Media[] },
  status: { label: 'Status', options: statuses, order: Object.keys(statuses) as Status[] },
} as const
export type GroupKey = keyof typeof groups
export const groupKeys = Object.keys(groups) as GroupKey[]

function pick<T extends string>(value: string | null, allowed: readonly T[]): T[] {
  return (value ?? '').split(',').filter((v): v is T => (allowed as readonly string[]).includes(v))
}

export function parseFilters(search: string): Filters {
  const params = new URLSearchParams(search)
  return {
    topic: pick(params.get('topic'), groups.topic.order),
    length: pick(params.get('length'), groups.length.order),
    media: pick(params.get('media'), groups.media.order),
    status: pick(params.get('status'), groups.status.order),
    q: params.get('q') ?? '',
    sort: params.get('sort') === 'topic' ? 'topic' : 'newest',
    view: params.get('view') === 'phone' ? 'mobile' : 'desktop',
  }
}

export function filtersToSearch(f: Filters): string {
  const params = new URLSearchParams()
  for (const key of groupKeys) if (f[key].length > 0) params.set(key, f[key].join(','))
  if (f.q) params.set('q', f.q)
  if (f.sort !== 'newest') params.set('sort', f.sort)
  if (f.view !== 'desktop') params.set('view', 'phone')
  const s = params.toString().replaceAll('%2C', ',')
  return s ? `?${s}` : ''
}

export function matches(post: DraftPost, f: Filters): boolean {
  if (f.topic.length > 0 && !post.topics.some((t) => f.topic.includes(t))) return false
  if (f.length.length > 0 && !f.length.includes(post.length)) return false
  if (f.media.length > 0 && !post.media.some((m) => f.media.includes(m))) return false
  if (f.status.length > 0 && !f.status.includes(post.status)) return false
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length > 0) {
    const hay = [
      post.title,
      post.series,
      post.version,
      post.text,
      post.longerText ?? '',
      post.concept ?? '',
      post.firstCommentSources ?? '',
      ...post.sources,
      ...post.notes,
    ]
      .join(' ')
      .toLowerCase()
    if (!words.every((w) => hay.includes(w))) return false
  }
  return true
}

const position = new Map(draftPosts.map((p, i) => [p.id, i]))
const newestFirst = (a: DraftPost, b: DraftPost) =>
  b.updated.localeCompare(a.updated) || (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0)

/** The visible posts, in sections: one section when sorted by date, one per topic when sorted by topic. */
export function arrange(posts: DraftPost[], f: Filters): { heading: string; posts: DraftPost[] }[] {
  const shown = posts.filter((p) => matches(p, f)).sort(newestFirst)
  if (f.sort === 'newest') return shown.length > 0 ? [{ heading: 'Newest first', posts: shown }] : []
  return topicOrder
    .map((t) => ({ heading: topics[t], posts: shown.filter((p) => p.primary === t) }))
    .filter((g) => g.posts.length > 0)
}

export const counts = Object.fromEntries(
  groupKeys.map((key) => [
    key,
    Object.fromEntries(
      groups[key].order.map((value) => [
        value,
        draftPosts.filter((p) =>
          key === 'topic'
            ? p.topics.includes(value as Topic)
            : key === 'media'
              ? p.media.includes(value as Media)
              : p[key] === value,
        ).length,
      ]),
    ),
  ]),
) as Record<GroupKey, Record<string, number>>

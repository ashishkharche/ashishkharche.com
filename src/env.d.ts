/// <reference types="vite/client" />

declare module '*.mmd' {
  const diagram: { id: string; svg: string; width: number; height: number }
  export default diagram
}

declare module '*.mdx' {
  import type { MDXProps } from 'mdx/types'
  import type { JSX } from 'react'
  export const frontmatter: Record<string, unknown>
  export default function MDXContent(props: MDXProps): JSX.Element
}

declare module 'virtual:content-dates' {
  const dates: {
    /** Last-modified date (YYYY-MM-DD) of each sitemap page. */
    pages: Record<string, string>
    /** Published and last-updated dates of each note, by slug. */
    notes: Record<string, { published: string; updated: string }>
  }
  export default dates
}

declare module 'virtual:note-headings' {
  /** Each note's section headings, by slug, with the ids the note page gives them. */
  const headings: Record<string, Array<{ id: string; text: string }>>
  export default headings
}

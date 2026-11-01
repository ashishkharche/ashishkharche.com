import { noteOgImage } from '~/content/ogImages'
import type { Note } from '~/content/notes'
import { site } from '~/content/site'
import { absoluteUrl } from './urls'

/**
 * schema.org data for search engines. Only details already shown on the
 * site: name, role, email and public profiles. No phone, address, date of
 * birth or right-to-work details.
 */
export const personId = `${site.url}/#person`
const websiteId = `${site.url}/#website`

export const person = {
  '@type': 'Person',
  '@id': personId,
  name: site.name,
  jobTitle: 'Software Engineer',
  description: site.description,
  url: `${site.url}/`,
  email: `mailto:${site.email}`,
  alumniOf: { '@type': 'CollegeOrUniversity', name: 'Kingston University' },
  /** Only skills shown on the Work page or in the Workout Director case study. */
  knowsAbout: [
    'iOS development',
    'Android development',
    'Swift',
    'SwiftUI',
    'Kotlin',
    'Jetpack Compose',
    'TypeScript',
    'Node.js',
    'AWS',
    'AWS CDK',
    'WebRTC',
    'MediaPipe',
    'Mobile test automation',
    'Maestro',
    'Payments',
  ],
  sameAs: [site.linkedin, site.github],
} as const

const author = { '@type': 'Person', '@id': personId, name: site.name, url: `${site.url}/` } as const

/** Home page: the site and the person it belongs to. */
export const homeJsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': websiteId,
      url: `${site.url}/`,
      name: site.name,
      inLanguage: site.lang,
      publisher: { '@id': personId },
    },
    person,
  ],
}

/** About page: a profile page about the person. */
export function aboutJsonLd(dateModified?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: absoluteUrl('/about/'),
    name: `About · ${site.name}`,
    inLanguage: site.lang,
    isPartOf: { '@id': websiteId },
    ...(dateModified ? { dateModified } : {}),
    mainEntity: person,
  }
}

/** A note: a blog post written by the person. */
export function noteJsonLd(
  note: Pick<Note, 'slug' | 'path' | 'title' | 'description' | 'date' | 'series'>,
  dateModified?: string,
) {
  const url = absoluteUrl(note.path)
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#post`,
    url,
    mainEntityOfPage: url,
    headline: note.title,
    description: note.description,
    image: absoluteUrl(noteOgImage(note.slug).src),
    datePublished: note.date,
    dateModified: dateModified && dateModified > note.date ? dateModified : note.date,
    inLanguage: site.lang,
    isPartOf: {
      '@type': 'Blog',
      '@id': `${site.url}/notes/#blog`,
      name: `${site.name} · Notes`,
      url: absoluteUrl('/notes/'),
    },
    articleSection: note.series,
    author,
    publisher: author,
  }
}

/** A `head()` script entry. `<` is escaped so the JSON can never close the script element. */
export function jsonLdScript(data: unknown) {
  return { type: 'application/ld+json', children: JSON.stringify(data).replaceAll('<', '\\u003c') }
}

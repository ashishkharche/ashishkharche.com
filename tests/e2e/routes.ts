import { sitemapPaths } from '../../src/content/site'

export const routes = [...sitemapPaths]

export const headings: Record<(typeof routes)[number], string> = {
  '/': 'Hi, I’m Ashish.',
  '/work/': 'Work',
  '/projects/': 'Projects',
  '/projects/workout-director/': 'Workout Director',
  '/notes/': 'Notes',
  '/notes/workout-director-1/':
    'Understanding on-device rep counting in Workout Director and what it sends over the network',
  '/notes/workout-director-2/': "How Workout Director's exercise figures are rendered and checked against pose targets",
  '/notes/reflex/': 'How Reflex tests iOS and Android app logic without a screen',
  '/design/': 'Design',
  '/about/': 'About',
  '/credits/': 'Credits',
  '/lab/charts/': 'Chart builder',
}

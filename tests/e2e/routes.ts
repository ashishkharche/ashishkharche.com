import { sitemapPaths } from '../../src/content/site'

export const routes = [...sitemapPaths]

export const headings: Record<(typeof routes)[number], string> = {
  '/': "Hi, I'm Ashish.",
  '/work/': 'Work',
  '/projects/': 'Projects',
  '/projects/workout-director/': 'Workout Director',
  '/notes/': 'Notes',
  '/notes/workout-director-1/': 'Counting reps without the video leaving the phone',
  '/notes/workout-director-2/': 'Drawing exercise figures from code',
  '/about/': 'About',
  '/lab/charts/': 'Chart builder',
}

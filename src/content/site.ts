export const site = {
  name: 'Ashish Kharche',
  url: 'https://ashishkharche.com',
  locale: 'en_GB',
  lang: 'en-GB',
  city: 'London',
  description:
    'Ashish Kharche, software engineer in London. iOS and Android apps with on-device AI features, TypeScript backends on AWS and QA on the Grok apps.',
  email: 'thekharche@gmail.com',
  linkedin: 'https://www.linkedin.com/in/ashish-kharche',
  github: 'https://github.com/ashishkharche',
  x: 'https://x.com/ashreui',
} as const

export const links = {
  workoutDirectorStore: 'https://apps.apple.com/gb/app/workout-director-gym-home/id6813645709',
  workoutDirectorSite: 'https://workoutdirector.com',
  kaloStore: 'https://apps.apple.com/gb/app/kalo-ai-macro-tracker/id6752915724',
  /** Role CVs in public/cv/, from the same web CV build. */
  roleCvs: [
    { label: 'Mobile', href: '/cv/Ashish-Kharche-CV-Mobile.pdf' },
    { label: 'AI product', href: '/cv/Ashish-Kharche-CV-AI-Product.pdf' },
    { label: 'Full-stack TypeScript and AWS', href: '/cv/Ashish-Kharche-CV-Fullstack-TypeScript-AWS.pdf' },
    { label: 'QA automation', href: '/cv/Ashish-Kharche-CV-QA.pdf' },
  ],
} as const

export const nav = [
  { to: '/work/', label: 'Work' },
  { to: '/projects/', label: 'Projects' },
  { to: '/notes/', label: 'Notes' },
  { to: '/about/', label: 'About' },
] as const

export type NavPath = (typeof nav)[number]['to']

/** Every page that should be in the sitemap. The 404 page is left out on purpose. */
export const sitemapPaths = [
  '/',
  '/work/',
  '/projects/',
  '/projects/workout-director/',
  '/notes/',
  '/notes/workout-director-1/',
  '/notes/workout-director-2/',
  '/about/',
  '/lab/charts/',
] as const

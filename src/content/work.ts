import type { LogoName } from './logos'

export interface Role {
  /** Shown in the left column. Leave out for roles listed without dates. */
  when?: string
  org: string
  logo?: LogoName
  orgNote?: string
  /** One line, or one line per title held at the company. */
  role: string | readonly string[]
  paragraphs: string[]
}

export const workIntro = 'My work history, writing for Maestro and the tools I use.'

export const roles: Role[] = [
  {
    when: 'Jan 2026 to Oct 2026',
    org: 'SpaceX Super Intelligence (SpaceXSI)',
    logo: 'spacexsi',
    orgNote: '(formerly xAI)',
    role: 'Quality Assurance Engineer, 2026',
    paragraphs: ['I’ve tested more than 500 Grok iOS and web builds before release.'],
  },
  {
    when: 'Oct 2022 to Oct 2026',
    org: 'Paythru, London',
    logo: 'paythru',
    role: ['Senior Mobile Engineer, Mar 2024 to Oct 2026', 'Mobile Engineer, Oct 2022 to Feb 2024'],
    paragraphs: [
      'I worked on white-label EV charging and payment apps in Kotlin with Jetpack Compose and Swift with SwiftUI. The work included the Terminal app for Adyen payment terminals and Adyen in-app payments.',
      'A rebuild of the Bitrise pipeline cut the release cycle from a few weeks to a few days.',
      'In 2026 I worked on the new TypeScript payments platform on AWS, using AWS CDK and idempotent payment handling. My role ended in Oct 2026.',
    ],
  },
  {
    when: 'Mar 2023 to Sep 2024',
    org: 'Maestro',
    logo: 'maestro',
    role: 'Developer, contract, 2023 to 2024',
    paragraphs: [
      'I held this contract while working at Paythru. My work covered test suites for Maestro Cloud and Studio and 14 blog posts.',
    ],
  },
  {
    when: 'Sep 2021 to Sep 2022',
    org: 'Kingston University, London',
    logo: 'kingston',
    role: 'MSc Software Engineering',
    paragraphs: [],
  },
]

export const certificationsNote =
  'I previously held the AWS Solutions Architect Associate and Cloud Practitioner certifications. Both expired in February 2025.'

export interface Article {
  title: string
  href: string
  date: string
}

export const maestroArticles: Article[] = [
  {
    title: 'Running Maestro Cloud UI tests for iOS on Bitrise CI/CD',
    href: 'https://maestro.dev/blog/running-maestro-cloud-ui-tests-for-ios-on-bitrise-ci-cd',
    date: 'May 2023',
  },
  {
    title: 'Best practices for cross-platform Maestro UI testing for Android and iOS',
    href: 'https://maestro.dev/blog/best-practices-for-cross-platform-maestro-ui-testing-for-android-and-ios',
    date: 'May 2023',
  },
  {
    title: 'Guide to Maestro UI testing with API mocking using WireMock',
    href: 'https://maestro.dev/blog/guide-to-maestro-ui-testing-with-api-mocking-using-wiremock',
    date: 'Jun 2023',
  },
  {
    title: 'UI testing the Firefox Focus iOS app with Maestro',
    href: 'https://maestro.dev/blog/ui-testing-firefox-focus-ios-app-with-maestro-a-real-world-example',
    date: 'Jul 2023',
  },
  {
    title: 'Pokedex UI testing series: Maestro with Expo and React Native',
    href: 'https://maestro.dev/blog/pokedex-ui-testing-series-getting-started-with-maestro-in-expo-react-native-part-1',
    date: 'Aug 2023',
  },
  {
    title: 'Music app UI testing series: Maestro in Flutter',
    href: 'https://maestro.dev/blog/music-app-ui-testing-series-getting-started-with-maestro-in-flutter-part-1',
    date: 'Oct 2023',
  },
]

export const tools: Array<{ area: string; items: string }> = [
  { area: 'iOS', items: 'Swift, SwiftUI, UIKit, Combine, Swift concurrency, SwiftData, HealthKit, WidgetKit' },
  { area: 'Android', items: 'Kotlin, Jetpack Compose, Coroutines and Flow, Hilt' },
  { area: 'Backend', items: 'TypeScript, Node.js, Fastify, PostgreSQL, Drizzle, React, Next.js' },
  {
    area: 'Cloud',
    items: 'AWS CDK, ECS Fargate, Lambda, RDS, DynamoDB, SQS, CloudFront, CloudWatch, Cloudflare',
  },
  {
    area: 'On-device AI',
    items:
      'MediaPipe pose tracking, Apple Vision, a realtime voice model over WebRTC with tool calls, structured model output',
  },
  { area: 'Testing', items: 'XCTest, XCUITest, JUnit, Maestro, snapshot tests, Vitest' },
  { area: 'Shipping', items: 'Adyen, RevenueCat, GitHub Actions, Bitrise, fastlane, Firebase Crashlytics' },
]

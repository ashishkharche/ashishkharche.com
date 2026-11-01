import type { LogoName } from './logos'

export interface Role {
  /** Shown in the left column. Leave out for roles listed without dates. */
  when?: string
  org: string
  logo?: LogoName
  orgNote?: string
  role: string
  paragraphs: string[]
}

export const workIntro = 'My work history, writing for Maestro and the tools I use.'

export const roles: Role[] = [
  {
    when: 'Oct 2022 to Oct 2026',
    org: 'Paythru, London',
    logo: 'paythru',
    role: 'Senior Mobile Engineer (Mar 2024 to Oct 2026), Mobile Engineer (Oct 2022 to Feb 2024), covering iOS, Android and AWS',
    paragraphs: [
      'Paythru makes payments software for EV charging. In a team of ten, I developed charging and payment features for six white-label apps with about 100,000 sessions, mostly in Kotlin and Jetpack Compose, with some SwiftUI on iOS. I integrated Adyen for in-app payments and reworked the Bitrise pipeline so builds could go from commit to the stores, which shortened the release cycle. I also developed the Kotlin and Jetpack Compose Terminal app for Adyen payment terminals, tested on a Castles S1U2 device.',
      "In 2026 I worked on Paythru's new TypeScript payments platform on AWS, designed for 10,000 terminals, including the infrastructure in AWS CDK, with idempotent payment handling, an audit log, monitoring and alarms. My role at Paythru ended in October 2026.",
    ],
  },
  {
    when: 'Jan 2026 to Oct 2026',
    org: 'SpaceX Super Intelligence (SpaceXSI)',
    logo: 'spacexsi',
    orgNote: '(formerly xAI)',
    role: 'Quality Assurance Engineer, part-time',
    paragraphs: [
      'I did regression and release testing on more than 500 builds of the Grok iOS and web apps, covering chat, Imagine, Build and MCP as well as payments, subscriptions and sign-in. I checked changelogs, gave release sign-off and tracked bugs in Linear with the engineers through to release.',
    ],
  },
  {
    when: 'Mar 2023 to Sep 2024',
    org: 'Maestro',
    logo: 'maestro',
    role: 'Developer, contract, alongside Paythru',
    paragraphs: [
      'I wrote about 10 iOS and Android test suites for Maestro Cloud and Studio, covering four core features, with CI on GitHub Actions and Bitrise. I also wrote guides for maestro.dev, sample repos and 17 posts for the Maestro blog.',
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
    area: 'On-device ML and LLMs',
    items:
      'MediaPipe pose tracking, Apple Vision, a realtime voice model over WebRTC with tool calls, structured model output',
  },
  { area: 'Testing', items: 'XCTest, XCUITest, JUnit, Maestro, snapshot tests, Vitest' },
  { area: 'Shipping', items: 'Adyen, RevenueCat, GitHub Actions, Bitrise, fastlane, Firebase Crashlytics' },
]

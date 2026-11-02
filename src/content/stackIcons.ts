import type { StackItem } from './projects'

/**
 * Icons for the stack on the case study, all in one colour: dark ink on the light theme and light
 * ink on the dark theme. Where each file comes from, its licence and why one item keeps a letter
 * tile is in public/assets/stack/SOURCES.md.
 */
export type StackIcon =
  | {
      kind: 'mark'
      /** The file shown on the light theme (dark ink) and the one shown on the dark theme (light ink). */
      light: string
      dark: string
    }
  /** A neutral letter tile, for an item with no published mark. */
  | { kind: 'monogram'; letters: string }

const dir = '/assets/stack'

function mark(slug: string, ext: 'svg' | 'png' = 'svg'): StackIcon {
  return { kind: 'mark', light: `${dir}/${slug}-dark-ink.${ext}`, dark: `${dir}/${slug}-light-ink.${ext}` }
}

export const stackIcons: Record<StackItem, StackIcon> = {
  Swift: mark('swift'),
  SwiftUI: mark('swiftui', 'png'),
  SwiftData: mark('swiftdata', 'png'),
  'MediaPipe BlazePose': mark('mediapipe'),
  // Apple publishes no icon for the Vision framework, so it keeps a letter tile.
  'Vision framework': { kind: 'monogram', letters: 'Vi' },
  WebRTC: mark('webrtc'),
  TypeScript: mark('typescript'),
  'AWS Lambda': mark('aws-lambda'),
  DynamoDB: mark('dynamodb'),
  'AWS CDK': mark('aws-cdk'),
  'Better Auth': mark('betterauth'),
  Postgres: mark('postgresql'),
}

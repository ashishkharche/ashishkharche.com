import type { StackItem } from './projects'

/**
 * Icons for the stack on the case study. Where each file comes from, its licence and why some
 * items get a letter tile instead of a mark is in public/assets/stack/SOURCES.md.
 */
export type StackIcon =
  | {
      kind: 'mark'
      /** Single-colour mark: dark ink for the light theme, light ink for the dark theme. */
      mono: { light: string; dark: string }
      /** The owner's full-colour mark, used on both themes. Marks with no colour version reuse the mono files. */
      colour: { light: string; dark: string }
    }
  /** A neutral letter tile, for items whose owner does not allow the mark here or has no mark. */
  | { kind: 'monogram'; letters: string }

export type StackIconStyle = 'mono' | 'colour'

/** The style the page uses. Both are kept so the two can be compared. */
export const stackIconStyle: StackIconStyle = 'mono'

const dir = '/assets/stack'

function mark(slug: string, colourFile?: string): StackIcon {
  const mono = { light: `${dir}/${slug}-dark-ink.svg`, dark: `${dir}/${slug}-light-ink.svg` }
  const colour = colourFile ? { light: `${dir}/${colourFile}`, dark: `${dir}/${colourFile}` } : mono
  return { kind: 'mark', mono, colour }
}

export const stackIcons: Record<StackItem, StackIcon> = {
  Swift: { kind: 'monogram', letters: 'Sw' },
  SwiftUI: { kind: 'monogram', letters: 'UI' },
  SwiftData: { kind: 'monogram', letters: 'SD' },
  'MediaPipe BlazePose': mark('mediapipe', 'mediapipe-color.svg'),
  'Apple Vision': { kind: 'monogram', letters: 'Vi' },
  WebRTC: mark('webrtc'),
  TypeScript: mark('typescript', 'typescript-color.svg'),
  'AWS Lambda': { kind: 'monogram', letters: 'La' },
  DynamoDB: { kind: 'monogram', letters: 'Dy' },
  'AWS CDK': { kind: 'monogram', letters: 'CDK' },
  'Better Auth': mark('betterauth'),
  Postgres: { kind: 'monogram', letters: 'Pg' },
}

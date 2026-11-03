/**
 * What the "Copy for LinkedIn" button on the drafts board puts on the clipboard, built from a post's canonical text
 * (never from the page).
 *
 * LinkedIn's composer is a rich text editor: when the clipboard holds HTML it reads that, one paragraph per line, and
 * an empty paragraph becomes an empty line. Selecting the card text by hand gives it HTML whose gaps are newlines
 * inside one block, which it drops, so the paragraphs ran together. The button writes both types:
 * - text/html: each paragraph as <p>, single line breaks as <br>, and an empty <p><br></p> between paragraphs;
 * - text/plain: paragraphs separated by one blank line (\n\n), for editors that only read plain text.
 */

/** The post as paragraphs, each a list of lines: trailing spaces trimmed, runs of blank lines read as one gap. */
export function paragraphsOf(text: string): string[][] {
  const paragraphs: string[][] = []
  let current: string[] = []
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.replace(/[^\S\n]+$/u, '')
    if (line === '') {
      if (current.length > 0) paragraphs.push(current)
      current = []
    } else current.push(line)
  }
  if (current.length > 0) paragraphs.push(current)
  return paragraphs
}

const escapes: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => escapes[c] ?? c)

export function linkedinPlain(text: string): string {
  return paragraphsOf(text)
    .map((p) => p.join('\n'))
    .join('\n\n')
}

export function linkedinHtml(text: string): string {
  return paragraphsOf(text)
    .map((p) => `<p>${p.map(escapeHtml).join('<br>')}</p>`)
    .join('<p><br></p>')
}

/**
 * Writes both types with one ClipboardItem; where ClipboardItem or clipboard.write is missing (or refuses), writes
 * the plain text only. Resolves to which one was written; rejects if the clipboard cannot be written at all.
 */
export async function copyForLinkedIn(text: string): Promise<'rich' | 'plain'> {
  const plain = linkedinPlain(text)
  const clipboard = navigator.clipboard
  if (typeof ClipboardItem !== 'undefined' && typeof clipboard.write === 'function') {
    try {
      await clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([plain], { type: 'text/plain' }),
          'text/html': new Blob([linkedinHtml(text)], { type: 'text/html' }),
        }),
      ])
      return 'rich'
    } catch {
      // Some browsers refuse text/html; fall back to plain text below.
    }
  }
  await clipboard.writeText(plain)
  return 'plain'
}

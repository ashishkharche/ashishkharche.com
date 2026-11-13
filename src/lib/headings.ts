/** The plain text of each `## ` heading in an MDX note, skipping fenced code. Links and inline code lose their marks. */
export function noteHeadings(mdx: string): string[] {
  const out: string[] = []
  let fenced = false
  for (const line of mdx.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced
    if (fenced) continue
    const match = /^## (.+?)\s*$/.exec(line)
    if (match?.[1]) out.push(plain(match[1]))
  }
  return out
}

function plain(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .trim()
}

/** The id a heading gets on the page: lower case words joined by hyphens. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

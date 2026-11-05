import { describe, expect, it } from 'vitest'
import { draftPosts } from '~/content/drafts'
import { escapeHtml, linkedinHtml, linkedinPlain, paragraphsOf } from '~/lib/linkedinCopy'

describe('Copy for LinkedIn', () => {
  it('splits paragraphs on blank lines and keeps single line breaks', () => {
    const text = 'Hook line\n\nFirst para line 1\nline 2\n\n\n\nLast  \t\n'
    expect(paragraphsOf(text)).toEqual([['Hook line'], ['First para line 1', 'line 2'], ['Last']])
    expect(linkedinPlain(text)).toBe('Hook line\n\nFirst para line 1\nline 2\n\nLast')
    expect(linkedinHtml(text)).toBe('<p>Hook line</p><p>First para line 1<br>line 2</p><p>Last</p>')
  })

  it('trims trailing spaces, reads CRLF and spaces-only lines as blank', () => {
    expect(linkedinPlain('a  \r\n \r\nb \r\nc')).toBe('a\n\nb\nc')
    expect(linkedinPlain('  indented stays\n\n')).toBe('  indented stays')
  })

  it('escapes HTML and keeps emoji and special characters as they are', () => {
    const text = 'Elbow 147° & knee <155°> "quoted" it\'s 🏋️‍♀️ 💪\n\nMediaPipe · 12 % → done'
    expect(escapeHtml('<a href="x">&\'</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;')
    expect(linkedinPlain(text)).toBe(text)
    expect(linkedinHtml(text)).toBe(
      '<p>Elbow 147° &amp; knee &lt;155°&gt; &quot;quoted&quot; it&#39;s 🏋️‍♀️ 💪</p><p>MediaPipe · 12 % → done</p>',
    )
  })

  it('copies every post exactly, without credit lines or review notes', () => {
    for (const post of draftPosts) {
      const plain = linkedinPlain(post.text)
      // The canonical text already uses one blank line between paragraphs and no trailing spaces.
      expect(plain, post.id).toBe(post.text.trim())
      for (const note of post.notes) expect(plain).not.toContain(note)
      const paras = plain.split('\n\n').length
      const html = linkedinHtml(post.text)
      // No empty spacer paragraphs: LinkedIn already leaves one blank line at each paragraph boundary.
      expect(html, post.id).not.toContain('<p><br></p>')
      expect(html.match(/<p>/g)?.length, post.id).toBe(paras)
    }
    // Credit lines were taken out of every post text on 3 Nov (Ashish's call); credits stay in the sources.
    const credit =
      /^(Image:|Video:|Pose landmarks:|Diagram rendered with|Goblet squat reference)|\/ Pexels|MediaPipe BlazePose\.|CC BY|Wikimedia|Taco Fleur/m
    for (const post of draftPosts) {
      expect(linkedinPlain(post.text), post.id).not.toMatch(credit)
      expect(linkedinHtml(post.text), post.id).not.toMatch(/Pexels|CC BY|Wikimedia|rendered with Pele/)
    }
  })

  it('copies wd-b3-2 compact text, and keeps the audit text as the longer version', () => {
    const post = draftPosts.find((p) => p.id === 'wd-b3-2')
    const compact =
      'At the bottom of a side-on deadlift, the far plate can hide the near ankle and drop pose confidence below what the counter normally needs. Losing a rep over one hidden ankle felt wrong when the hip and knee are in plain view. So if those two are still clear and the ankle has not faded too far, the counter keeps the leg in view for up to 3 s.'
    const longer = [
      'At the bottom of a side-on deadlift, the far plate can hide the near ankle. The pose model gets less sure about where it is, and its confidence drops below what the counter normally needs.',
      "Losing a rep over one hidden ankle felt wrong when the hip and knee are in plain view. So if those two are still clear and the ankle hasn't faded too far, the counter keeps the leg in view for up to 3 s.",
      'In the clip in the image, you can see the ankle dim at the bottom of the lift while the counter keeps going.',
    ]
    expect(linkedinPlain(post?.text ?? '')).toBe(compact)
    expect(linkedinHtml(post?.text ?? '')).toBe(`<p>${escapeHtml(compact)}</p>`)
    expect(post?.longerText).toBe(longer.join('\n\n'))
  })

  it('copies the batch 4 compact posts with their paragraphs and no credit lines', () => {
    const expected = { 'wd-b4-p1': 1, 'wd-b4-fig1': 1, 'wd-b4-tech1': 1 }
    const longerParas = { 'wd-b4-p1': 5, 'wd-b4-fig1': 3, 'wd-b4-tech1': 3 }
    for (const [id, n] of Object.entries(expected)) {
      const post = draftPosts.find((p) => p.id === id)
      if (!post) throw new Error(`${id} is missing`)
      const plain = linkedinPlain(post.text)
      expect(plain, id).toBe(post.text)
      expect(plain.split('\n\n'), id).toHaveLength(n)
      expect(linkedinHtml(post.text).match(/<p>/g), id).toHaveLength(n)
      expect(linkedinHtml(post.text), id).not.toContain('<p><br></p>')
      expect(post.longerText?.split('\n\n'), id).toHaveLength(longerParas[id as keyof typeof longerParas])
    }
    const p1 = draftPosts.find((p) => p.id === 'wd-b4-p1')
    expect(p1?.text).not.toMatch(/Aliaksei Masiukevich|\/ Pexels/)
    expect(JSON.stringify(p1?.images)).not.toMatch(/live/i)
    expect(draftPosts.find((p) => p.id === 'wd-b4-tech1')?.text).not.toMatch(/Pele/)
  })
})

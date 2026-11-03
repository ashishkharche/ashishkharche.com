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

  it('copies every post exactly, with credit lines and without review notes', () => {
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
    const b32 = draftPosts.find((p) => p.id === 'wd-b3-2')
    expect(linkedinPlain(b32?.text ?? '')).toMatch(
      /\n\nVideo: cottonbro studio \/ Pexels\. Pose landmarks: MediaPipe BlazePose\.$/,
    )
  })

  it('copies wd-b3-2 exactly as Ashish edited it', () => {
    const post = draftPosts.find((p) => p.id === 'wd-b3-2')
    const paras = [
      'At the bottom of a side-on deadlift the far plate can hide the near ankle, and its pose confidence drops under the 0.5 the counter needs.',
      'If the hip and knee are still clear and the ankle stays at 0.3 or more, Workout Director keeps the leg in view for up to 3 s instead of losing the rep.',
      'The image shows one clip: the ankle dims at the bottom of the lift, and the counter stays on.',
      'Video: cottonbro studio / Pexels. Pose landmarks: MediaPipe BlazePose.',
    ]
    expect(linkedinPlain(post?.text ?? '')).toBe(paras.join('\n\n'))
    expect(linkedinHtml(post?.text ?? '')).toBe(paras.map((p) => `<p>${p}</p>`).join(''))
  })
})

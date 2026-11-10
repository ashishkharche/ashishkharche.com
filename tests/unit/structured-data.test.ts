import { describe, expect, it } from 'vitest'
import { notes } from '~/content/notes'
import { aboutJsonLd, homeJsonLd, jsonLdScript, noteJsonLd, personId } from '~/lib/structuredData'

const forbidden =
  /"(telephone|faxNumber|address|birthDate|birthPlace|nationality|homeLocation)"|\bvisa\b|sponsor|right to work|available now|open to work/i

describe('structured data', () => {
  it('about is a ProfilePage about the person', () => {
    const data = aboutJsonLd('2026-10-31')
    expect(data['@type']).toBe('ProfilePage')
    expect(data.mainEntity['@type']).toBe('Person')
    expect(data.mainEntity['@id']).toBe(personId)
    expect(data.mainEntity.name).toBe('Ashish Kharche')
    expect(data.dateModified).toBe('2026-10-31')
  })

  it('each note is a BlogPosting by the same person', () => {
    for (const note of notes) {
      const data = noteJsonLd(note, '2026-11-01')
      expect(data['@type']).toBe('BlogPosting')
      expect(data.headline).toBe(note.title)
      expect(data.datePublished).toBe(note.date)
      expect(data.dateModified).toBe(note.date > '2026-11-01' ? note.date : '2026-11-01')
      expect(data.author['@id']).toBe(personId)
      expect(data.url).toBe(`https://ashishkharche.com${note.path}`)
      expect(data.image).toMatch(/^https:\/\/ashishkharche\.com\/assets\/og\/.+\.png$/)
    }
  })

  it('never gives a modified date before the published date', () => {
    const note = notes[0]
    if (!note) throw new Error('no notes')
    expect(noteJsonLd(note, '2000-01-01').dateModified).toBe(note.date)
    expect(noteJsonLd(note).dateModified).toBe(note.date)
  })

  it('has no phone, address, date of birth or right-to-work details', () => {
    const all = [homeJsonLd, aboutJsonLd('2026-10-31'), ...notes.map((note) => noteJsonLd(note))]
    for (const data of all) expect(JSON.stringify(data)).not.toMatch(forbidden)
  })

  it('escapes < so the JSON cannot end the script element', () => {
    const script = jsonLdScript({ text: '</script><script>alert(1)</script>' })
    expect(script.type).toBe('application/ld+json')
    expect(script.children).not.toContain('<')
    expect(JSON.parse(script.children)).toEqual({ text: '</script><script>alert(1)</script>' })
  })
})

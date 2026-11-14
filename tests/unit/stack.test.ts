import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { workoutDirectorStack, workoutDirectorStackGroups } from '~/content/projects'
import { stackIcons } from '~/content/stackIcons'

const dir = 'public/assets/stack'
const sources = readFileSync(join(dir, 'SOURCES.md'), 'utf8')

describe('the case study stack', () => {
  it('lists exactly the twelve stack items, once each and in order', () => {
    const names = workoutDirectorStackGroups.flatMap((group) => group.items.map((item) => item.name))
    expect(names).toEqual([...workoutDirectorStack])
    expect(names).toHaveLength(12)
  })

  it('gives every group a label and every item a short note', () => {
    for (const group of workoutDirectorStackGroups) {
      expect(group.label.trim()).not.toBe('')
      for (const item of group.items) expect(item.note.length).toBeGreaterThan(0)
    }
  })

  it('points every mark at a self-hosted file that exists', () => {
    for (const icon of Object.values(stackIcons)) {
      if (icon.kind !== 'mark') continue
      for (const src of [icon.light, icon.dark]) {
        expect(src.startsWith('/assets/stack/')).toBe(true)
        expect(existsSync(join('public', src))).toBe(true)
      }
    }
  })

  it('gives every item a real mark except the Vision framework, which has no published icon', () => {
    const tiles = Object.entries(stackIcons).filter(([, icon]) => icon.kind === 'text')
    expect(tiles.map(([name]) => name)).toEqual(['Vision framework'])
  })

  it('names the Vision framework so it cannot be read as the headset', () => {
    expect(workoutDirectorStack).toContain('Vision framework')
    expect(workoutDirectorStack).not.toContain('Apple Vision' as never)
  })

  it('keeps no full-colour files: every file is a dark-ink or light-ink pair', () => {
    const files = readdirSync(dir).filter((name) => /\.(svg|png)$/.test(name))
    for (const file of files) expect(file).toMatch(/-(dark|light)-ink\.(svg|png)$/)
    for (const file of files.filter((name) => name.includes('-dark-ink.')))
      expect(files).toContain(file.replace('-dark-ink.', '-light-ink.'))
  })

  it('records a source and licence for every icon file and every stack item', () => {
    for (const file of readdirSync(dir).filter((name) => /\.(svg|png)$/.test(name))) expect(sources).toContain(file)
    for (const name of workoutDirectorStack) expect(sources).toContain(`| ${name} `)
  })
})

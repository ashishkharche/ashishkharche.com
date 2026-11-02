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
      for (const src of [icon.mono.light, icon.mono.dark, icon.colour.light, icon.colour.dark]) {
        expect(src.startsWith('/assets/stack/')).toBe(true)
        expect(existsSync(join('public', src))).toBe(true)
      }
    }
  })

  it('keeps letter tiles to three characters or fewer', () => {
    for (const icon of Object.values(stackIcons)) {
      if (icon.kind === 'monogram') expect(icon.letters.length).toBeLessThanOrEqual(3)
    }
  })

  it('records a source and licence for every icon file and every stack item', () => {
    for (const file of readdirSync(dir).filter((name) => name.endsWith('.svg'))) expect(sources).toContain(file)
    for (const name of workoutDirectorStack) expect(sources).toContain(`| ${name} `)
  })
})

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { headingId, noteHeadings } from '../src/lib/headings.ts'

const id = 'virtual:note-headings'
const root = fileURLToPath(new URL('..', import.meta.url))

/**
 * `import headings from 'virtual:note-headings'` gives each note's section headings (`## ` lines outside code
 * fences) with the ids the note page gives them, for the contents list beside a long note.
 */
export function headingsPlugin(): Plugin {
  return {
    name: 'site:note-headings',
    resolveId(source) {
      return source === id ? `\0${id}` : null
    },
    load(loaded) {
      if (loaded !== `\0${id}`) return null
      const dir = `${root}content/notes`
      const out = Object.fromEntries(
        readdirSync(dir)
          .filter((name) => name.endsWith('.mdx'))
          .map((name) => {
            this.addWatchFile(`${dir}/${name}`)
            const text = noteHeadings(readFileSync(`${dir}/${name}`, 'utf8'))
            return [name.slice(0, -4), text.map((t) => ({ id: headingId(t), text: t }))]
          }),
      )
      return `export default ${JSON.stringify(out)}`
    },
  }
}

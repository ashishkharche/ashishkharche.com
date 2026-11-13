import { defineConfig } from 'vitest/config'
import { mdxFrontmatter, pele } from './plugins/content.ts'
import { datesPlugin } from './plugins/dates.ts'
import { headingsPlugin } from './plugins/headings.ts'

export default defineConfig({
  plugins: [pele(), mdxFrontmatter(), datesPlugin(), headingsPlugin()],
  resolve: { tsconfigPaths: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
})

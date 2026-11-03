import mdx from '@mdx-js/rollup'
import stylex from '@stylexjs/unplugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import remarkFrontmatter from 'remark-frontmatter'
import remarkMdxFrontmatter from 'remark-mdx-frontmatter'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { mdxFrontmatter, pele } from './plugins/content.ts'
import { datesPlugin } from './plugins/dates.ts'
import { rehypeHighlight } from './plugins/highlight.ts'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(({ command }) => ({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    port: 3000,
  },
  plugins: [
    pele(),
    mdxFrontmatter(),
    datesPlugin(),
    {
      enforce: 'pre',
      ...mdx({
        remarkPlugins: [remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]],
        rehypePlugins: [[...rehypeHighlight]],
        providerImportSource: undefined,
      }),
    },
    stylex.vite({
      dev: command === 'serve',
      runtimeInjection: false,
      useCSSLayers: { before: ['reset'] },
      unstable_moduleResolution: { type: 'commonJS', rootDir: root },
      aliases: { '~/*': [`${root}src/*`] },
    }),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        autoSubfolderIndex: true,
        failOnError: true,
        // Files from public/ (the CV PDFs) are linked from pages; crawling them would overwrite them with text.
        filter: ({ path }) => !/\.[a-z0-9]+$/i.test(path.split(/[?#]/)[0] ?? ''),
      },
      // No route matches this path, so it renders the same not found page the browser renders for unknown URLs.
      // The header makes src/server.ts answer 200 so the page is saved.
      pages: [
        // Private drafts board, not linked from any page, so the crawler would not find it (src/content/drafts.ts).
        { path: '/drafts/ixixlepdu/', prerender: { enabled: true } },
        {
          path: '/404',
          prerender: { enabled: true, outputPath: '/404.html', headers: { 'x-prerender-not-found': '1' } },
        },
      ],
    }),
    viteReact({ include: /\.(mdx|jsx|tsx)$/ }),
  ],
}))

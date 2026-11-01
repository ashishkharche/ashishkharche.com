import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.PW_PORT ?? 4173)

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL ?? 'chrome' },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], channel: process.env.PW_CHANNEL ?? 'chrome' },
    },
  ],
  // Tests run against the production build; run `pnpm build` first.
  webServer: {
    command: 'node scripts/serve.mjs',
    port,
    reuseExistingServer: !process.env.CI,
    env: { PORT: String(port) },
  },
})

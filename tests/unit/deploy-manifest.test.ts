import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DEPLOY_API_FILES } from '../../scripts/deploy-api-files.ts'

describe('deploy manifest API files', () => {
  it('ships both chart functions on Option A uploads', () => {
    expect([...DEPLOY_API_FILES]).toEqual(['api/tdn.ts', 'api/icon.ts'])
    for (const file of DEPLOY_API_FILES) {
      expect(existsSync(file), file).toBe(true)
      const body = readFileSync(file, 'utf8')
      // Option A uploads each api/*.ts alone; an import would need a package install on Vercel.
      expect(/^\s*import\s/m.test(body), `${file} must stay free of imports for Option A`).toBe(false)
    }
  })
})

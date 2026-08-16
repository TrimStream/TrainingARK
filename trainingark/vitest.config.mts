import { defineConfig } from 'vitest/config'

// Pure store-logic tests only — no DOM, no React rendering — so the default
// 'node' test environment is used instead of jsdom.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
  },
})

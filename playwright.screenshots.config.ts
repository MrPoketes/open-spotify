import { defineConfig } from "@playwright/test"

// `pnpm screenshots` uses this config so that `pnpm test:e2e` never rewrites
// the README's images.
export default defineConfig({
  testDir: "e2e",
  testMatch: "readme-screenshots.ts",
})

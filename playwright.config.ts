import { defineConfig } from "@playwright/test"

// End-to-end tests launch the unpacked app, so `pnpm package:dir` must run
// first. Electron needs no browser download.
export default defineConfig({
  testDir: "e2e",
  // CI uploads test-results/ when a run fails, traces included.
  use: { trace: "retain-on-failure" },
})

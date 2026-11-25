import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Two projects because the code runs in two different environments:
// main/preload/shared code runs in Node, renderer code runs in a browser.
export default defineConfig({
  test: {
    // Locally, agents run tests while other agents and the owner share the
    // machine. Four workers keep a run fast without taking every core. CI
    // runners are dedicated, so there the suite uses all of them.
    maxWorkers: process.env["CI"] === undefined ? 4 : "100%",
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: [
            "src/main/**/*.test.ts",
            "src/shared/**/*.test.ts",
            "lint/**/*.test.ts",
            "scripts/**/*.test.ts",
          ],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "renderer",
          environment: "jsdom",
          include: ["src/renderer/**/*.test.{ts,tsx}"],
          setupFiles: ["src/renderer/test-setup.ts"],
          // Renderer tests spy on DOM prototypes for layout; without this, a
          // spy leaks into later tests in the same file.
          restoreMocks: true,
          // Vitest replaces CSS with empty strings by default. The design
          // token test reads the stylesheets themselves.
          css: { include: [/src\/renderer\/styles\/.+\.css/] },
        },
      },
    ],
  },
})

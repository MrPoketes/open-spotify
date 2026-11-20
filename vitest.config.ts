import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

// Two projects because the code runs in two different environments:
// main/preload/shared code runs in Node, renderer code runs in a browser.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["src/main/**/*.test.ts", "src/shared/**/*.test.ts", "lint/**/*.test.ts"],
        },
      },
      {
        plugins: [react()],
        test: {
          name: "renderer",
          environment: "jsdom",
          include: ["src/renderer/**/*.test.{ts,tsx}"],
          setupFiles: ["src/renderer/test-setup.ts"],
        },
      },
    ],
  },
})

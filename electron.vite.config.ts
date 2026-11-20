import { defineConfig } from "electron-vite"

// Builds Electron's main and preload processes. The renderer has its own
// Vite config (vite.config.ts) because TanStack Start drives that build.
//
// Dependencies are bundled rather than loaded from node_modules, so the
// packaged app contains only the code it actually uses.
export default defineConfig({
  main: {
    build: {
      lib: { entry: "src/main/main.ts" },
      externalizeDeps: false,
    },
  },
  preload: {
    build: {
      lib: { entry: "src/preload/preload.ts", formats: ["cjs"] },
      externalizeDeps: false,
    },
  },
})

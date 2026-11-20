import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { rendererDevServerPort } from "./src/shared/dev-server.ts"

// Builds the renderer (the React UI). Electron's main and preload processes
// are built separately by electron.vite.config.ts.
//
// SPA mode makes TanStack Start emit static files plus a `_shell.html`
// entry, which the main process serves over the `app://` protocol.
export default defineConfig({
  server: { port: rendererDevServerPort, strictPort: true },
  plugins: [
    tanstackStart({ srcDirectory: "src/renderer", spa: { enabled: true } }),
    react(),
    tailwindcss(),
  ],
})

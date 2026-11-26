import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"
import {
  contentSecurityPolicy,
  scriptNoncePlaceholder,
} from "./src/shared/content-security-policy.ts"
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
    devContentSecurityPolicy(),
  ],
})

// Vite's `server.headers` skips the HTML that TanStack Start renders, so the
// policy is set by a middleware that runs before every dev server response.
function devContentSecurityPolicy(): Plugin {
  return {
    name: "open-spotify:dev-content-security-policy",
    configureServer(server) {
      server.middlewares.use((_request, response, next) => {
        response.setHeader("Content-Security-Policy", contentSecurityPolicy(scriptNoncePlaceholder))
        next()
      })
    },
  }
}

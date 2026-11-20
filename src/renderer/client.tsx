import { StartClient } from "@tanstack/react-start/client"
import { StrictMode, startTransition } from "react"
import { hydrateRoot } from "react-dom/client"
import { restoreSavedTheme } from "./features/themes/saved-theme"
import { rendererRuntime } from "./lib/renderer-runtime"

// TanStack Start uses this file in place of its default client entry. The
// saved theme is applied before React renders anything, so the first frame
// already has the user's colors.
await rendererRuntime.runPromise(restoreSavedTheme)

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient />
    </StrictMode>,
  )
})

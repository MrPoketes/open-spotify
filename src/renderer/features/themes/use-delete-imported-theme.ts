import { Effect } from "effect"
import { use, useState } from "react"
import type { LibraryTheme } from "../../../shared/theme-library"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"

// The theme stays in the list until the main process has deleted it, so a
// failed delete never hides a theme that comes back on the next launch.
export function useDeleteImportedTheme(onDeleted: (libraryTheme: LibraryTheme) => void) {
  const runtime = use(RendererRuntimeContext)
  const [failureMessage, setFailureMessage] = useState<string | null>(null)

  const deleteImportedTheme = (libraryTheme: LibraryTheme) => {
    setFailureMessage(null)
    runtime.runFork(
      Effect.gen(function* () {
        const bridge = yield* DesktopBridge
        yield* bridge.deleteImportedTheme(libraryTheme.id)
        yield* Effect.sync(() => onDeleted(libraryTheme))
      }).pipe(
        Effect.catchTag("DesktopBridgeError", (error) =>
          Effect.logWarning("Could not delete a theme", error).pipe(
            Effect.andThen(
              Effect.sync(() => setFailureMessage(`Could not delete ${libraryTheme.theme.name}.`)),
            ),
          ),
        ),
      ),
    )
  }

  return { deleteImportedTheme, failureMessage }
}

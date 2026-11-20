import { Effect, Option } from "effect"
import { use, useState } from "react"
import type { LibraryTheme } from "../../../shared/theme-library"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { RendererRuntimeContext, type RendererServices } from "../../lib/renderer-runtime"

interface ThemeFileMessage {
  readonly kind: "status" | "error"
  readonly text: string
}

const errorMessage = (text: string): ThemeFileMessage => ({ kind: "error", text })

const importThemeFile = (onImport: (importedTheme: LibraryTheme) => void) =>
  Effect.gen(function* () {
    const bridge = yield* DesktopBridge
    const importedTheme = yield* bridge.importThemeFile
    if (Option.isNone(importedTheme)) {
      return null
    }
    yield* Effect.sync(() => onImport(importedTheme.value))
    const text = `Imported ${importedTheme.value.theme.name}. Choose it in the list to use it.`
    return { kind: "status", text } satisfies ThemeFileMessage
  }).pipe(
    Effect.catchTag("ThemeImportFailed", (error) => Effect.succeed(errorMessage(error.message))),
    Effect.catchTag("DesktopBridgeError", (error) =>
      Effect.logWarning("Could not import a theme", error).pipe(
        Effect.as(errorMessage("Could not import the theme.")),
      ),
    ),
  )

const exportCurrentTheme = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const exportedFile = yield* bridge.exportCurrentTheme
  return Option.match(exportedFile, {
    onNone: () => null,
    onSome: (file): ThemeFileMessage => ({
      kind: "status",
      text: `Exported the theme to ${file}.`,
    }),
  })
}).pipe(
  Effect.catchTag("DesktopBridgeError", (error) =>
    Effect.logWarning("Could not export the theme", error).pipe(
      Effect.as(errorMessage("Could not export the theme.")),
    ),
  ),
)

export function useThemeFiles(onImport: (importedTheme: LibraryTheme) => void) {
  const runtime = use(RendererRuntimeContext)
  const [message, setMessage] = useState<ThemeFileMessage | null>(null)

  const runAction = (action: Effect.Effect<ThemeFileMessage | null, never, RendererServices>) => {
    setMessage(null)
    runtime.runFork(
      action.pipe(Effect.tap((nextMessage) => Effect.sync(() => setMessage(nextMessage)))),
    )
  }

  return {
    message,
    importThemeFile: () => runAction(importThemeFile(onImport)),
    exportCurrentTheme: () => runAction(exportCurrentTheme),
  }
}

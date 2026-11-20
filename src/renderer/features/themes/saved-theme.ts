import { Effect, Option } from "effect"
import { defaultThemeId } from "../../../shared/built-in-themes"
import { type LibraryTheme, findLibraryTheme, themeLibrary } from "../../../shared/theme-library"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { applyTheme } from "./apply-theme"

export interface SavedThemeLibrary {
  readonly themes: ReadonlyArray<LibraryTheme>
  readonly savedTheme: LibraryTheme
}

const builtInThemesOnly: SavedThemeLibrary = {
  themes: themeLibrary([]),
  savedTheme: findLibraryTheme(themeLibrary([]), defaultThemeId),
}

export const loadSavedThemeLibrary = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const themes = themeLibrary(yield* bridge.listImportedThemes)
  const savedThemeId = yield* bridge.getSetting("themeId")
  const savedTheme = findLibraryTheme(
    themes,
    Option.getOrElse(savedThemeId, () => defaultThemeId),
  )
  return { themes, savedTheme } satisfies SavedThemeLibrary
}).pipe(
  Effect.catchTag("DesktopBridgeError", (error) =>
    Effect.logWarning("Could not read the saved theme", error).pipe(Effect.as(builtInThemesOnly)),
  ),
)

export const restoreSavedTheme = Effect.gen(function* () {
  const { savedTheme } = yield* loadSavedThemeLibrary
  applyTheme(savedTheme.theme)
})

export const selectTheme = Effect.fn("selectTheme")(
  function* (libraryTheme: LibraryTheme) {
    applyTheme(libraryTheme.theme)
    const bridge = yield* DesktopBridge
    yield* bridge.setSetting("themeId", libraryTheme.id)
  },
  Effect.catchTag("DesktopBridgeError", (error) =>
    Effect.logWarning("Could not save the selected theme", error),
  ),
)

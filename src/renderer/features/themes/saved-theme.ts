import { Effect } from "effect"
import { defaultThemeId } from "../../../shared/built-in-themes"
import { type LibraryTheme, findLibraryTheme, themeLibrary } from "../../../shared/theme-library"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { loadSavedSetting, saveSetting } from "../../lib/saved-setting"
import { applyTheme } from "./apply-theme"

export interface SavedThemeLibrary {
  readonly themes: ReadonlyArray<LibraryTheme>
  readonly savedTheme: LibraryTheme
}

export const loadSavedThemeLibrary = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const importedThemes = yield* bridge.listImportedThemes.pipe(
    Effect.catchTag("DesktopBridgeError", (error) =>
      Effect.logWarning("Could not read the imported themes", error).pipe(Effect.as([])),
    ),
  )
  const themes = themeLibrary(importedThemes)
  const savedThemeId = yield* loadSavedSetting("themeId", defaultThemeId)
  return { themes, savedTheme: findLibraryTheme(themes, savedThemeId) } satisfies SavedThemeLibrary
})

export const restoreSavedTheme = Effect.gen(function* () {
  const { savedTheme } = yield* loadSavedThemeLibrary
  applyTheme(savedTheme.theme)
})

export const selectTheme = Effect.fn("selectTheme")(function* (libraryTheme: LibraryTheme) {
  applyTheme(libraryTheme.theme)
  yield* saveSetting("themeId", libraryTheme.id)
})

import { Schema } from "effect"
import { builtInThemes, defaultThemeId } from "./built-in-themes"
import { Theme } from "./theme"

// Built-in themes have fixed ids such as "dark", and imported themes get a
// random UUID, so the two never collide.
export const ThemeId = Schema.NonEmptyString

export type ThemeId = typeof ThemeId.Type

export const LibraryTheme = Schema.Struct({ id: ThemeId, theme: Theme })

export type LibraryTheme = typeof LibraryTheme.Type

const builtInLibraryThemes: ReadonlyArray<LibraryTheme> = Object.entries(builtInThemes).map(
  ([id, theme]) => ({ id, theme }),
)

// Every theme the user can pick: the built-in ones first, then the imported
// ones in the order they were first imported.
export const themeLibrary = (
  importedThemes: ReadonlyArray<LibraryTheme>,
): ReadonlyArray<LibraryTheme> => [...builtInLibraryThemes, ...importedThemes]

// A saved id can come from a newer build or name a theme that is gone, and
// the app must still have a theme to show.
export const findLibraryTheme = (
  library: ReadonlyArray<LibraryTheme>,
  themeId: ThemeId,
): LibraryTheme =>
  library.find((libraryTheme) => libraryTheme.id === themeId) ?? {
    id: defaultThemeId,
    theme: builtInThemes[defaultThemeId],
  }

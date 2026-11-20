import { Effect, Option } from "effect"
import { builtInThemes, defaultThemeId } from "../shared/built-in-themes"
import { findLibraryTheme, themeLibrary } from "../shared/theme-library"
import { ImportedThemes } from "./imported-themes"
import { Settings } from "./settings"

export const loadSavedTheme = Effect.gen(function* () {
  const settings = yield* Settings
  const importedThemes = yield* ImportedThemes
  const savedThemeId = yield* settings.get("themeId")
  const library = themeLibrary(yield* importedThemes.list)
  return findLibraryTheme(
    library,
    Option.getOrElse(savedThemeId, () => defaultThemeId),
  ).theme
}).pipe(
  Effect.catchTag("SchemaError", (error) =>
    Effect.logWarning("The saved theme cannot be read", error).pipe(
      Effect.as(builtInThemes[defaultThemeId]),
    ),
  ),
)

import path from "node:path"
import { Effect, FileSystem, Option, Schema } from "effect"
import { builtInThemes } from "../shared/built-in-themes"
import { type Theme, ThemeFile, decodeThemeFile } from "../shared/theme"
import { ThemeImportFailed } from "../shared/theme-file-replies"
import { ImportedThemes } from "./imported-themes"
import { loadSavedTheme } from "./saved-theme"
import { ThemeFileDialogs } from "./theme-file-dialogs"

const isBuiltInTheme = (theme: Theme) =>
  Object.values(builtInThemes).some(
    (builtInTheme) => builtInTheme.name === theme.name && builtInTheme.author === theme.author,
  )

// docs/themes.md asks authors to name a theme file after the theme, like
// `ember.json`. Characters such as "/" cannot appear in a file name.
const suggestedFileName = (theme: Theme) => {
  const slug = theme.name
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, "-")
    .replaceAll(/^-|-$/g, "")
  return `${slug || "theme"}.json`
}

const readThemeFile = Effect.fn("readThemeFile")(function* (filePath: string) {
  const fileSystem = yield* FileSystem.FileSystem
  const fileName = path.basename(filePath)
  const fileContents = yield* fileSystem
    .readFileString(filePath)
    .pipe(Effect.mapError(() => new ThemeImportFailed({ message: `Could not read ${fileName}.` })))
  return yield* decodeThemeFile(fileContents).pipe(
    Effect.mapError(
      (error) =>
        new ThemeImportFailed({ message: `${fileName} is not a valid theme. ${error.message}` }),
    ),
  )
})

// Resolves to the imported theme, or to none when the user cancels.
export const importThemeFile = Effect.gen(function* () {
  const dialogs = yield* ThemeFileDialogs
  const importedThemes = yield* ImportedThemes
  const chosenFile = yield* dialogs.chooseFileToImport
  if (Option.isNone(chosenFile)) {
    return Option.none()
  }
  const theme = yield* readThemeFile(chosenFile.value)
  if (isBuiltInTheme(theme)) {
    return yield* new ThemeImportFailed({
      message: `“${theme.name}” by ${theme.author} is a built-in theme. Give your theme another name to import it.`,
    })
  }
  const replacesTheme = yield* importedThemes.hasSameNameAndAuthor(theme)
  if (replacesTheme && !(yield* dialogs.confirmReplace(theme))) {
    return Option.none()
  }
  return Option.some(yield* importedThemes.save(theme))
})

// Resolves to the file written, or to none when the user cancels.
export const exportCurrentTheme = Effect.gen(function* () {
  const dialogs = yield* ThemeFileDialogs
  const fileSystem = yield* FileSystem.FileSystem
  const theme = yield* loadSavedTheme
  const chosenFile = yield* dialogs.chooseExportFile(suggestedFileName(theme))
  if (Option.isNone(chosenFile)) {
    return Option.none()
  }
  yield* fileSystem.writeFileString(chosenFile.value, yield* Schema.encodeEffect(ThemeFile)(theme))
  return chosenFile
})

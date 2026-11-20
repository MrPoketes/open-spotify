import { Effect, Option, Schema } from "effect"
import { ExportThemeReply, ImportThemeReply } from "../shared/theme-file-replies"
import { ImportedThemes } from "./imported-themes"
import { exportCurrentTheme, importThemeFile } from "./theme-files"

export const listImportedThemesFromIpc = Effect.gen(function* () {
  const importedThemes = yield* ImportedThemes
  return yield* importedThemes.list
})

export const importThemeFileFromIpc = Effect.gen(function* () {
  const reply = yield* importThemeFile.pipe(
    Effect.map(
      Option.match({
        onNone: () => ({ _tag: "ThemeImportCanceled" }) as const,
        onSome: (importedTheme) => ({ _tag: "ThemeImported", importedTheme }) as const,
      }),
    ),
    Effect.catchTag("ThemeImportFailed", Effect.succeed),
  )
  return yield* Schema.encodeEffect(ImportThemeReply)(reply)
})

export const exportCurrentThemeFromIpc = exportCurrentTheme.pipe(
  Effect.flatMap(Schema.encodeEffect(ExportThemeReply)),
)

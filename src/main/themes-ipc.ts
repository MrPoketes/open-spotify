import type { BaseWindow } from "electron"
import { Effect, Option, Schema } from "effect"
import { ipcChannels } from "../shared/ipc-channels"
import { Theme } from "../shared/theme"
import { ExportThemeReply, ImportThemeReply } from "../shared/theme-file-replies"
import type { LibraryTheme } from "../shared/theme-library"
import { decodeIpcRequest } from "./decode-ipc-request"
import { ImportedThemes } from "./imported-themes"
import { exportCurrentTheme, importThemeFile, saveTheme } from "./theme-files"

export const listImportedThemesFromIpc = Effect.gen(function* () {
  const importedThemes = yield* ImportedThemes
  return yield* importedThemes.list
})

const importReply = Option.match({
  onNone: () => ({ _tag: "ThemeImportCanceled" }) as const,
  onSome: (importedTheme: LibraryTheme) => ({ _tag: "ThemeImported", importedTheme }) as const,
})

export const importThemeFileFromIpc = Effect.fn("importThemeFileFromIpc")(function* (
  parentWindow: BaseWindow | null,
) {
  const reply = yield* importThemeFile(parentWindow).pipe(
    Effect.map(importReply),
    Effect.catchTag("ThemeImportFailed", Effect.succeed),
  )
  return yield* Schema.encodeEffect(ImportThemeReply)(reply)
})

// An edited theme is stored as an imported theme, so saving one replies like
// an import.
export const saveEditedThemeFromIpc = Effect.fn("saveEditedThemeFromIpc")(function* (
  parentWindow: BaseWindow | null,
  request: unknown,
) {
  const theme = yield* decodeIpcRequest(ipcChannels.saveEditedTheme, Theme, request)
  const reply = yield* saveTheme(parentWindow, theme).pipe(
    Effect.map(importReply),
    Effect.catchTag("ThemeImportFailed", Effect.succeed),
  )
  return yield* Schema.encodeEffect(ImportThemeReply)(reply)
})

export const exportCurrentThemeFromIpc = Effect.fn("exportCurrentThemeFromIpc")(function* (
  parentWindow: BaseWindow | null,
) {
  const exportedFile = yield* exportCurrentTheme(parentWindow)
  return yield* Schema.encodeEffect(ExportThemeReply)(exportedFile)
})

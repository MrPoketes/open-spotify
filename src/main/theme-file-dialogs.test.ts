import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { builtInThemes } from "../shared/built-in-themes"
import { ThemeFileDialogs } from "./theme-file-dialogs"

const replyingDialogModule = ({ canceled = false, messageBoxResponse = 0 } = {}) => ({
  showOpenDialog: () =>
    Promise.resolve({ canceled, filePaths: canceled ? [] : ["/themes/sunset.json"] }),
  // Electron reports a cancelled save dialog as an empty path, which must
  // never reach the file system as a place to write.
  showSaveDialog: () =>
    Promise.resolve({ canceled, filePath: canceled ? "" : "/themes/sunset.json" }),
  showMessageBox: () => Promise.resolve({ response: messageBoxResponse, checkboxChecked: false }),
})

const confirmReplacePressing = (messageBoxResponse: number) =>
  Effect.gen(function* () {
    const dialogs = yield* ThemeFileDialogs
    return yield* dialogs.confirmReplace(null, builtInThemes.dark)
  }).pipe(Effect.provide(ThemeFileDialogs.layer(replyingDialogModule({ messageBoxResponse }))))

describe("ThemeFileDialogs", () => {
  it.effect("chooses no file when the user cancels either file dialog", () =>
    Effect.gen(function* () {
      const dialogs = yield* ThemeFileDialogs

      assert.deepStrictEqual(yield* dialogs.chooseFileToImport(null), Option.none())
      assert.deepStrictEqual(yield* dialogs.chooseExportFile(null, "sunset.json"), Option.none())
    }).pipe(Effect.provide(ThemeFileDialogs.layer(replyingDialogModule({ canceled: true })))),
  )

  it.effect("chooses the file the user picked in either file dialog", () =>
    Effect.gen(function* () {
      const dialogs = yield* ThemeFileDialogs

      assert.deepStrictEqual(
        yield* dialogs.chooseFileToImport(null),
        Option.some("/themes/sunset.json"),
      )
      assert.deepStrictEqual(
        yield* dialogs.chooseExportFile(null, "sunset.json"),
        Option.some("/themes/sunset.json"),
      )
    }).pipe(Effect.provide(ThemeFileDialogs.layer(replyingDialogModule()))),
  )

  // The buttons are ["Replace", "Cancel"]; only the first replaces a theme.
  it.effect("replaces a theme only when the user presses Replace", () =>
    Effect.gen(function* () {
      assert.isTrue(yield* confirmReplacePressing(0))
      assert.isFalse(yield* confirmReplacePressing(1))
    }),
  )
})

import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { builtInThemes } from "../shared/built-in-themes"
import { ThemeFileDialogs } from "./theme-file-dialogs"

const pressingDialogModule = (messageBoxResponse: number) => ({
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
  showSaveDialog: () => Promise.resolve({ canceled: true, filePath: "" }),
  showMessageBox: () => Promise.resolve({ response: messageBoxResponse, checkboxChecked: false }),
})

const confirmReplace = Effect.gen(function* () {
  const dialogs = yield* ThemeFileDialogs
  return yield* dialogs.confirmReplace(null, builtInThemes.dark)
})

const confirmReplacePressing = Effect.fn("confirmReplacePressing")((messageBoxResponse: number) =>
  confirmReplace.pipe(
    Effect.provide(ThemeFileDialogs.layer(pressingDialogModule(messageBoxResponse))),
  ),
)

describe("ThemeFileDialogs", () => {
  // The buttons are ["Replace", "Cancel"]; only the first replaces a theme.
  it.effect("replaces a theme only when the user presses Replace", () =>
    Effect.gen(function* () {
      assert.isTrue(yield* confirmReplacePressing(0))
      assert.isFalse(yield* confirmReplacePressing(1))
    }),
  )
})

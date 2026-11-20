import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
import { builtInThemes } from "../shared/built-in-themes"
import { databaseLayer } from "./database"
import { ImportedThemes } from "./imported-themes"
import { ThemeFileDialogs } from "./theme-file-dialogs"
import { saveEditedThemeFromIpc } from "./themes-ipc"

// The editor never opens a file dialog, and no test here replaces a theme.
const unusedDialogs = ThemeFileDialogs.of({
  chooseFileToImport: () => Effect.succeed(Option.none()),
  chooseExportFile: () => Effect.succeed(Option.none()),
  confirmReplace: () => Effect.succeed(false),
})

const freshStorage = () =>
  Layer.mergeAll(ImportedThemes.layer, Layer.succeed(ThemeFileDialogs)(unusedDialogs)).pipe(
    Layer.provide(databaseLayer(":memory:")),
  )

const storedThemes = Effect.gen(function* () {
  const importedThemes = yield* ImportedThemes
  return yield* importedThemes.list
})

const editedTheme = {
  ...builtInThemes.dark,
  name: "Open Spotify Dark (copy)",
  tokens: { ...builtInThemes.dark.tokens, "color-accent": "#ffaa00" },
}

describe("saveEditedThemeFromIpc", () => {
  it.effect("stores the edited theme beside the imported themes and replies with it", () =>
    Effect.gen(function* () {
      const reply = yield* saveEditedThemeFromIpc(null, editedTheme)

      const [storedTheme] = yield* storedThemes
      assert.isDefined(storedTheme)
      assert.deepStrictEqual(storedTheme.theme, editedTheme)
      assert.deepStrictEqual(structuredClone(reply), {
        _tag: "ThemeImported",
        importedTheme: storedTheme,
      })
    }).pipe(Effect.provide(freshStorage())),
  )

  // The renderer validates the editor's fields, but the main process must not
  // store a theme it could not apply on the next launch.
  it.effect("rejects an edited theme with an invalid token and stores nothing", () =>
    Effect.gen(function* () {
      const brokenTheme = { ...editedTheme, tokens: { "color-accent": "orange" } }

      const error = yield* Effect.flip(saveEditedThemeFromIpc(null, brokenTheme))

      assert.strictEqual(error._tag, "MalformedIpcRequest")
      assert.deepStrictEqual(yield* storedThemes, [])
    }).pipe(Effect.provide(freshStorage())),
  )

  // Renaming the copy back must not shadow the built-in theme it came from.
  it.effect("refuses an edited theme with the name and author of a built-in theme", () =>
    Effect.gen(function* () {
      const reply = yield* saveEditedThemeFromIpc(null, {
        ...editedTheme,
        name: "Open Spotify Dark",
      })

      assert.strictEqual(reply._tag, "ThemeImportFailed")
      assert.deepStrictEqual(yield* storedThemes, [])
    }).pipe(Effect.provide(freshStorage())),
  )
})

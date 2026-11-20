import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { builtInThemes } from "../shared/built-in-themes"
import { databaseLayer } from "./database"
import { ImportedThemes } from "./imported-themes"
import { loadSavedTheme } from "./saved-theme"
import { Settings } from "./settings"

const freshStorage = () =>
  Layer.mergeAll(Settings.layer, ImportedThemes.layer).pipe(
    Layer.provideMerge(databaseLayer(":memory:")),
  )

describe("loadSavedTheme", () => {
  it.effect("returns the theme the user saved", () =>
    Effect.gen(function* () {
      const settings = yield* Settings
      yield* settings.set("themeId", "light")

      assert.deepStrictEqual(yield* loadSavedTheme, builtInThemes.light)
    }).pipe(Effect.provide(freshStorage())),
  )

  // The window opens with the saved theme's background, so an imported theme
  // has to be found again after a restart.
  it.effect("returns the imported theme the user saved", () =>
    Effect.gen(function* () {
      const settings = yield* Settings
      const importedThemes = yield* ImportedThemes
      const sunset = { ...builtInThemes.dark, name: "Sunset", author: "A theme author" }
      const { id } = yield* importedThemes.save(sunset)
      yield* settings.set("themeId", id)

      assert.deepStrictEqual(yield* loadSavedTheme, sunset)
    }).pipe(Effect.provide(freshStorage())),
  )

  // The window is created with this theme's background, so a value from a
  // newer build must fall back to a theme instead of stopping the app.
  it.effect("returns the default dark theme when the saved id names no theme", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      yield* sql`INSERT INTO settings (key, value) VALUES ('themeId', '"solarized"')`

      assert.deepStrictEqual(yield* loadSavedTheme, builtInThemes.dark)
    }).pipe(Effect.provide(freshStorage())),
  )
})

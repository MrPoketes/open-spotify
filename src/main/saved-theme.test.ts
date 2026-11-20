import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"
import { builtInThemes } from "../shared/built-in-themes"
import { databaseLayer } from "./database"
import { loadSavedTheme } from "./saved-theme"
import { Settings } from "./settings"

const freshSettings = () => Settings.layer.pipe(Layer.provideMerge(databaseLayer(":memory:")))

describe("loadSavedTheme", () => {
  it.effect("returns the theme the user saved", () =>
    Effect.gen(function* () {
      const settings = yield* Settings
      yield* settings.set("themeId", "light")

      assert.deepStrictEqual(yield* loadSavedTheme, builtInThemes.light)
    }).pipe(Effect.provide(freshSettings())),
  )

  // The window is created with this theme's background, so a value from a
  // newer build must fall back to a theme instead of stopping the app.
  it.effect("returns the default dark theme when the saved id is not a built-in theme", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      yield* sql`INSERT INTO settings (key, value) VALUES ('themeId', '"solarized"')`

      assert.deepStrictEqual(yield* loadSavedTheme, builtInThemes.dark)
    }).pipe(Effect.provide(freshSettings())),
  )
})

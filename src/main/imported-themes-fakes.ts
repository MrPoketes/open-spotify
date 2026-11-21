import { Effect, Layer } from "effect"
import { databaseLayer } from "./database"
import { ImportedThemes } from "./imported-themes"
import { Settings } from "./settings"

// Each call opens its own in-memory database, so tests never share themes.
// The database stays accessible so a test can inspect its rows.
export const freshThemeStorage = () =>
  Layer.mergeAll(Settings.layer, ImportedThemes.layer).pipe(
    Layer.provideMerge(databaseLayer(":memory:")),
  )

export const storedThemes = Effect.gen(function* () {
  const importedThemes = yield* ImportedThemes
  return yield* importedThemes.list
})

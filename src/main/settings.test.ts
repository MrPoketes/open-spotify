import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Option } from "effect"
import { SqlClient } from "effect/sql"
import { databaseLayer } from "./database"
import { Settings } from "./settings"

const freshSettings = () => Settings.layer.pipe(Layer.provideMerge(databaseLayer(":memory:")))

describe("Settings", () => {
  // A user who pastes a new Client ID must not keep logging in with the old one.
  it.effect("replaces the previous value when a setting is set again", () =>
    Effect.gen(function* () {
      const settings = yield* Settings

      yield* settings.set("spotifyClientId", "old-client-id")
      yield* settings.set("spotifyClientId", "new-client-id")

      assert.deepStrictEqual(yield* settings.get("spotifyClientId"), Option.some("new-client-id"))
    }).pipe(Effect.provide(freshSettings())),
  )

  // A stored value written by an older build may no longer match its Schema.
  it.effect("fails with SchemaError when a stored value does not match its schema", () =>
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient
      const settings = yield* Settings
      yield* sql`INSERT INTO settings (key, value) VALUES ('spotifyClientId', '""')`

      const error = yield* Effect.flip(settings.get("spotifyClientId"))

      assert.strictEqual(error._tag, "SchemaError")
    }).pipe(Effect.provide(freshSettings())),
  )
})

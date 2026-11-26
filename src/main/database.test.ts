import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem } from "effect"
import { Database, databaseLayer } from "./database"
import { settingsTable } from "./database-schema"

layer(NodeFileSystem.layer)("databaseLayer", (it) => {
  // Migrations run on every launch, so a second run against an existing
  // database must neither fail nor touch the user's data.
  it.effect("keeps stored data when migrations run again on the next launch", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem
      const databaseFile = path.join(yield* fileSystem.makeTempDirectoryScoped(), "test.sqlite")
      const firstLaunch = databaseLayer(databaseFile)
      const secondLaunch = databaseLayer(databaseFile)

      yield* Effect.gen(function* () {
        const database = yield* Database
        yield* database.run((db) =>
          db.insert(settingsTable).values({ key: "spotifyClientId", value: '"abc"' }),
        )
      }).pipe(Effect.provide(firstLaunch))

      const rows = yield* Effect.gen(function* () {
        const database = yield* Database
        return yield* database.run((db) => db.select().from(settingsTable))
      }).pipe(Effect.provide(secondLaunch))

      assert.deepStrictEqual(rows, [{ key: "spotifyClientId", value: '"abc"' }])
    }),
  )

  // Multi-step storage changes rely on withTransaction so a failure partway
  // through leaves the database unchanged.
  it.effect("rolls back writes when a transaction fails", () =>
    Effect.gen(function* () {
      const database = yield* Database

      const error = yield* Effect.flip(
        database.withTransaction(
          Effect.gen(function* () {
            yield* database.run((db) =>
              db.insert(settingsTable).values({ key: "themeId", value: '"light"' }),
            )
            return yield* Effect.fail("aborted")
          }),
        ),
      )

      assert.strictEqual(error, "aborted")
      assert.deepStrictEqual(yield* database.run((db) => db.select().from(settingsTable)), [])
    }).pipe(Effect.provide(databaseLayer(":memory:"))),
  )
})

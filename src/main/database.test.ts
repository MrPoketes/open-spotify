import path from "node:path"
import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem"
import { assert, layer } from "@effect/vitest"
import { Effect, FileSystem } from "effect"
import { SqlClient } from "effect/sql"
import { databaseLayer } from "./database"

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
        const sql = yield* SqlClient.SqlClient
        yield* sql`INSERT INTO settings (key, value) VALUES ('spotifyClientId', '"abc"')`
      }).pipe(Effect.provide(firstLaunch))

      const rows = yield* Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient
        return yield* sql`SELECT key, value FROM settings`
      }).pipe(Effect.provide(secondLaunch))

      assert.deepStrictEqual(rows, [{ key: "spotifyClientId", value: '"abc"' }])
    }),
  )
})

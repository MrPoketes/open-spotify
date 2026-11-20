import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import * as SqliteMigrator from "@effect/sql-sqlite-node/SqliteMigrator"
import { Effect, Layer } from "effect"
import { SqlClient } from "effect/sql"

// Applied in key order, once each. Never edit a migration that has shipped:
// add a new one, because existing databases have already run the old one.
const migrations = SqliteMigrator.fromRecord({
  "0001_create_settings": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    yield* sql`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  }),
})

// Migrations run while the layer is built, so every service that uses the
// database sees the latest schema.
export const databaseLayer = (filename: string) =>
  SqliteMigrator.layer({ loader: migrations }).pipe(
    Layer.provideMerge(SqliteClient.layer({ filename })),
  )

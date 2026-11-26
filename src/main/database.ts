import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient"
import * as SqliteMigrator from "@effect/sql-sqlite-node/SqliteMigrator"
import type { EffectDrizzleQueryError } from "drizzle-orm/effect-core"
import * as SqliteDrizzle from "drizzle-orm/effect-sqlite-node"
import { Cause, Context, Effect, Layer } from "effect"
import { SqlClient, SqlError } from "effect/sql"

type DrizzleDatabase = SqliteDrizzle.EffectSQLiteNodeDatabase

// Drizzle wraps SQLite failures in EffectDrizzleQueryError; unwrap back to
// SqlError so storage services expose one database error type.
const toSqlError = (error: EffectDrizzleQueryError): SqlError.SqlError => {
  const underlying = Cause.isCause(error.cause) ? Cause.squash(error.cause) : error.cause
  if (SqlError.isSqlError(underlying)) {
    return underlying
  }
  return new SqlError.SqlError({
    reason: new SqlError.UnknownError({ cause: error, message: error.message }),
  })
}

export class Database extends Context.Service<
  Database,
  {
    readonly run: <A>(
      buildQuery: (drizzle: DrizzleDatabase) => Effect.Effect<A, EffectDrizzleQueryError>,
    ) => Effect.Effect<A, SqlError.SqlError>
    readonly withTransaction: <A, E, R>(
      effect: Effect.Effect<A, E, R>,
    ) => Effect.Effect<A, E | SqlError.SqlError, R>
  }
>()("open-spotify/Database") {
  static readonly layer = Layer.effect(
    Database,
    Effect.gen(function* () {
      const drizzle = yield* SqliteDrizzle.makeWithDefaults()
      return Database.of({
        run: (buildQuery) => buildQuery(drizzle).pipe(Effect.mapError(toSqlError)),
        withTransaction: (effect) => drizzle.transaction(() => effect),
      })
    }),
  )
}

// Applied in key order, once each. Never edit a migration that has shipped:
// add a new one, because existing databases have already run the old one.
const migrations = SqliteMigrator.fromRecord({
  "0001_create_settings": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    // oxlint-disable-next-line open-spotify/no-raw-sql -- shipped migration 0001 cannot be edited because existing databases already applied it
    yield* sql`CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  }),
  // A row is a folder when spotify_uri is null, and a Spotify item otherwise.
  // node:sqlite enables foreign keys by default, so deleting a folder deletes
  // everything inside it.
  "0002_create_folder_entries": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    // oxlint-disable-next-line open-spotify/no-raw-sql -- shipped migration 0002 cannot be edited because existing databases already applied it
    yield* sql`
      CREATE TABLE folder_entries (
        id TEXT PRIMARY KEY,
        parent_id TEXT REFERENCES folder_entries (id) ON DELETE CASCADE,
        position INTEGER NOT NULL,
        name TEXT NOT NULL,
        spotify_uri TEXT,
        image_url TEXT,
        UNIQUE (parent_id, spotify_uri),
        CHECK (spotify_uri IS NULL OR parent_id IS NOT NULL)
      )
    `
  }),
  // A theme is identified by its name and author, so importing a new version
  // of a theme replaces the old one. The theme column holds the theme file.
  "0003_create_imported_themes": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
    // oxlint-disable-next-line open-spotify/no-raw-sql -- shipped migration 0003 cannot be edited because existing databases already applied it
    yield* sql`
      CREATE TABLE imported_themes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        author TEXT NOT NULL,
        theme TEXT NOT NULL,
        UNIQUE (name, author)
      )
    `
  }),
})

// Migrations run while the layer is built, so every service that uses the
// database sees the latest schema.
export const databaseLayer = (filename: string) =>
  Database.layer.pipe(
    Layer.provide(
      SqliteMigrator.layer({ loader: migrations }).pipe(
        Layer.provideMerge(SqliteClient.layer({ filename })),
      ),
    ),
  )

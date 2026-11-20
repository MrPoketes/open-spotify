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
  // A row is a folder when spotify_uri is null, and a Spotify item otherwise.
  // node:sqlite enables foreign keys by default, so deleting a folder deletes
  // everything inside it.
  "0002_create_folder_entries": Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient
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
  SqliteMigrator.layer({ loader: migrations }).pipe(
    Layer.provideMerge(SqliteClient.layer({ filename })),
  )

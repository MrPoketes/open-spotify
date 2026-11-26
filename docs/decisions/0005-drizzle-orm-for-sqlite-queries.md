# 0005: Drizzle ORM for SQLite queries

**Status:** accepted (2026-11-26)

## Context

Main-process storage (`settings`, `folder_entries`, `imported_themes`) previously wrote queries by
hand with Effect's `sql` tagged template. Table names, column names, and query result shapes lived
inside string literals, so a typo or renamed column surfaced only at runtime.

We need a type-safe query builder that:

- works with **Effect v4** (`effect@4.1.5`) and `@effect/sql-sqlite-node` (`node:sqlite`);
- bundles into `out/main/main.js` with `externalizeDeps: false` and no native modules
  ([decision 0004](0004-bundle-main-process-dependencies.md));
- keeps queries as Effects with typed errors (`SqlError`) and preserves existing SQLite databases.

Options weighed:

1. **`drizzle-orm@1.0.0-rc.6` (`drizzle-orm/effect-sqlite-node`).** Ships a first-party Effect v4
   driver (`effect >=4.0.0`, `@effect/sql-sqlite-node >=4.0.0`) directly on top of `SqliteClient`.
   Queries return native `Effect`s, transactions delegate to `SqliteClient.withTransaction`, and
   `drizzle-orm` adds no transitive runtime dependencies.
2. **`drizzle-orm` `sqlite-proxy` over `SqlClient`.** Works on Drizzle 0.45.x, but requires
   bridging `Effect` to `Promise` on every query and manually preserving fiber-scoped transactions.
3. **Kysely.** `@effect/sql-kysely@0.48.0` declares `effect ^3.22.0` as a peer, and Kysely's
   built-in `SqliteDialect` expects `better-sqlite3` (a native module). Using Kysely with
   `node:sqlite` and Effect v4 would require maintaining a custom driver adapter and Promise-to-Effect
   wrapper.
4. **`@effect/sql-drizzle@0.51.1`.** Declares `effect ^3` and `drizzle-orm <0.50` as peers, so it
   does not fit Effect v4.

## Decision

Use **Drizzle ORM** (`drizzle-orm@1.0.0-rc.6`, pinned exact) through its native
`drizzle-orm/effect-sqlite-node` driver:

- Define all SQLite tables once in `src/main/database-schema.ts`.
- Expose a `Database` service in `src/main/database.ts` (`run` for queries, `withTransaction` for
  atomic multi-step operations) that unwraps Drizzle's `EffectDrizzleQueryError` back to
  `SqlError.SqlError`, keeping one database error type across main-process services.
- Keep decoding stored values at the edge with Effect `Schema` (`ThemeFile`, `FolderEntryRow`, and
  setting JSON schemas).
- Keep **migrations** in `SqliteMigrator.fromRecord` in `src/main/database.ts`. Shipped migrations
  `0001` through `0003` stay unchanged because existing databases already record them in
  `effect_sql_migrations`. Future schema changes update `src/main/database-schema.ts` and add the
  next numbered `SqliteMigrator` step in `src/main/database.ts` (any DDL statement carries an
  explicit disable reason; any data backfill uses Drizzle). This avoids bundling separate `.sql`
  files or maintaining a second migration tracking table.
- Enforce the boundary with `open-spotify/no-raw-sql`, which forbids raw `sql` tagged templates
  and `sql.unsafe` / `sql.literal` / `sql.raw` calls everywhere except the already-shipped
  migrations (with a written reason).

## Consequences

- Column and table typos fail `pnpm typecheck` instead of failing at runtime.
- `drizzle-orm@1.0.0-rc.6` is a release candidate pinned to an exact version; upgrade to `1.0.0`
  once Drizzle 1.0 reaches GA.
- Existing databases continue to open and migrate without changes.

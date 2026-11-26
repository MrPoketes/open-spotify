import { and, asc, eq } from "drizzle-orm"
import { rowId } from "drizzle-orm/sqlite-core/expressions"
import { Context, Effect, Layer, Schema } from "effect"
import type { SqlError } from "effect/sql"
import { type Theme, ThemeFile } from "../shared/theme"
import type { LibraryTheme, ThemeId } from "../shared/theme-library"
import { Database } from "./database"
import { importedThemesTable } from "./database-schema"

type StorageError = SqlError.SqlError | Schema.SchemaError

const ImportedThemeRow = Schema.Struct({ id: Schema.String, theme: ThemeFile })

export class ImportedThemes extends Context.Service<
  ImportedThemes,
  {
    readonly list: Effect.Effect<ReadonlyArray<LibraryTheme>, StorageError>
    readonly hasSameNameAndAuthor: (theme: Theme) => Effect.Effect<boolean, StorageError>
    // Replaces the imported theme with the same name and author, keeping its
    // id, so a theme the user picked stays picked when it is updated.
    readonly save: (theme: Theme) => Effect.Effect<LibraryTheme, StorageError>
    readonly delete: (themeId: ThemeId) => Effect.Effect<void, SqlError.SqlError>
  }
>()("open-spotify/ImportedThemes") {
  static readonly layer = Layer.effect(
    ImportedThemes,
    Effect.gen(function* () {
      const database = yield* Database

      // An upsert keeps a row's rowid, so a replaced theme keeps its place.
      const list = database
        .run((drizzle) =>
          drizzle
            .select({ id: importedThemesTable.id, theme: importedThemesTable.theme })
            .from(importedThemesTable)
            .orderBy(asc(rowId())),
        )
        .pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(ImportedThemeRow))))

      const hasSameNameAndAuthor = Effect.fn("ImportedThemes.hasSameNameAndAuthor")(function* (
        theme: Theme,
      ) {
        const rows = yield* database.run((drizzle) =>
          drizzle
            .select({ id: importedThemesTable.id })
            .from(importedThemesTable)
            .where(
              and(
                eq(importedThemesTable.name, theme.name),
                eq(importedThemesTable.author, theme.author),
              ),
            )
            .limit(1),
        )
        return rows.length > 0
      })

      const save = Effect.fn("ImportedThemes.save")(function* (theme: Theme) {
        const encodedTheme = yield* Schema.encodeEffect(ThemeFile)(theme)
        const rows = yield* database.run((drizzle) =>
          drizzle
            .insert(importedThemesTable)
            .values({
              id: crypto.randomUUID(),
              name: theme.name,
              author: theme.author,
              theme: encodedTheme,
            })
            .onConflictDoUpdate({
              target: [importedThemesTable.name, importedThemesTable.author],
              set: { theme: encodedTheme },
            })
            .returning({ id: importedThemesTable.id }),
        )
        const savedRow = rows[0]
        if (savedRow === undefined) {
          // An upsert always returns the row it wrote.
          return yield* Effect.die("Upsert into imported_themes returned no row")
        }
        return { id: savedRow.id, theme }
      })

      const deleteTheme = (themeId: ThemeId) =>
        database
          .run((drizzle) =>
            drizzle.delete(importedThemesTable).where(eq(importedThemesTable.id, themeId)),
          )
          .pipe(Effect.asVoid)

      return ImportedThemes.of({ list, hasSameNameAndAuthor, save, delete: deleteTheme })
    }),
  )
}

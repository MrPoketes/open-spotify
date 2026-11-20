import { Context, Effect, Layer, Option, Schema } from "effect"
import { SqlClient, type SqlError, SqlSchema } from "effect/sql"
import { type Theme, ThemeFile } from "../shared/theme"
import type { LibraryTheme, ThemeId } from "../shared/theme-library"

type StorageError = SqlError.SqlError | Schema.SchemaError

const NameAndAuthor = Schema.Struct({ name: Schema.String, author: Schema.String })

export class ImportedThemes extends Context.Service<
  ImportedThemes,
  {
    readonly list: Effect.Effect<ReadonlyArray<LibraryTheme>, StorageError>
    readonly findIdByNameAndAuthor: (
      theme: Theme,
    ) => Effect.Effect<Option.Option<ThemeId>, StorageError>
    // Replaces the imported theme with the same name and author, keeping its
    // id, so a theme the user picked stays picked when it is updated.
    readonly save: (theme: Theme) => Effect.Effect<LibraryTheme, StorageError>
  }
>()("open-spotify/ImportedThemes") {
  static readonly layer = Layer.effect(
    ImportedThemes,
    Effect.gen(function* () {
      const sql = yield* SqlClient.SqlClient

      // An upsert keeps a row's rowid, so a replaced theme keeps its place.
      const list = SqlSchema.findAll({
        Request: Schema.Void,
        Result: Schema.Struct({ id: Schema.String, theme: ThemeFile }),
        execute: () => sql`SELECT id, theme FROM imported_themes ORDER BY rowid`,
      })(undefined)

      const findIdRow = SqlSchema.findOneOption({
        Request: NameAndAuthor,
        Result: Schema.Struct({ id: Schema.String }),
        execute: ({ name, author }) => sql`
          SELECT id FROM imported_themes WHERE name = ${name} AND author = ${author}
        `,
      })

      const findIdByNameAndAuthor = (theme: Theme) =>
        findIdRow({ name: theme.name, author: theme.author }).pipe(
          Effect.map(Option.map((row) => row.id)),
        )

      const save = Effect.fn("ImportedThemes.save")(function* (theme: Theme) {
        const existingId = yield* findIdByNameAndAuthor(theme)
        const id = Option.getOrElse(existingId, () => crypto.randomUUID())
        const themeFile = yield* Schema.encodeEffect(ThemeFile)(theme)
        yield* sql`
          INSERT INTO imported_themes (id, name, author, theme)
          VALUES (${id}, ${theme.name}, ${theme.author}, ${themeFile})
          ON CONFLICT (id) DO UPDATE SET theme = excluded.theme
        `
        return { id, theme }
      })

      return ImportedThemes.of({ list, findIdByNameAndAuthor, save })
    }),
  )
}

import { eq } from "drizzle-orm"
import { Context, Effect, Layer, Option, Schema } from "effect"
import type { SqlError } from "effect/sql"
import { settingSchemas, type SettingKey, type SettingValue } from "../shared/settings"
import { Database } from "./database"
import { settingsTable } from "./database-schema"

const storedValueSchema = <K extends SettingKey>(key: K) =>
  Schema.fromJsonString(settingSchemas[key])

export class Settings extends Context.Service<
  Settings,
  {
    readonly get: <K extends SettingKey>(
      key: K,
    ) => Effect.Effect<Option.Option<SettingValue<K>>, SqlError.SqlError | Schema.SchemaError>
    readonly set: <K extends SettingKey>(
      key: K,
      value: SettingValue<K>,
    ) => Effect.Effect<void, SqlError.SqlError | Schema.SchemaError>
  }
>()("open-spotify/Settings") {
  static readonly layer = Layer.effect(
    Settings,
    Effect.gen(function* () {
      const database = yield* Database

      const get = Effect.fn("Settings.get")(function* <K extends SettingKey>(key: K) {
        const rows = yield* database.run((drizzle) =>
          drizzle
            .select({ value: settingsTable.value })
            .from(settingsTable)
            .where(eq(settingsTable.key, key))
            .limit(1),
        )
        const storedRow = rows[0]
        if (storedRow === undefined) {
          return Option.none()
        }
        return Option.some(yield* Schema.decodeEffect(storedValueSchema(key))(storedRow.value))
      })

      const set = Effect.fn("Settings.set")(function* <K extends SettingKey>(
        key: K,
        value: SettingValue<K>,
      ) {
        const encodedValue = yield* Schema.encodeEffect(storedValueSchema(key))(value)
        yield* database.run((drizzle) =>
          drizzle
            .insert(settingsTable)
            .values({ key, value: encodedValue })
            .onConflictDoUpdate({ target: settingsTable.key, set: { value: encodedValue } }),
        )
      })

      return Settings.of({ get, set })
    }),
  )
}

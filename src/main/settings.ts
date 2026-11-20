import { Context, Effect, Layer, Option, Schema } from "effect"
import { SqlClient, type SqlError, SqlSchema } from "effect/sql"
import { SettingKey, type SettingValue, settingSchemas } from "../shared/settings"

const storedValue = <K extends SettingKey>(key: K) => Schema.fromJsonString(settingSchemas[key])

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
      const sql = yield* SqlClient.SqlClient

      const findStoredValue = SqlSchema.findOneOption({
        Request: SettingKey,
        Result: Schema.Struct({ value: Schema.String }),
        execute: (key) => sql`SELECT value FROM settings WHERE key = ${key}`,
      })

      const get = <K extends SettingKey>(key: K) =>
        findStoredValue(key).pipe(
          Effect.map(Option.map((row) => Schema.decodeEffect(storedValue(key))(row.value))),
          Effect.flatMap(Effect.transposeOption),
          Effect.withSpan("Settings.get"),
        )

      const set = <K extends SettingKey>(key: K, value: SettingValue<K>) =>
        Schema.encodeEffect(storedValue(key))(value).pipe(
          Effect.flatMap(
            (encodedValue) => sql`
              INSERT INTO settings (key, value) VALUES (${key}, ${encodedValue})
              ON CONFLICT (key) DO UPDATE SET value = excluded.value
            `,
          ),
          Effect.asVoid,
          Effect.withSpan("Settings.set"),
        )

      return Settings.of({ get, set })
    }),
  )
}

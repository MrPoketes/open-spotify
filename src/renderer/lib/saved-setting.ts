import { Effect, Option } from "effect"
import type { SettingKey, SettingValue } from "../../shared/settings"
import { DesktopBridge } from "./desktop-bridge"

// A setting that cannot be read falls back to its default, so a failing main
// process never keeps a screen from opening.
export const loadSavedSetting = Effect.fn("loadSavedSetting")(function* <K extends SettingKey>(
  key: K,
  defaultValue: SettingValue<K>,
) {
  const bridge = yield* DesktopBridge
  const savedValue = yield* bridge
    .getSetting(key)
    .pipe(
      Effect.catch((error) =>
        Effect.logWarning(`Could not read the saved ${key} setting`, error).pipe(
          Effect.as(Option.none()),
        ),
      ),
    )
  return Option.getOrElse(savedValue, () => defaultValue)
})

// For choices such as pane sizes: one that fails to save only costs the user
// that choice on the next launch, so it must not interrupt them now.
export const saveSetting = Effect.fn("saveSetting")(function* <K extends SettingKey>(
  key: K,
  value: SettingValue<K>,
) {
  const bridge = yield* DesktopBridge
  yield* bridge
    .setSetting(key, value)
    .pipe(Effect.catch((error) => Effect.logWarning(`Could not save the ${key} setting`, error)))
})

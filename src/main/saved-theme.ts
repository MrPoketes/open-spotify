import { Effect, Option } from "effect"
import { builtInThemes, defaultThemeId } from "../shared/built-in-themes"
import { Settings } from "./settings"

export const loadSavedTheme = Effect.gen(function* () {
  const settings = yield* Settings
  const savedThemeId = yield* settings.get("themeId")
  return builtInThemes[Option.getOrElse(savedThemeId, () => defaultThemeId)]
}).pipe(
  Effect.catchTag("SchemaError", (error) =>
    Effect.logWarning("The saved theme is not a built-in theme", error).pipe(
      Effect.as(builtInThemes[defaultThemeId]),
    ),
  ),
)

import { Effect, Option } from "effect"
import { type ThemeId, builtInThemes, defaultThemeId } from "../../../shared/built-in-themes"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { applyTheme } from "./apply-theme"

export const loadSavedThemeId = Effect.gen(function* () {
  const bridge = yield* DesktopBridge
  const savedThemeId = yield* bridge.getSetting("themeId")
  return Option.getOrElse(savedThemeId, () => defaultThemeId)
}).pipe(
  Effect.catchTag("DesktopBridgeError", (error) =>
    Effect.logWarning("Could not read the saved theme", error).pipe(Effect.as(defaultThemeId)),
  ),
)

export const restoreSavedTheme = Effect.gen(function* () {
  const themeId = yield* loadSavedThemeId
  applyTheme(builtInThemes[themeId])
})

export const selectTheme = Effect.fn("selectTheme")(
  function* (themeId: ThemeId) {
    applyTheme(builtInThemes[themeId])
    const bridge = yield* DesktopBridge
    yield* bridge.setSetting("themeId", themeId)
  },
  Effect.catchTag("DesktopBridgeError", (error) =>
    Effect.logWarning("Could not save the selected theme", error),
  ),
)

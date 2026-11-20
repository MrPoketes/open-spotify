import { Effect } from "effect"
import { type ThemeId, builtInThemes, defaultThemeId } from "../../../shared/built-in-themes"
import { loadSavedSetting, saveSetting } from "../../lib/saved-setting"
import { applyTheme } from "./apply-theme"

export const loadSavedThemeId = loadSavedSetting("themeId", defaultThemeId)

export const restoreSavedTheme = Effect.gen(function* () {
  const themeId = yield* loadSavedThemeId
  applyTheme(builtInThemes[themeId])
})

export const selectTheme = Effect.fn("selectTheme")(function* (themeId: ThemeId) {
  applyTheme(builtInThemes[themeId])
  yield* saveSetting("themeId", themeId)
})

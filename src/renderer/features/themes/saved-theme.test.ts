import { assert, beforeEach, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import type { DesktopApi } from "../../../preload/desktop-api"
import { builtInThemes } from "../../../shared/built-in-themes"
import { findLibraryTheme, themeLibrary } from "../../../shared/theme-library"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { loadSavedThemeLibrary, restoreSavedTheme, selectTheme } from "./saved-theme"

const unreachableMainProcess: DesktopApi = {
  invoke: () => Promise.reject(new Error("The main process did not reply")),
}

const bridgeOver = (desktopApi: DesktopApi) =>
  Layer.succeed(DesktopBridge)(DesktopBridge.make(desktopApi))

const lightTheme = findLibraryTheme(themeLibrary([]), "light")

const sunset = {
  id: "0b7f3c2e-sunset",
  theme: { ...builtInThemes.dark, name: "Sunset", author: "A theme author" },
}

const appliedToken = (token: string) =>
  document.documentElement.style.getPropertyValue(`--theme-${token}`)

describe("saved theme", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("style")
  })

  it.effect("applies the saved theme to the document root", () =>
    Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      yield* bridge.setSetting("themeId", "light")

      yield* restoreSavedTheme

      assert.strictEqual(appliedToken("color-canvas"), builtInThemes.light.tokens["color-canvas"])
      assert.strictEqual(document.documentElement.style.colorScheme, "light")
    }).pipe(Effect.provide(bridgeOver(fakeMainProcess()))),
  )

  // Without this the app would forget an imported theme on every restart.
  it.effect("applies a saved imported theme", () =>
    Effect.gen(function* () {
      const bridge = yield* DesktopBridge
      yield* bridge.importThemeFile
      yield* bridge.setSetting("themeId", sunset.id)

      yield* restoreSavedTheme

      assert.strictEqual(appliedToken("font-body"), sunset.theme.tokens["font-body"])
      assert.deepStrictEqual((yield* loadSavedThemeLibrary).savedTheme, sunset)
    }).pipe(
      Effect.provide(
        bridgeOver(
          fakeMainProcess({ importThemeReply: { _tag: "ThemeImported", importedTheme: sunset } }),
        ),
      ),
    ),
  )

  it.effect("applies the default dark theme when no theme was saved", () =>
    Effect.gen(function* () {
      yield* restoreSavedTheme

      assert.strictEqual(appliedToken("color-canvas"), builtInThemes.dark.tokens["color-canvas"])
      assert.strictEqual(document.documentElement.style.colorScheme, "dark")
    }).pipe(Effect.provide(bridgeOver(fakeMainProcess()))),
  )

  // Without a theme every color is unset, so a failed read must not leave the
  // app unstyled.
  it.effect("applies the default dark theme when the saved theme cannot be read", () =>
    Effect.gen(function* () {
      yield* restoreSavedTheme

      assert.strictEqual(appliedToken("color-canvas"), builtInThemes.dark.tokens["color-canvas"])
    }).pipe(Effect.provide(bridgeOver(unreachableMainProcess))),
  )

  it.effect("restyles the page at once when a theme is selected and remembers it", () =>
    Effect.gen(function* () {
      yield* restoreSavedTheme

      yield* selectTheme(lightTheme)

      assert.strictEqual(appliedToken("color-accent"), builtInThemes.light.tokens["color-accent"])
      assert.deepStrictEqual((yield* loadSavedThemeLibrary).savedTheme, lightTheme)
    }).pipe(Effect.provide(bridgeOver(fakeMainProcess()))),
  )

  // A failed save must not undo the switch the user just saw happen.
  it.effect("keeps the selected theme applied when it cannot be saved", () =>
    Effect.gen(function* () {
      yield* selectTheme(lightTheme)

      assert.strictEqual(appliedToken("color-accent"), builtInThemes.light.tokens["color-accent"])
    }).pipe(Effect.provide(bridgeOver(unreachableMainProcess))),
  )
})

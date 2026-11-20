import { assert, beforeEach, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import type { DesktopApi } from "../../../preload/desktop-api"
import { builtInThemes } from "../../../shared/built-in-themes"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { loadSavedThemeId, restoreSavedTheme, selectTheme } from "./saved-theme"

const unreachableMainProcess: DesktopApi = {
  invoke: () => Promise.reject(new Error("The main process did not reply")),
}

const bridgeOver = (desktopApi: DesktopApi) =>
  Layer.succeed(DesktopBridge)(DesktopBridge.make(desktopApi))

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

      yield* selectTheme("light")

      assert.strictEqual(appliedToken("color-accent"), builtInThemes.light.tokens["color-accent"])
      assert.strictEqual(yield* loadSavedThemeId, "light")
    }).pipe(Effect.provide(bridgeOver(fakeMainProcess()))),
  )
})

import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { DesktopBridge } from "./desktop-bridge"
import { fakeMainProcess } from "./fake-main-process"
import { loadSavedSetting } from "./saved-setting"

const bridgeOver = (desktopApi: DesktopApi) =>
  Layer.succeed(DesktopBridge)(DesktopBridge.make(desktopApi))

describe("loadSavedSetting", () => {
  it.effect("uses the default until a value is saved", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* loadSavedSetting("sidebarWidth", 280), 280)
    }).pipe(Effect.provide(bridgeOver(fakeMainProcess()))),
  )

  // The app shell cannot render until its sidebar width loads, so a failed
  // read must not keep the app from opening.
  it.effect("uses the default when the saved value cannot be read", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* loadSavedSetting("sidebarWidth", 280), 280)
    }).pipe(
      Effect.provide(
        bridgeOver({ invoke: () => Promise.reject(new Error("The main process did not reply")) }),
      ),
    ),
  )
})

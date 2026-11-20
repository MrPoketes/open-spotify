import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import type { DesktopApi } from "../../../preload/desktop-api"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { loadSavedSidebarWidth } from "./saved-sidebar-width"

const bridgeOver = (desktopApi: DesktopApi) =>
  Layer.succeed(DesktopBridge)(DesktopBridge.make(desktopApi))

describe("saved sidebar width", () => {
  it.effect("uses the default width on first launch", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* loadSavedSidebarWidth, 280)
    }).pipe(Effect.provide(bridgeOver(fakeMainProcess()))),
  )

  // The shell cannot render until this loads, so a failed read must not keep
  // the app from opening.
  it.effect("uses the default width when the saved width cannot be read", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* loadSavedSidebarWidth, 280)
    }).pipe(
      Effect.provide(
        bridgeOver({ invoke: () => Promise.reject(new Error("The main process did not reply")) }),
      ),
    ),
  )
})

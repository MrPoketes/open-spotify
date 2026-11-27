import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"
import { installWidevine } from "./widevine"

// The main window opens only after this finishes, and remote control through
// Spotify Connect must work on computers where Widevine never arrives. The
// answer tells the renderer whether this computer can play protected audio.
describe("installWidevine", () => {
  it.effect("answers that Widevine is installed once the install finishes", () =>
    Effect.gen(function* () {
      const isInstalled = yield* installWidevine(() => Promise.resolve("installed"))

      assert.isTrue(isInstalled)
    }),
  )

  it.effect("answers that Widevine is missing, without failing, when the install fails", () =>
    Effect.gen(function* () {
      const isInstalled = yield* installWidevine(() =>
        Promise.reject(new Error("component update failed")),
      )

      assert.isFalse(isInstalled)
    }),
  )

  it.effect("stops waiting for a Widevine install that is still running after 30 seconds", () =>
    Effect.gen(function* () {
      const install = yield* Effect.forkChild(installWidevine(() => new Promise(() => {})))

      yield* TestClock.adjust("30 seconds")
      const isInstalled = yield* Fiber.join(install)

      assert.isFalse(isInstalled)
    }),
  )
})

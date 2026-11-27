import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber } from "effect"
import { TestClock } from "effect/testing"
import { installWidevine } from "./widevine"

// The main window opens only after this finishes, and remote control through
// Spotify Connect must work on computers where Widevine never arrives.
describe("installWidevine", () => {
  it.effect("finishes without failing when the Widevine install fails", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(
        installWidevine(() => Promise.reject(new Error("component update failed"))),
      )

      assert.strictEqual(exit._tag, "Success")
    }),
  )

  it.effect("stops waiting for a Widevine install that is still running after 30 seconds", () =>
    Effect.gen(function* () {
      const install = yield* Effect.forkChild(installWidevine(() => new Promise(() => {})))

      yield* TestClock.adjust("30 seconds")
      const exit = yield* Fiber.await(install)

      assert.strictEqual(exit._tag, "Success")
    }),
  )
})

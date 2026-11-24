import { assert, describe, it } from "@effect/vitest"
import { Effect, Logger } from "effect"
import { attemptNavigation } from "./attempt-navigation"

describe("attemptNavigation", () => {
  it.effect("logs an error instead of defecting when navigation rejects", () =>
    Effect.gen(function* () {
      const loggedLevels: Array<string> = []
      const recordingLogger = Logger.make((options) => {
        loggedLevels.push(options.logLevel)
      })

      yield* attemptNavigation(() => Promise.reject(new Error("blocked"))).pipe(
        Effect.provide(Logger.layer([recordingLogger])),
      )

      assert.deepStrictEqual(loggedLevels, ["Error"])
    }),
  )
})

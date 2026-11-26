import { assert, describe, it } from "@effect/vitest"
import { Effect, Logger } from "effect"
import { MalformedIpcRequest } from "../shared/malformed-ipc-request"
import { logSpotifyFailureFromIpc } from "./spotify-failure-log-ipc"

describe("Spotify failure log IPC", () => {
  it.effect("logs a warning with the request details sent by the renderer", () => {
    const warnings: Array<{ readonly level: string; readonly message: unknown }> = []
    const recordingLogger = Logger.make((entry) => {
      warnings.push({ level: entry.logLevel, message: entry.message })
    })
    const failure = {
      url: "https://api.spotify.com/v1/me/player",
      status: 403,
      spotifyMessage: "User not registered in the Developer Dashboard",
      spotifyReason: null,
      cause: "SpotifyAccessDenied (userNotRegistered)",
    }
    return Effect.gen(function* () {
      yield* logSpotifyFailureFromIpc(failure)

      assert.strictEqual(warnings.length, 1)
      assert.strictEqual(warnings[0]?.level, "Warn")
      assert.deepStrictEqual(warnings[0]?.message, ["Spotify request failed", failure])
    }).pipe(Effect.provide(Logger.layer([recordingLogger])))
  })

  it.effect("fails with MalformedIpcRequest when the failure payload is malformed", () =>
    Effect.gen(function* () {
      const error = yield* Effect.flip(logSpotifyFailureFromIpc({ url: 123 }))

      assert.instanceOf(error, MalformedIpcRequest)
      assert.strictEqual(error.channel, "spotify:log-failure")
    }),
  )
})

import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { DesktopBridge } from "./desktop-bridge"

const desktopApiReplying = (reply: unknown): DesktopApi => ({
  invoke: () => Promise.resolve(reply),
})

describe("DesktopBridge", () => {
  it.effect("returns app info when the main process replies with the expected shape", () =>
    Effect.gen(function* () {
      const reply = { name: "Open Spotify", version: "1.2.3", platform: "linux" }
      const bridge = DesktopBridge.make(desktopApiReplying(reply))

      const appInfo = yield* bridge.getAppInfo

      assert.deepStrictEqual(appInfo, reply)
    }),
  )

  // A main process from a different build could send an older shape. The
  // bridge must surface that as a typed error, never as a malformed value.
  it.effect("fails with DesktopBridgeError when the reply does not match the schema", () =>
    Effect.gen(function* () {
      const bridge = DesktopBridge.make(desktopApiReplying({ name: "Open Spotify" }))

      const error = yield* Effect.flip(bridge.getAppInfo)

      assert.strictEqual(error._tag, "DesktopBridgeError")
      assert.strictEqual(error.channel, "app:get-info")
    }),
  )

  // The main process sends a missing setting as null, because IPC messages
  // cannot carry an Option.
  it.effect("returns none when the main process has no value for a setting", () =>
    Effect.gen(function* () {
      const bridge = DesktopBridge.make(desktopApiReplying(null))

      const clientId = yield* bridge.getSetting("spotifyClientId")

      assert.deepStrictEqual(clientId, Option.none())
    }),
  )
})

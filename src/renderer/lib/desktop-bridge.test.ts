import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { DesktopBridge } from "./desktop-bridge"
import { fakeMainProcess } from "./fake-main-process"

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

  // Saving the Client ID only works if the bridge sends requests in the shape
  // the main process decodes and reads its replies back correctly.
  it.effect("returns none until a setting is saved, then the saved value", () =>
    Effect.gen(function* () {
      const bridge = DesktopBridge.make(fakeMainProcess())

      const clientIdBeforeSave = yield* bridge.getSetting("spotifyClientId")
      yield* bridge.setSetting("spotifyClientId", "my-client-id")
      const clientIdAfterSave = yield* bridge.getSetting("spotifyClientId")

      assert.deepStrictEqual(clientIdBeforeSave, Option.none())
      assert.deepStrictEqual(clientIdAfterSave, Option.some("my-client-id"))
    }),
  )
})

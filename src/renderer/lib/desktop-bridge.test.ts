import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import type { DesktopApi } from "../../preload/desktop-api"
import { LoginFailed, SessionExpired } from "../../shared/spotify-auth-replies"
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

  it.effect("returns the access token the main process replies with", () =>
    Effect.gen(function* () {
      const bridge = DesktopBridge.make(
        desktopApiReplying({ _tag: "AccessToken", accessToken: "my-access-token" }),
      )

      assert.strictEqual(yield* bridge.getAccessToken, "my-access-token")
    }),
  )

  // The renderer sends the user back to the login screen on SessionExpired,
  // so the error must keep its tag across IPC.
  it.effect("fails with SessionExpired when the main process reports an expired session", () =>
    Effect.gen(function* () {
      const bridge = DesktopBridge.make(desktopApiReplying({ _tag: "SessionExpired" }))

      const error = yield* Effect.flip(bridge.getAccessToken)

      assert.instanceOf(error, SessionExpired)
    }),
  )

  it.effect("fails with the login error the main process reports", () =>
    Effect.gen(function* () {
      const bridge = DesktopBridge.make(
        desktopApiReplying({ _tag: "LoginFailed", message: "Could not open the browser." }),
      )

      const error = yield* Effect.flip(bridge.logIn)

      assert.deepStrictEqual(error, new LoginFailed({ message: "Could not open the browser." }))
    }),
  )
})

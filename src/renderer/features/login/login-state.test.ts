import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import type { DesktopApi } from "../../../preload/desktop-api"
import { ipcChannels } from "../../../shared/ipc-channels"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { findLoginState } from "./login-state"

const mainProcessReplyingToAccessToken = (accessTokenReply: unknown): DesktopApi => {
  const settings = fakeMainProcess()
  return {
    invoke: (channel, request) =>
      channel === ipcChannels.getAccessToken
        ? Promise.resolve(accessTokenReply)
        : settings.invoke(channel, request),
  }
}

const loginStateWith = (accessTokenReply: unknown) =>
  Effect.gen(function* () {
    const bridge = DesktopBridge.make(mainProcessReplyingToAccessToken(accessTokenReply))
    yield* bridge.setSetting("spotifyClientId", "my-client-id")
    return yield* findLoginState.pipe(Effect.provideService(DesktopBridge, bridge))
  })

describe("findLoginState", () => {
  it.effect("asks for a Client ID before one is saved", () =>
    Effect.gen(function* () {
      const bridge = DesktopBridge.make(fakeMainProcess())

      const loginState = yield* findLoginState.pipe(Effect.provideService(DesktopBridge, bridge))

      assert.strictEqual(loginState, "no-client-id")
    }),
  )

  it.effect("asks the user to log in when there is no session", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* loginStateWith({ _tag: "NotLoggedIn" }), "logged-out")
    }),
  )

  // The login screen explains why the user has to log in again.
  it.effect("reports an expired session separately from a missing one", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* loginStateWith({ _tag: "SessionExpired" }), "session-expired")
    }),
  )

  it.effect("keeps the user logged in when Spotify is unreachable for a moment", () =>
    Effect.gen(function* () {
      const loginState = yield* loginStateWith({
        _tag: "AccessTokenUnavailable",
        message: "Could not reach Spotify.",
      })

      assert.strictEqual(loginState, "logged-in")
    }),
  )
})

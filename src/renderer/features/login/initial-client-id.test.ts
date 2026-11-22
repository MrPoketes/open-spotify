import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import { DesktopBridge } from "../../lib/desktop-bridge"
import { desktopBridgeOver } from "../../lib/desktop-bridge-fakes"
import { fakeMainProcess } from "../../lib/fake-main-process"
import { loadInitialClientId } from "./initial-client-id"

const saveClientId = Effect.fn("saveClientId")(function* (clientId: string) {
  const bridge = yield* DesktopBridge
  yield* bridge.setSetting("spotifyClientId", clientId)
})

describe("loadInitialClientId", () => {
  it.effect("prefers the saved Client ID over OPEN_SPOTIFY_CLIENT_ID", () =>
    Effect.gen(function* () {
      yield* saveClientId("saved-client-id")

      assert.strictEqual(yield* loadInitialClientId, "saved-client-id")
    }).pipe(
      Effect.provide(desktopBridgeOver(fakeMainProcess({ environmentClientId: "env-client-id" }))),
    ),
  )

  it.effect("falls back to OPEN_SPOTIFY_CLIENT_ID before a Client ID is saved", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* loadInitialClientId, "env-client-id")
    }).pipe(
      Effect.provide(desktopBridgeOver(fakeMainProcess({ environmentClientId: "env-client-id" }))),
    ),
  )

  it.effect("starts empty when neither Client ID exists", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* loadInitialClientId, "")
    }).pipe(Effect.provide(desktopBridgeOver(fakeMainProcess()))),
  )
})

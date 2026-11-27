import { afterEach, assert, describe, it } from "@effect/vitest"
import { Effect, Exit, Fiber, Layer, Queue, Scope } from "effect"
import { vi } from "vitest"
import { collectStream } from "../../lib/collect-stream"
import { SpotifyAccessToken } from "../spotify/spotify-access-token"
import { WebPlaybackSdk } from "./web-playback-sdk"

interface FakeSdkPlayerOptions {
  readonly getOAuthToken: (provideToken: (accessToken: string) => void) => void
}

// Stands in for the SDK's Spotify.Player and keeps every player it creates.
const fakeSdk = () => {
  const players: Array<FakeSdkPlayer> = []
  class FakeSdkPlayer {
    readonly listeners = new Map<string, (payload: unknown) => void>()
    isConnected = false
    volume = 1
    constructor(readonly options: FakeSdkPlayerOptions) {
      players.push(this)
    }
    connect() {
      this.isConnected = true
      return Promise.resolve(true)
    }
    disconnect() {
      this.isConnected = false
    }
    setVolume(volume: number) {
      this.volume = volume
      return Promise.resolve()
    }
    addListener(event: string, listener: (payload: unknown) => void) {
      this.listeners.set(event, listener)
      return true
    }
    emit(event: string, payload: unknown) {
      this.listeners.get(event)?.(payload)
    }
  }
  // The one player the code under test created.
  const createdPlayer = () => {
    assert.lengthOf(players, 1)
    const [player] = players
    assert.isDefined(player)
    return player
  }
  return { Player: FakeSdkPlayer, createdPlayer }
}

// Each token the main process hands out is new, like one it has refreshed.
const countingAccessTokens = () => {
  let tokenCount = 0
  return Layer.succeed(
    SpotifyAccessToken,
    SpotifyAccessToken.of({
      get: Effect.sync(() => {
        tokenCount += 1
        return `fake-access-token-${tokenCount}`
      }),
    }),
  )
}

const sdkLayer = WebPlaybackSdk.layer.pipe(Layer.provide(countingAccessTokens()))

const connect = Effect.gen(function* () {
  const sdk = yield* WebPlaybackSdk
  return yield* sdk.connect
})

const installLoadedSdk = () => {
  const sdk = fakeSdk()
  window.Spotify = { Player: sdk.Player }
  return sdk
}

afterEach(() => {
  delete window.Spotify
  delete window.onSpotifyWebPlaybackSDKReady
})

describe("WebPlaybackSdk", () => {
  it.effect("connects once the SDK script reports that it has loaded", () =>
    Effect.gen(function* () {
      const connecting = yield* Effect.forkScoped(connect)
      yield* Effect.yieldNow
      const sdk = installLoadedSdk()
      window.onSpotifyWebPlaybackSDKReady?.()

      yield* Fiber.join(connecting)

      assert.isTrue(sdk.createdPlayer().isConnected)
    }).pipe(Effect.scoped, Effect.provide(sdkLayer)),
  )

  // Without the SDK, remote control must keep working (decision 0007), so a
  // script that never loads has to end the attempt instead of hanging it.
  it.effect("fails to connect when the SDK script does not load", () =>
    Effect.gen(function* () {
      const appendToHead = vi.spyOn(document.head, "append")
      const connecting = yield* Effect.forkScoped(connect)
      yield* Effect.yieldNow
      const [script] = appendToHead.mock.calls[0] ?? []
      assert.instanceOf(script, HTMLScriptElement)
      script.dispatchEvent(new Event("error"))

      const exit = yield* Fiber.await(connecting)

      assert.isTrue(Exit.isFailure(exit))
    }).pipe(Effect.scoped, Effect.provide(sdkLayer)),
  )

  it.effect("reports the device id while the SDK is ready and null once it is not", () =>
    Effect.gen(function* () {
      const sdk = installLoadedSdk()
      const thisComputer = yield* connect
      const deviceIds = yield* collectStream(thisComputer.deviceId)
      assert.strictEqual(yield* Queue.take(deviceIds), null)

      sdk.createdPlayer().emit("ready", { device_id: "fake-sdk-device" })
      assert.strictEqual(yield* Queue.take(deviceIds), "fake-sdk-device")
      sdk.createdPlayer().emit("not_ready", { device_id: "fake-sdk-device" })
      assert.strictEqual(yield* Queue.take(deviceIds), null)
    }).pipe(Effect.scoped, Effect.provide(sdkLayer)),
  )

  // Access tokens expire after an hour, and the SDK asks again when it needs
  // a new one.
  it.effect("answers each token request from the SDK with a fresh access token", () =>
    Effect.gen(function* () {
      const sdk = installLoadedSdk()
      yield* connect
      const providedTokens = yield* Queue.unbounded<string>()
      const requestToken = () =>
        sdk
          .createdPlayer()
          .options.getOAuthToken((token) => Queue.offerUnsafe(providedTokens, token))

      requestToken()
      assert.strictEqual(yield* Queue.take(providedTokens), "fake-access-token-1")
      requestToken()
      assert.strictEqual(yield* Queue.take(providedTokens), "fake-access-token-2")
    }).pipe(Effect.scoped, Effect.provide(sdkLayer)),
  )

  it.effect("disconnects the player when its scope closes", () =>
    Effect.gen(function* () {
      const sdk = installLoadedSdk()
      const scope = yield* Scope.make()
      yield* connect.pipe(Scope.provide(scope))
      assert.isTrue(sdk.createdPlayer().isConnected)

      yield* Scope.close(scope, Exit.void)

      assert.isFalse(sdk.createdPlayer().isConnected)
    }).pipe(Effect.provide(sdkLayer)),
  )

  // The SDK takes a volume from 0 to 1, and the Web API from 0 to 100.
  it.effect("gives the player the volume as a fraction of full volume", () =>
    Effect.gen(function* () {
      const sdk = installLoadedSdk()
      const thisComputer = yield* connect

      yield* thisComputer.setVolume(30)

      assert.strictEqual(sdk.createdPlayer().volume, 0.3)
    }).pipe(Effect.scoped, Effect.provide(sdkLayer)),
  )
})

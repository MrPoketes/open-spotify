import { afterEach, assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Queue, Stream } from "effect"
import { TestClock } from "effect/testing"
import { SpotifyApi, SpotifyRequestError } from "../spotify/spotify-api"
import { fakeDevices } from "../spotify/spotify-fixtures"
import { Player, type PlayerState } from "./player"

// Counts playback state requests and fails the ones listed in failingRequests
// (numbered from 1), like a connection that drops for a moment.
const countingSpotify = (failingRequests: ReadonlyArray<number> = []) => {
  let requestCount = 0
  const layer = SpotifyApi.layerFakeWith((spotify) => ({
    getPlaybackState: Effect.suspend(() => {
      requestCount += 1
      if (failingRequests.includes(requestCount)) {
        return Effect.fail(new SpotifyRequestError({ cause: "Failed to fetch" }))
      }
      return spotify.getPlaybackState
    }),
  }))
  return { requestCount: () => requestCount, layer: Player.layer.pipe(Layer.provide(layer)) }
}

const setWindowVisibility = (visibility: DocumentVisibilityState) =>
  Effect.sync(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: visibility })
    document.dispatchEvent(new Event("visibilitychange"))
  })

// Subscribes to the player state for the rest of the test. Responses from the
// fake server resolve through real promises, so a test takes each state from
// the queue instead of expecting it to arrive within a clock adjustment.
const subscribe = Effect.gen(function* () {
  const player = yield* Player
  const states = yield* Queue.unbounded<PlayerState>()
  yield* Stream.runForEach(player.state, (state) => Queue.offer(states, state)).pipe(
    Effect.forkScoped,
  )
  return states
})

const activeDeviceId = (state: PlayerState) =>
  state.status === "active" ? state.playback.device.id : undefined

afterEach(() => {
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" })
})

describe("Player", () => {
  it.effect("polls the playback state every two seconds while the window is visible", () => {
    const spotify = countingSpotify()
    return Effect.gen(function* () {
      const states = yield* subscribe
      yield* Queue.take(states)
      yield* TestClock.adjust("2 seconds")
      yield* Queue.take(states)
      yield* TestClock.adjust("2 seconds")
      yield* Queue.take(states)

      assert.strictEqual(spotify.requestCount(), 3)
    }).pipe(Effect.scoped, Effect.provide(spotify.layer))
  })

  it.effect("stops polling while the window is hidden and polls again when it is shown", () => {
    const spotify = countingSpotify()
    return Effect.gen(function* () {
      const states = yield* subscribe
      yield* Queue.take(states)
      yield* setWindowVisibility("hidden")
      yield* TestClock.adjust("10 seconds")
      const requestsWhileHidden = spotify.requestCount()

      yield* setWindowVisibility("visible")
      yield* Queue.take(states)

      assert.strictEqual(requestsWhileHidden, 1)
      assert.strictEqual(spotify.requestCount(), 2)
    }).pipe(Effect.scoped, Effect.provide(spotify.layer))
  })

  // Several components show the player state, and each one polling on its own
  // would multiply the requests counted against Spotify's rate limit.
  it.effect("shares one poll between every subscriber", () => {
    const spotify = countingSpotify()
    return Effect.gen(function* () {
      const first = yield* subscribe
      const second = yield* subscribe
      yield* Queue.take(first)
      yield* Queue.take(second)
      yield* TestClock.adjust("2 seconds")
      const firstReceived = yield* Queue.take(first)
      const secondReceived = yield* Queue.take(second)

      assert.strictEqual(spotify.requestCount(), 2)
      assert.strictEqual(secondReceived, firstReceived)
    }).pipe(Effect.scoped, Effect.provide(spotify.layer))
  })

  it.effect("reads the playback state again as soon as playback is transferred", () => {
    const spotify = countingSpotify()
    const kitchenSpeaker = fakeDevices[2]
    return Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)

      yield* player.transferPlayback(kitchenSpeaker.id)
      const stateAfterTransfer = yield* Queue.take(states)

      assert.strictEqual(activeDeviceId(stateAfterTransfer), kitchenSpeaker.id)
    }).pipe(Effect.scoped, Effect.provide(spotify.layer))
  })

  it.effect("reports Spotify as unreachable after a failed poll and recovers on the next", () => {
    const spotify = countingSpotify([1])
    return Effect.gen(function* () {
      const states = yield* subscribe
      const stateAfterFailure = yield* Queue.take(states)
      yield* TestClock.adjust("2 seconds")
      const stateAfterRecovery = yield* Queue.take(states)

      assert.deepStrictEqual(stateAfterFailure, { status: "unreachable" })
      assert.strictEqual(activeDeviceId(stateAfterRecovery), fakeDevices[0].id)
    }).pipe(Effect.scoped, Effect.provide(spotify.layer))
  })
})

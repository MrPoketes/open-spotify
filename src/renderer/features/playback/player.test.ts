import { afterEach, assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Option, Queue, Stream } from "effect"
import { TestClock } from "effect/testing"
import { NoActiveDevice, SpotifyApi, SpotifyRequestError } from "../spotify/spotify-api"
import { spotifyApiFake, spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakeDevices, fakeTrack } from "../spotify/spotify-fixtures"
import { collectStream } from "../../lib/collect-stream"
import { setWindowVisibility } from "../../lib/fake-window-visibility"
import { Player, type PlayerState } from "./player"
import { playerOver } from "./player-over"

// Counts playback state requests and fails the ones listed in failingRequests
// (numbered from 1), like a connection that drops for a moment.
const countingSpotify = (failingRequests: ReadonlyArray<number> = []) => {
  let requestCount = 0
  const layer = spotifyApiFakeWith((spotify) => ({
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

const subscribe = Effect.gen(function* () {
  const player = yield* Player
  return yield* collectStream(player.state)
})

const activeDeviceId = (state: PlayerState) =>
  state.status === "active" ? state.playback.device.id : undefined

const playingName = (state: PlayerState) =>
  state.status === "active" ? state.playback.item?.name : undefined

afterEach(() => setWindowVisibility("visible"))

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

  // The operating system's media overlay shows the playing track while the
  // window is minimized, so a track that ends on its own must still show up.
  it.effect("polls every fifteen seconds while the window is hidden", () => {
    const spotify = countingSpotify()
    return Effect.gen(function* () {
      const states = yield* subscribe
      yield* Queue.take(states)
      setWindowVisibility("hidden")
      yield* TestClock.adjust("14 seconds")
      const requestsBeforeInterval = spotify.requestCount()

      yield* TestClock.adjust("1 second")
      yield* Queue.take(states)
      yield* TestClock.adjust("15 seconds")
      yield* Queue.take(states)

      assert.strictEqual(requestsBeforeInterval, 1)
      assert.strictEqual(spotify.requestCount(), 3)
    }).pipe(Effect.scoped, Effect.provide(spotify.layer))
  })

  it.effect("stops polling while the window is hidden once no device is active", () => {
    let requestCount = 0
    const spotify = spotifyApiFakeWith((fake) => ({
      getPlaybackState: Effect.suspend(() => {
        requestCount += 1
        return requestCount === 1 ? fake.getPlaybackState : Effect.succeedNone
      }),
    }))
    return Effect.gen(function* () {
      const states = yield* subscribe
      yield* Queue.take(states)
      setWindowVisibility("hidden")
      yield* TestClock.adjust("15 seconds")
      const stateAfterDeviceLeft = yield* Queue.take(states)

      yield* TestClock.adjust("1 minute")

      assert.deepStrictEqual(stateAfterDeviceLeft, { status: "noActiveDevice" })
      assert.strictEqual(requestCount, 2)
    }).pipe(Effect.scoped, Effect.provide(playerOver(spotify)))
  })

  it.effect("polls again as soon as the hidden window is shown", () => {
    const spotify = countingSpotify()
    return Effect.gen(function* () {
      const states = yield* subscribe
      yield* Queue.take(states)
      setWindowVisibility("hidden")
      yield* TestClock.adjust("10 seconds")
      const requestsWhileHidden = spotify.requestCount()

      setWindowVisibility("visible")
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

  it.effect("reads the playback state again as soon as it skips to the next track", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)

      yield* player.skipToNext
      const stateAfterSkip = yield* Queue.take(states)

      assert.strictEqual(playingName(stateAfterSkip), fakeTrack(1).name)
    }).pipe(Effect.scoped, Effect.provide(playerOver(spotifyApiFake))),
  )

  // Media keys work while the window is minimized, and the operating system's
  // media overlay should show the track they skipped to.
  it.effect("reads the playback state again after a skip while the window is hidden", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)
      setWindowVisibility("hidden")

      yield* player.skipToNext
      const stateAfterSkip = yield* Queue.take(states)

      assert.strictEqual(playingName(stateAfterSkip), fakeTrack(1).name)
    }).pipe(Effect.scoped, Effect.provide(playerOver(spotifyApiFake))),
  )

  it.effect("reads the playback state again when a command finds no active device", () => {
    let hasLostDevice = false
    const spotify = spotifyApiFakeWith((fake) => ({
      getPlaybackState: Effect.suspend(() =>
        hasLostDevice ? Effect.succeedNone : fake.getPlaybackState,
      ),
      skipToNext: Effect.suspend(() => {
        hasLostDevice = true
        return Effect.fail(new NoActiveDevice())
      }),
    }))
    return Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)

      yield* Effect.exit(player.skipToNext)
      const stateAfterFailure = yield* Queue.take(states)

      assert.deepStrictEqual(stateAfterFailure, { status: "noActiveDevice" })
    }).pipe(Effect.scoped, Effect.provide(playerOver(spotify)))
  })

  // The queue pane reads the queue again only when the playing item changes
  // or queueChanges emits, and adding a track does not change the item.
  it.effect("tells the queue it changed after adding a track to it", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const firstChange = yield* player.queueChanges.pipe(
        Stream.runHead,
        Effect.forkScoped({ startImmediately: true }),
      )

      yield* player.addToQueue("spotify:track:fake-track-5")

      assert.isTrue(Option.isSome(yield* Fiber.join(firstChange)))
    }).pipe(Effect.scoped, Effect.provide(playerOver(spotifyApiFake))),
  )

  // Shuffle reorders the queue without changing the playing item. Reading the
  // queue when the bar shows the change would get the order from before it,
  // so the queue waits for a poll in which Spotify reports the change.
  it.effect("tells the queue it changed when a poll shows shuffle changed in another app", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const spotify = yield* SpotifyApi
      const states = yield* subscribe
      yield* Queue.take(states)
      const firstChange = yield* player.queueChanges.pipe(
        Stream.runHead,
        Effect.forkScoped({ startImmediately: true }),
      )

      yield* spotify.setShuffle(true)
      yield* TestClock.adjust("2 seconds")
      yield* Queue.take(states)

      assert.isTrue(Option.isSome(yield* Fiber.join(firstChange)))
    }).pipe(Effect.scoped, Effect.provide(Player.layer.pipe(Layer.provideMerge(spotifyApiFake)))),
  )
})

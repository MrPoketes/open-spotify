import { afterEach, assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Layer, Option, Queue, Stream } from "effect"
import { TestClock } from "effect/testing"
import {
  NoActiveDevice,
  SpotifyApi,
  SpotifyRequestError,
  SpotifyResponseError,
} from "../spotify/spotify-api"
import { spotifyApiFake, spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { fakeDevices, fakeTrack } from "../spotify/spotify-fixtures"
import { collectStream } from "../../lib/collect-stream"
import { Player, type PlayerState } from "./player"

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

const setWindowVisibility = (visibility: DocumentVisibilityState) =>
  Effect.sync(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: visibility })
    document.dispatchEvent(new Event("visibilitychange"))
  })

const subscribe = Effect.gen(function* () {
  const player = yield* Player
  return yield* collectStream(player.state)
})

const activeDeviceId = (state: PlayerState) =>
  state.status === "active" ? state.playback.device.id : undefined

const isPlaying = (state: PlayerState) => state.status === "active" && state.playback.isPlaying

const playingName = (state: PlayerState) =>
  state.status === "active" ? state.playback.item?.name : undefined

const playerOver = (spotify: Layer.Layer<SpotifyApi>) => Player.layer.pipe(Layer.provide(spotify))

const rejected = Effect.fail(new SpotifyResponseError({ status: 403, message: "Restricted" }))

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

  // The operating system's media overlay shows the playing track while the
  // window is minimized, so a track that ends on its own must still show up.
  it.effect("polls every fifteen seconds while the window is hidden", () => {
    const spotify = countingSpotify()
    return Effect.gen(function* () {
      const states = yield* subscribe
      yield* Queue.take(states)
      yield* setWindowVisibility("hidden")
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
      yield* setWindowVisibility("hidden")
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

  it.effect("shows a pause at once, before Spotify confirms it", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)

      yield* Effect.forkScoped(player.pause)
      const stateAfterPause = yield* Queue.take(states)

      assert.isFalse(isPlaying(stateAfterPause))
    }).pipe(
      Effect.scoped,
      Effect.provide(playerOver(spotifyApiFakeWith(() => ({ pause: Effect.never })))),
    ),
  )

  // Spotify reports the volume on the device inside the playback state, not
  // next to the other settings.
  it.effect("shows a volume change on the active device at once, before Spotify confirms it", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)

      yield* Effect.forkScoped(player.setVolume(20))
      const stateAfterChange = yield* Queue.take(states)

      assert.strictEqual(
        stateAfterChange.status === "active"
          ? stateAfterChange.playback.device.volumePercent
          : null,
        20,
      )
    }).pipe(
      Effect.scoped,
      Effect.provide(playerOver(spotifyApiFakeWith(() => ({ setVolume: () => Effect.never })))),
    ),
  )

  it.effect("puts a change back when Spotify rejects it", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)

      const pause = yield* Effect.exit(player.pause)
      const shownWhileSending = yield* Queue.take(states)
      const shownAfterRejection = yield* Queue.take(states)

      assert.isTrue(Exit.isFailure(pause))
      assert.isFalse(isPlaying(shownWhileSending))
      assert.isTrue(isPlaying(shownAfterRejection))
    }).pipe(
      Effect.scoped,
      Effect.provide(playerOver(spotifyApiFakeWith(() => ({ pause: rejected })))),
    ),
  )

  // A poll can answer while a command is still on its way to Spotify. The
  // control must not flip back to the old state when it does.
  it.effect("keeps a change that Spotify has not accepted yet through a poll", () => {
    const pauseAccepted = Deferred.makeUnsafe<void>()
    const spotify = spotifyApiFakeWith((fake) => ({
      pause: Deferred.await(pauseAccepted).pipe(Effect.andThen(fake.pause)),
    }))
    return Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)

      const pause = yield* Effect.forkScoped(player.pause)
      yield* Queue.take(states)
      yield* TestClock.adjust("2 seconds")
      const shownAfterPoll = yield* Queue.take(states)
      yield* Deferred.succeed(pauseAccepted, undefined)
      yield* Fiber.join(pause)

      assert.isFalse(isPlaying(shownAfterPoll))
    }).pipe(Effect.scoped, Effect.provide(playerOver(spotify)))
  })

  // Spotify can report the old state for a moment after accepting a command.
  // A poll in that moment must not flip the control back.
  it.effect("keeps an accepted change through a poll that starts right after it", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const states = yield* subscribe
      yield* Queue.take(states)
      yield* TestClock.adjust("1500 millis")

      yield* player.pause
      yield* Queue.take(states)
      yield* Queue.take(states)
      yield* TestClock.adjust("500 millis")
      const shownByPollRightAfter = yield* Queue.take(states)
      yield* TestClock.adjust("2 seconds")
      const shownByLaterPoll = yield* Queue.take(states)

      assert.isFalse(isPlaying(shownByPollRightAfter))
      assert.isTrue(isPlaying(shownByLaterPoll))
    }).pipe(
      Effect.scoped,
      // Spotify accepts the pause but its playback state still says playing.
      Effect.provide(playerOver(spotifyApiFakeWith(() => ({ pause: Effect.void })))),
    ),
  )

  // The user can also press play in the Spotify app. Once a poll shows the
  // pause, the bar must follow Spotify again instead of the old change.
  it.effect("follows playback changed elsewhere after a poll shows the user's change", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const spotify = yield* SpotifyApi
      const states = yield* subscribe
      yield* Queue.take(states)
      yield* player.pause
      yield* Queue.take(states)
      yield* Queue.take(states)
      yield* TestClock.adjust("2 seconds")
      const shownAfterPause = yield* Queue.take(states)

      yield* spotify.play
      yield* TestClock.adjust("2 seconds")
      const shownAfterPlayElsewhere = yield* Queue.take(states)

      assert.isFalse(isPlaying(shownAfterPause))
      assert.isTrue(isPlaying(shownAfterPlayElsewhere))
    }).pipe(Effect.scoped, Effect.provide(Player.layer.pipe(Layer.provideMerge(spotifyApiFake)))),
  )

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
      yield* setWindowVisibility("hidden")

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

import { assert, describe, it } from "@effect/vitest"
import { Deferred, Effect, Exit, Fiber, Layer, Queue } from "effect"
import { TestClock } from "effect/testing"
import { collectStream } from "../../lib/collect-stream"
import { SpotifyApi, SpotifyResponseError } from "../spotify/spotify-api"
import { spotifyApiFake, spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import { Player, type PlayerState } from "./player"
import { playerOver } from "./player-over"

const subscribe = Effect.gen(function* () {
  const player = yield* Player
  return yield* collectStream(player.state)
})

const isPlaying = (state: PlayerState) => state.status === "active" && state.playback.isPlaying

const rejected = Effect.fail(new SpotifyResponseError({ status: 403, message: "Restricted" }))

// A change the user makes shows at once, on top of the polled state, until
// Spotify has had time to report it.
describe("Player pending changes", () => {
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
})

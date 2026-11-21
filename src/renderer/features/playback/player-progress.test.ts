import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Queue } from "effect"
import { TestClock } from "effect/testing"
import { collectStream } from "../../lib/collect-stream"
import { SpotifyApi } from "../spotify/spotify-api"
import { spotifyApiFake, spotifyApiFakeWith } from "../spotify/spotify-api-fake"
import type { PlaybackProgress } from "./playback-progress"
import { Player } from "./player"
import { playerOver } from "./player-over"

const subscribeToProgress = Effect.gen(function* () {
  const player = yield* Player
  return yield* collectStream(player.progress)
})

const positionsOf = (progress: ReadonlyArray<PlaybackProgress | null>) =>
  progress.map((shown) => shown?.positionMs)

describe("Player progress", () => {
  it.effect("moves the position on between polls while playback plays", () =>
    Effect.gen(function* () {
      const progress = yield* subscribeToProgress
      const shownAtPoll = yield* Queue.take(progress)
      yield* TestClock.adjust("250 millis")
      const shownAfterTick = yield* Queue.take(progress)

      assert.deepStrictEqual(positionsOf([shownAtPoll, shownAfterTick]), [42_000, 42_250])
    }).pipe(Effect.scoped, Effect.provide(playerOver(spotifyApiFake))),
  )

  // Spotify reports the paused position only after the pause settles. Until
  // then the bar must not jump back to the position of the last poll.
  it.effect("stops the position where playback was paused", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const progress = yield* subscribeToProgress
      yield* Queue.take(progress)
      yield* TestClock.adjust("250 millis")
      yield* Queue.take(progress)

      yield* Effect.forkScoped(player.pause)
      const shownAtPause = yield* Queue.take(progress)
      yield* TestClock.adjust("1750 millis")
      const shownAfterPoll = yield* Queue.take(progress)

      assert.deepStrictEqual(positionsOf([shownAtPause, shownAfterPoll]), [42_250, 42_250])
    }).pipe(
      Effect.scoped,
      Effect.provide(playerOver(spotifyApiFakeWith(() => ({ pause: Effect.never })))),
    ),
  )

  // Measured from the last poll instead, a resume would jump ahead by the
  // time playback spent paused since then.
  it.effect("moves the position on from where playback was resumed", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const spotify = yield* SpotifyApi
      yield* spotify.pause
      const progress = yield* subscribeToProgress
      yield* Queue.take(progress)
      yield* TestClock.adjust("1 second")

      yield* Effect.forkScoped(player.play)
      const shownAtPlay = yield* Queue.take(progress)
      yield* TestClock.adjust("250 millis")
      const shownAfterTick = yield* Queue.take(progress)

      assert.deepStrictEqual(positionsOf([shownAtPlay, shownAfterTick]), [42_000, 42_250])
    }).pipe(
      Effect.scoped,
      Effect.provide(
        Player.layer.pipe(Layer.provideMerge(spotifyApiFakeWith(() => ({ play: Effect.never })))),
      ),
    ),
  )

  // The position moves on from the moment of the seek, not from the last
  // poll, or it would show ahead of where playback is.
  it.effect("shows a seek at once, from the position it seeks to", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const progress = yield* subscribeToProgress
      yield* Queue.take(progress)
      yield* TestClock.adjust("250 millis")
      yield* Queue.take(progress)

      yield* Effect.forkScoped(player.seek(100_000))
      const shownAtSeek = yield* Queue.take(progress)

      assert.strictEqual(shownAtSeek?.positionMs, 100_000)
    }).pipe(
      Effect.scoped,
      Effect.provide(playerOver(spotifyApiFakeWith(() => ({ seek: () => Effect.never })))),
    ),
  )

  // Seeking to the end makes Spotify play the next item, which must not show
  // at the position the seek left on the item before it.
  it.effect("drops a seek's position once a poll shows another item playing", () =>
    Effect.gen(function* () {
      const player = yield* Player
      const spotify = yield* SpotifyApi
      yield* spotify.pause
      const progress = yield* subscribeToProgress
      yield* Queue.take(progress)
      yield* Effect.forkScoped(player.seek(100_000))
      yield* Queue.take(progress)

      yield* spotify.skipToNext
      yield* TestClock.adjust("2 seconds")
      const shownAfterPoll = yield* Queue.take(progress)

      assert.strictEqual(shownAfterPoll?.positionMs, 0)
    }).pipe(
      Effect.scoped,
      Effect.provide(
        Player.layer.pipe(
          Layer.provideMerge(spotifyApiFakeWith(() => ({ seek: () => Effect.never }))),
        ),
      ),
    ),
  )
})

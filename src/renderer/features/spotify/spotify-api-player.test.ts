import { assert, describe, it } from "@effect/vitest"
import { Effect, Option } from "effect"
import { scriptedSpotify } from "./scripted-spotify-api"
import { SpotifyApi } from "./spotify-api"
import {
  fakeDevices,
  fakeEpisode,
  fakePlaybackState,
  fakePlayingTrack,
  fakeTrack,
} from "./spotify-fixtures"

describe("SpotifyApi player", () => {
  it.effect("decodes the playback state and the available devices", () =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi

      const playback = yield* spotify.getPlaybackState
      const devices = yield* spotify.getAvailableDevices

      assert.isTrue(Option.isSome(playback))
      assert.strictEqual(Option.getOrThrow(playback).device.name, "Mira's Laptop")
      assert.strictEqual(Option.getOrThrow(playback).item?.name, fakePlayingTrack.name)
      assert.deepStrictEqual(
        devices.map(({ name, isActive }) => [name, isActive]),
        [
          ["Mira's Laptop", true],
          ["Mira's Phone", false],
          ["Kitchen Speaker", false],
        ],
      )
    }).pipe(Effect.provide(SpotifyApi.layerFake)),
  )

  it.effect("moves playback to the device it transfers to", () =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      const kitchenSpeaker = fakeDevices[2]

      yield* spotify.transferPlayback(kitchenSpeaker.id)
      const playback = yield* spotify.getPlaybackState
      const devices = yield* spotify.getAvailableDevices

      assert.strictEqual(Option.getOrThrow(playback).device.id, kitchenSpeaker.id)
      assert.deepStrictEqual(
        devices.filter(({ isActive }) => isActive).map(({ id }) => id),
        [kitchenSpeaker.id],
      )
    }).pipe(Effect.provide(SpotifyApi.layerFake)),
  )

  it.effect("applies each playback command to the playback state", () =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      const playback = spotify.getPlaybackState.pipe(Effect.map(Option.getOrThrow))

      yield* spotify.pause
      const paused = yield* playback
      yield* spotify.play
      yield* spotify.setShuffle(true)
      yield* spotify.setRepeat("track")
      yield* spotify.skipToNext
      yield* spotify.skipToNext
      yield* spotify.skipToPrevious
      const changed = yield* playback

      assert.isFalse(paused.isPlaying)
      assert.deepStrictEqual(
        [changed.isPlaying, changed.shuffle, changed.repeat, changed.item?.name],
        [true, true, "track", fakeTrack(1).name],
      )
    }).pipe(Effect.provide(SpotifyApi.layerFake)),
  )

  // Spotify answers a player command with 404 and this reason when no device
  // is active, which the bar explains instead of showing a generic failure.
  it.effect("fails with NoActiveDevice when a command finds no active device", () => {
    const spotify = scriptedSpotify([
      {
        status: 404,
        body: JSON.stringify({
          error: { status: 404, message: "Player command failed", reason: "NO_ACTIVE_DEVICE" },
        }),
      },
    ])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const error = yield* Effect.flip(api.pause)

      assert.strictEqual(error._tag, "NoActiveDevice")
    }).pipe(Effect.provide(spotify.layer))
  })

  it.effect("decodes a playing podcast episode", () => {
    const spotify = scriptedSpotify([
      {
        status: 200,
        body: JSON.stringify({
          ...fakePlaybackState(fakeDevices[0]),
          item: fakeEpisode,
          currently_playing_type: "episode",
        }),
      },
    ])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const playback = yield* api.getPlaybackState

      assert.strictEqual(Option.getOrThrow(playback).item?.type, "episode")
    }).pipe(Effect.provide(spotify.layer))
  })

  // Spotify answers 204 when no device is active, which is the normal state
  // before the user opens a Spotify app anywhere.
  it.effect("reads a 204 playback response as nothing playing, not as an error", () => {
    const spotify = scriptedSpotify([{ status: 204, body: null }])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const playback = yield* api.getPlaybackState

      assert.isTrue(Option.isNone(playback))
    }).pipe(Effect.provide(spotify.layer))
  })
})

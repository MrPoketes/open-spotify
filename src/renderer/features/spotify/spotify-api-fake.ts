import { Effect, Layer, Option, Stream } from "effect"
import { SpotifyApi } from "./spotify-api"
import { spotifyFakeAccessToken, spotifyFakeServer } from "./spotify-fake-server"
import type { PlaybackState } from "./spotify-playback-state"

// Kept out of spotify-api.ts so the fixtures stay out of the app's bundle.
export const spotifyApiFake = SpotifyApi.layerWithoutHttpClient.pipe(
  Layer.provide([spotifyFakeServer, spotifyFakeAccessToken]),
)

// The fake with some operations replaced, for tests of states the fixtures
// do not cover, such as failures and empty results.
export const spotifyApiFakeWith = (
  overrides: (spotify: SpotifyApi["Service"]) => Partial<SpotifyApi["Service"]>,
) =>
  Layer.effect(
    SpotifyApi,
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi
      return SpotifyApi.of({ ...spotify, ...overrides(spotify) })
    }),
  ).pipe(Layer.provide(spotifyApiFake))

// The fake with an empty library, plus the given overrides, such as the one
// library stream a test reads. Tests that render the sidebar's library use it
// (AGENTS.md, Tests): the fixtures' sixty-odd entries slow every render.
export const spotifyApiFakeWithEmptyLibrary = (
  overrides: (spotify: SpotifyApi["Service"]) => Partial<SpotifyApi["Service"]>,
) =>
  spotifyApiFakeWith((spotify) => ({
    currentUserPlaylists: Stream.empty,
    savedAlbums: Stream.empty,
    followedArtists: Stream.empty,
    savedShows: Stream.empty,
    ...overrides(spotify),
  }))

// Changes the playback state the fake reports, as an override that other
// overrides can join.
export const playbackStateChangedBy =
  (change: (playback: PlaybackState) => PlaybackState) => (spotify: SpotifyApi["Service"]) => ({
    getPlaybackState: spotify.getPlaybackState.pipe(Effect.map(Option.map(change))),
  })

// The fake with its playback state changed, for tests of a state the fake
// player does not reach on its own.
export const spotifyApiFakeWithPlayback = (change: (playback: PlaybackState) => PlaybackState) =>
  spotifyApiFakeWith(playbackStateChangedBy(change))

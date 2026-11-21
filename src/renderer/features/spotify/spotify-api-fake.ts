import { Effect, Layer } from "effect"
import { SpotifyApi } from "./spotify-api"
import { spotifyFakeAccessToken, spotifyFakeServer } from "./spotify-fake-server"

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

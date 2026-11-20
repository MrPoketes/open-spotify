import { assert, describe, it } from "@effect/vitest"
import { Effect, Fiber, Layer, Stream } from "effect"
import { HttpClient, HttpClientResponse } from "effect/http"
import { TestClock } from "effect/testing"
import { SpotifyApi } from "./spotify-api"
import { spotifyFakeAccessToken } from "./spotify-fake-server"
import { fakeCurrentUser, fakePlaylists } from "./spotify-fixtures"

const withFakeSpotify = <A, E>(effect: Effect.Effect<A, E, SpotifyApi>) =>
  Effect.provide(effect, SpotifyApi.layerFake)

interface ScriptedResponse {
  readonly status: number
  readonly body: unknown
  readonly headers?: Record<string, string>
}

// Answers each request with the next scripted response, repeating the last.
const scriptedSpotify = (responses: readonly [ScriptedResponse, ...Array<ScriptedResponse>]) => {
  let requestCount = 0
  const client = HttpClient.make((request) =>
    Effect.sync(() => {
      const { status, body, headers } = responses[requestCount] ?? responses[0]
      requestCount += 1
      return HttpClientResponse.fromWeb(
        request,
        new Response(JSON.stringify(body), { status, headers: headers ?? {} }),
      )
    }),
  )
  return {
    requestCount: () => requestCount,
    layer: SpotifyApi.layerWithoutHttpClient.pipe(
      Layer.provide([Layer.succeed(HttpClient.HttpClient, client), spotifyFakeAccessToken]),
    ),
  }
}

describe("SpotifyApi.layerFake", () => {
  it.effect("decodes the current user and every fixture playlist", () =>
    withFakeSpotify(
      Effect.gen(function* () {
        const spotify = yield* SpotifyApi

        const user = yield* spotify.getCurrentUser
        const playlists = yield* Stream.runCollect(spotify.currentUserPlaylists)
        const fullPlaylists = yield* Effect.forEach(playlists, ({ id }) => spotify.getPlaylist(id))

        assert.strictEqual(user.displayName, "Mira Kaelin")
        assert.deepStrictEqual(
          fullPlaylists.map(({ name }) => name),
          fakePlaylists.map(({ name }) => name),
        )
        assert.deepStrictEqual(
          playlists.map(({ items }) => items.total),
          fakePlaylists.map(({ entries }) => entries.length),
        )
      }),
    ),
  )

  it.effect("streams a playlist's items across several pages in order", () =>
    withFakeSpotify(
      Effect.gen(function* () {
        const spotify = yield* SpotifyApi

        const items = yield* Stream.runCollect(
          spotify.playlistItems("fake-playlist-late-night-drive"),
        )

        assert.strictEqual(items.length, 120)
        assert.deepStrictEqual(
          items.map(({ item }) => item?.id),
          Array.from({ length: 120 }, (_, index) => `fake-track-${index}`),
        )
      }),
    ),
  )

  // A single local file, podcast episode, or removed track must not make a
  // whole playlist fail to load.
  it.effect("decodes local files, episodes, and removed tracks in a playlist", () =>
    withFakeSpotify(
      Effect.gen(function* () {
        const spotify = yield* SpotifyApi

        const items = yield* Stream.runCollect(
          spotify.playlistItems("fake-playlist-morning-coffee"),
        )
        const [localFile, episode, removedTrack] = items.slice(-3)

        assert.strictEqual(localFile?.isLocal, true)
        assert.strictEqual(localFile?.item?.id, null)
        assert.strictEqual(episode?.item?.type, "episode")
        assert.strictEqual(removedTrack?.item, null)
      }),
    ),
  )

  it.effect("fails with a 403 SpotifyResponseError for items of a followed playlist", () =>
    withFakeSpotify(
      Effect.gen(function* () {
        const spotify = yield* SpotifyApi

        const error = yield* Effect.flip(
          Stream.runCollect(spotify.playlistItems("fake-playlist-indie-finds")),
        )

        assert.strictEqual(error._tag, "SpotifyResponseError")
        assert.include(error, { status: 403, message: "Forbidden" })
      }),
    ),
  )
})

describe("SpotifyApi responses", () => {
  it.effect("retries a 429 response once the Retry-After delay has passed", () => {
    const spotify = scriptedSpotify([
      {
        status: 429,
        body: { error: { status: 429, message: "API rate limit exceeded" } },
        headers: { "retry-after": "5" },
      },
      { status: 200, body: fakeCurrentUser },
    ])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const request = yield* Effect.forkChild(api.getCurrentUser)
      yield* TestClock.adjust("4 seconds")
      const requestsBeforeDelay = spotify.requestCount()
      yield* TestClock.adjust("1 second")
      const user = yield* Fiber.join(request)

      assert.strictEqual(requestsBeforeDelay, 1)
      assert.strictEqual(spotify.requestCount(), 2)
      assert.strictEqual(user.id, fakeCurrentUser.id)
    }).pipe(Effect.provide(spotify.layer))
  })

  it.effect("fails with SpotifyAuthError carrying Spotify's message on 401", () => {
    const spotify = scriptedSpotify([
      { status: 401, body: { error: { status: 401, message: "The access token expired" } } },
    ])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const error = yield* Effect.flip(api.getCurrentUser)

      assert.strictEqual(error._tag, "SpotifyAuthError")
      assert.strictEqual(error.message, "The access token expired")
    }).pipe(Effect.provide(spotify.layer))
  })

  it.effect("fails with SpotifyDecodeError when a response does not match the schema", () => {
    const spotify = scriptedSpotify([{ status: 200, body: { id: 42, images: "none" } }])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const error = yield* Effect.flip(api.getCurrentUser)

      assert.strictEqual(error._tag, "SpotifyDecodeError")
    }).pipe(Effect.provide(spotify.layer))
  })
})

import { assert, describe, it, layer } from "@effect/vitest"
import { Effect, Fiber, Layer, Option, Stream } from "effect"
import { HttpClient, HttpClientError, HttpClientResponse } from "effect/http"
import { TestClock } from "effect/testing"
import { SpotifyApi } from "./spotify-api"
import { spotifyFakeAccessToken } from "./spotify-fake-server"
import {
  fakeCurrentUser,
  fakeDevices,
  fakeEpisode,
  fakeFollowedArtists,
  fakeLikedSongs,
  fakePlaybackState,
  fakePlayingTrack,
  fakePlaylists,
  fakeSavedAlbums,
  fakeSavedShows,
} from "./spotify-fixtures"

const spotifyApiUsing = (client: HttpClient.HttpClient) =>
  SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide([Layer.succeed(HttpClient.HttpClient, client), spotifyFakeAccessToken]),
  )

interface ScriptedResponse {
  readonly status: number
  // Null for statuses such as 204 that must not carry a body.
  readonly body: string | null
  readonly headers?: Record<string, string>
}

// Answers the n-th request with the n-th scripted response. An unscripted
// request is a bug in the test, so it dies.
const scriptedSpotify = (responses: ReadonlyArray<ScriptedResponse>) => {
  let requestCount = 0
  const client = HttpClient.make((request) => {
    const scripted = responses[requestCount]
    requestCount += 1
    if (scripted === undefined) {
      return Effect.die(`Unscripted request to ${request.url}`)
    }
    const { status, body, headers } = scripted
    return Effect.succeed(
      HttpClientResponse.fromWeb(request, new Response(body, { status, headers: headers ?? {} })),
    )
  })
  return { requestCount: () => requestCount, layer: spotifyApiUsing(client) }
}

const spotifyErrorBody = (status: number, message: string) =>
  JSON.stringify({ error: { status, message } })

layer(SpotifyApi.layerFake)("SpotifyApi.layerFake", (test) => {
  test.effect("decodes the current user and every fixture playlist", () =>
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
  )

  // There are more followed artists than fit on one page, and Spotify pages
  // them by cursor instead of by offset.
  test.effect("decodes every page of the user's saved and followed collections", () =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi

      const albums = yield* Stream.runCollect(spotify.savedAlbums)
      const artists = yield* Stream.runCollect(spotify.followedArtists)
      const shows = yield* Stream.runCollect(spotify.savedShows)
      const likedSongsCount = yield* spotify.likedSongsCount

      assert.deepStrictEqual(
        albums.map(({ album }) => album.name),
        fakeSavedAlbums.map(({ album }) => album.name),
      )
      assert.deepStrictEqual(
        artists.map(({ name }) => name),
        fakeFollowedArtists.map(({ name }) => name),
      )
      assert.deepStrictEqual(
        shows.map(({ show }) => show.name),
        fakeSavedShows.map(({ show }) => show.name),
      )
      assert.strictEqual(likedSongsCount, fakeLikedSongs.length)
    }),
  )

  test.effect("fetches the page of a playlist's items that starts at the given offset", () =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi

      const page = yield* spotify.getPlaylistItemsPage("fake-playlist-late-night-drive", 100)

      assert.strictEqual(page.total, 120)
      assert.deepStrictEqual(
        page.items.map(({ item }) => item?.id),
        Array.from({ length: 20 }, (_, index) => `fake-track-${100 + index}`),
      )
    }),
  )

  // A single local file, podcast episode, or removed track must not make a
  // whole playlist fail to load.
  test.effect("decodes local files, episodes, and removed tracks in a playlist", () =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi

      const { items } = yield* spotify.getPlaylistItemsPage("fake-playlist-morning-coffee", 0)
      const playlist = yield* spotify.getPlaylist("fake-playlist-morning-coffee")
      const [localFile, episode, removedTrack] = items.slice(-3)

      assert.strictEqual(localFile?.isLocal, true)
      assert.strictEqual(localFile?.item?.id, null)
      assert.strictEqual(episode?.item?.type, "episode")
      assert.strictEqual(removedTrack?.item, null)
      assert.deepStrictEqual(playlist.items?.items, items)
    }),
  )

  test.effect("pages through a show's episodes, keeping unserved episodes as null", () =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi

      const show = yield* spotify.getShow("fake-show-slow-science")
      const firstPage = yield* spotify.getShowEpisodePage("fake-show-slow-science", 0)
      const lastPage = yield* spotify.getShowEpisodePage("fake-show-slow-science", 50)

      assert.strictEqual(show.name, "Slow Science")
      assert.strictEqual(firstPage.items.length, 50)
      assert.isNotNull(firstPage.next)
      assert.strictEqual(lastPage.items[0]?.id, "fake-show-slow-science-episode-50")
      assert.isNull(lastPage.items[5])
      assert.isNull(lastPage.next)
    }),
  )

  test.effect("fails with a 403 SpotifyResponseError for items of a followed playlist", () =>
    Effect.gen(function* () {
      const spotify = yield* SpotifyApi

      const error = yield* Effect.flip(spotify.getPlaylistItemsPage("fake-playlist-indie-finds", 0))

      assert.strictEqual(error._tag, "SpotifyResponseError")
      assert.include(error, { status: 403, message: "Forbidden" })
    }),
  )
})

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

describe("SpotifyApi responses", () => {
  it.effect("retries a 429 response once the Retry-After delay has passed", () => {
    const spotify = scriptedSpotify([
      {
        status: 429,
        body: spotifyErrorBody(429, "API rate limit exceeded"),
        headers: { "retry-after": "5" },
      },
      { status: 200, body: JSON.stringify(fakeCurrentUser) },
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

  it.effect("fails with SessionExpired on 401", () => {
    const spotify = scriptedSpotify([
      { status: 401, body: spotifyErrorBody(401, "The access token expired") },
    ])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const error = yield* Effect.flip(api.getCurrentUser)

      assert.strictEqual(error._tag, "SessionExpired")
    }).pipe(Effect.provide(spotify.layer))
  })

  it.effect("fails with SpotifyDecodeError when a response does not match the schema", () => {
    const spotify = scriptedSpotify([
      { status: 200, body: JSON.stringify({ id: 42, images: "none" }) },
    ])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const error = yield* Effect.flip(api.getCurrentUser)

      assert.strictEqual(error._tag, "SpotifyDecodeError")
    }).pipe(Effect.provide(spotify.layer))
  })

  // A malformed date would otherwise reach the track list and throw while it
  // renders, taking the whole page down instead of offering Retry.
  it.effect("fails with SpotifyDecodeError when a playlist item's added date is malformed", () => {
    const itemWithBadDate = { added_at: "not a date", is_local: false, item: null }
    const spotify = scriptedSpotify([
      {
        status: 200,
        body: JSON.stringify({ items: [itemWithBadDate], next: null, total: 1 }),
      },
    ])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const error = yield* Effect.flip(api.getPlaylistItemsPage("fake-playlist", 0))

      assert.strictEqual(error._tag, "SpotifyDecodeError")
    }).pipe(Effect.provide(spotify.layer))
  })

  // Proxies and outages answer with HTML instead of Spotify's error object.
  it.effect("falls back to a generic message when an error body is not Spotify's", () => {
    const spotify = scriptedSpotify([{ status: 404, body: "<html>Not Found</html>" }])
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const error = yield* Effect.flip(api.getCurrentUser)

      assert.strictEqual(error._tag, "SpotifyResponseError")
      assert.include(error, { status: 404, message: "Spotify responded with HTTP 404" })
    }).pipe(Effect.provide(spotify.layer))
  })

  it.effect("fails with SpotifyRequestError when Spotify cannot be reached", () => {
    const offline = HttpClient.make((request) =>
      Effect.fail(
        new HttpClientError.HttpClientError({
          reason: new HttpClientError.TransportError({ request, description: "Failed to fetch" }),
        }),
      ),
    )
    return Effect.gen(function* () {
      const api = yield* SpotifyApi

      const error = yield* Effect.flip(api.getCurrentUser)

      assert.strictEqual(error._tag, "SpotifyRequestError")
    }).pipe(Effect.provide(spotifyApiUsing(offline)))
  })
})

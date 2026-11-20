import { Context, Effect, Layer, Schedule, Schema, type Stream } from "effect"
import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  type HttpClientResponse,
} from "effect/http"
import { type AccessTokenError, SessionExpired } from "../../../shared/spotify-auth-replies"
import type { DesktopBridgeError } from "../../lib/desktop-bridge"
import { SavedAlbum } from "./spotify-album"
import { Artist } from "./spotify-artist"
import { SpotifyAccessToken } from "./spotify-access-token"
import { spotifyFakeAccessToken, spotifyFakeServer } from "./spotify-fake-server"
import { Paging, streamPages } from "./spotify-paging"
import { Playlist, PlaylistItem, SimplifiedPlaylist } from "./spotify-playlist"
import { SavedShow } from "./spotify-show"
import { CurrentUser } from "./spotify-user"

export class SpotifyResponseError extends Schema.TaggedError<SpotifyResponseError>()(
  "SpotifyResponseError",
  { status: Schema.Number, message: Schema.String },
) {}

export class SpotifyRequestError extends Schema.TaggedError<SpotifyRequestError>()(
  "SpotifyRequestError",
  { cause: Schema.Defect() },
) {}

export class SpotifyDecodeError extends Schema.TaggedError<SpotifyDecodeError>()(
  "SpotifyDecodeError",
  { url: Schema.String, cause: Schema.Defect() },
) {}

export type SpotifyApiError =
  | AccessTokenError
  | DesktopBridgeError
  | SpotifyResponseError
  | SpotifyRequestError
  | SpotifyDecodeError

const spotifyApiBaseUrl = "https://api.spotify.com/v1"

// The largest page Spotify allows for playlists, playlist items, and the
// user's saved and followed collections.
const pageSize = 50

// Without this, Spotify only promises to return tracks, and a playlist that
// contains a podcast episode would fail to decode.
const playlistItemTypes = "additional_types=track,episode"

const FollowedArtistsPage = Schema.Struct({ artists: Paging(Artist) })

const SpotifyErrorBody = Schema.Struct({
  error: Schema.Struct({ message: Schema.String }),
})

const errorMessage = (response: HttpClientResponse.HttpClientResponse) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(SpotifyErrorBody)),
    Effect.map((body) => body.error.message),
    Effect.orElseSucceed(() => `Spotify responded with HTTP ${response.status}`),
  )

const failForStatus = Effect.fn("SpotifyApi.failForStatus")(function* (
  response: HttpClientResponse.HttpClientResponse,
) {
  // The main process refreshes the token before it expires, so a 401 means
  // the user revoked the app's access and has to log in again.
  if (response.status === 401) {
    return yield* new SessionExpired()
  }
  const message = yield* errorMessage(response)
  return yield* new SpotifyResponseError({ status: response.status, message })
})

export class SpotifyApi extends Context.Service<
  SpotifyApi,
  {
    readonly getCurrentUser: Effect.Effect<CurrentUser, SpotifyApiError>
    readonly currentUserPlaylists: Stream.Stream<SimplifiedPlaylist, SpotifyApiError>
    readonly getPlaylist: (playlistId: string) => Effect.Effect<Playlist, SpotifyApiError>
    readonly playlistItems: (playlistId: string) => Stream.Stream<PlaylistItem, SpotifyApiError>
    readonly likedSongsCount: Effect.Effect<number, SpotifyApiError>
    readonly savedAlbums: Stream.Stream<SavedAlbum, SpotifyApiError>
    readonly followedArtists: Stream.Stream<Artist, SpotifyApiError>
    readonly savedShows: Stream.Stream<SavedShow, SpotifyApiError>
  }
>()("open-spotify/SpotifyApi") {
  static readonly layerWithoutHttpClient = Layer.effect(
    SpotifyApi,
    Effect.gen(function* () {
      const accessToken = yield* SpotifyAccessToken
      const client = (yield* HttpClient.HttpClient).pipe(
        HttpClient.mapRequestEffect((request) =>
          accessToken.get.pipe(
            Effect.map((token) =>
              request.pipe(HttpClientRequest.bearerToken(token), HttpClientRequest.acceptJson),
            ),
          ),
        ),
        // Spotify sends Retry-After with 429 responses, and retryTransient
        // waits at least that long before the next attempt.
        HttpClient.retryTransient({
          retryOn: "response-only",
          schedule: Schedule.exponential("1 second"),
          times: 3,
        }),
      )

      const getJson = Effect.fn("SpotifyApi.getJson")(function* <A>(
        url: string,
        responseSchema: Schema.Decoder<A>,
      ): Effect.fn.Return<A, SpotifyApiError> {
        const response = yield* client
          .get(url)
          .pipe(
            Effect.catchTag("HttpClientError", (cause) =>
              Effect.fail(new SpotifyRequestError({ cause })),
            ),
          )
        if (response.status < 200 || response.status >= 300) {
          return yield* failForStatus(response)
        }
        return yield* response.json.pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(responseSchema)),
          Effect.mapError((cause) => new SpotifyDecodeError({ url, cause })),
        )
      })

      return SpotifyApi.of({
        getCurrentUser: getJson(`${spotifyApiBaseUrl}/me`, CurrentUser),
        currentUserPlaylists: streamPages(
          `${spotifyApiBaseUrl}/me/playlists?limit=${pageSize}`,
          (url) => getJson(url, Paging(SimplifiedPlaylist)),
        ),
        getPlaylist: (playlistId) =>
          getJson(
            `${spotifyApiBaseUrl}/playlists/${encodeURIComponent(playlistId)}?${playlistItemTypes}`,
            Playlist,
          ),
        playlistItems: (playlistId) =>
          streamPages(
            `${spotifyApiBaseUrl}/playlists/${encodeURIComponent(playlistId)}/items?limit=${pageSize}&${playlistItemTypes}`,
            (url) => getJson(url, Paging(PlaylistItem)),
          ),
        likedSongsCount: getJson(
          `${spotifyApiBaseUrl}/me/tracks?limit=1`,
          Schema.Struct({ total: Schema.Number }),
        ).pipe(Effect.map(({ total }) => total)),
        savedAlbums: streamPages(`${spotifyApiBaseUrl}/me/albums?limit=${pageSize}`, (url) =>
          getJson(url, Paging(SavedAlbum)),
        ),
        followedArtists: streamPages(
          `${spotifyApiBaseUrl}/me/following?type=artist&limit=${pageSize}`,
          (url) => getJson(url, FollowedArtistsPage).pipe(Effect.map(({ artists }) => artists)),
        ),
        savedShows: streamPages(`${spotifyApiBaseUrl}/me/shows?limit=${pageSize}`, (url) =>
          getJson(url, Paging(SavedShow)),
        ),
      })
    }),
  )

  static readonly layer = SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide(FetchHttpClient.layer),
  )

  static readonly layerFake = SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide([spotifyFakeServer, spotifyFakeAccessToken]),
  )
}

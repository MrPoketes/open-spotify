import { Context, Effect, Layer, Option, Schedule, Schema, type Stream } from "effect"
import {
  FetchHttpClient,
  HttpClient,
  type HttpClientError,
  HttpClientRequest,
  type HttpClientResponse,
} from "effect/http"
import { type AccessTokenError, SessionExpired } from "../../../shared/spotify-auth-replies"
import type { DesktopBridgeError } from "../../lib/desktop-bridge"
import { SavedAlbum } from "./spotify-album"
import { Artist } from "./spotify-artist"
import { SpotifyAccessToken } from "./spotify-access-token"
import { Device } from "./spotify-device"
import { spotifyFakeAccessToken, spotifyFakeServer } from "./spotify-fake-server"
import { Paging, streamPages } from "./spotify-paging"
import { PlaybackState } from "./spotify-playback-state"
import { Playlist, PlaylistItemsPage, SimplifiedPlaylist } from "./spotify-playlist"
import { SavedShow, Show, ShowEpisodePage } from "./spotify-show"
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

// The largest page Spotify allows for playlists, playlist items, show episodes,
// and the user's saved and followed collections.
export const maximumPageSize = 50

// Without this, Spotify only promises to return tracks: a playlist that
// contains a podcast episode would fail to decode, and a playing episode
// would show up as a null item.
const trackAndEpisodeTypes = "additional_types=track,episode"

const FollowedArtistsPage = Schema.Struct({ artists: Paging(Artist) })

const AvailableDevices = Schema.Struct({ devices: Schema.Array(Device) })

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

// The client also fails with the access token's errors, such as when the
// user is not logged in.
const sendWith = (
  client: HttpClient.HttpClient.With<
    HttpClientError.HttpClientError | AccessTokenError | DesktopBridgeError
  >,
) =>
  Effect.fn("SpotifyApi.send")(function* (
    request: HttpClientRequest.HttpClientRequest,
  ): Effect.fn.Return<HttpClientResponse.HttpClientResponse, SpotifyApiError> {
    const response = yield* client
      .execute(request)
      .pipe(
        Effect.catchTag("HttpClientError", (cause) =>
          Effect.fail(new SpotifyRequestError({ cause })),
        ),
      )
    if (response.status < 200 || response.status >= 300) {
      return yield* failForStatus(response)
    }
    return response
  })

const decodeJson = <A>(
  response: HttpClientResponse.HttpClientResponse,
  responseSchema: Schema.Decoder<A>,
) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(responseSchema)),
    Effect.mapError((cause) => new SpotifyDecodeError({ url: response.request.url, cause })),
  )

export class SpotifyApi extends Context.Service<
  SpotifyApi,
  {
    readonly getCurrentUser: Effect.Effect<CurrentUser, SpotifyApiError>
    readonly currentUserPlaylists: Stream.Stream<SimplifiedPlaylist, SpotifyApiError>
    readonly getPlaylist: (playlistId: string) => Effect.Effect<Playlist, SpotifyApiError>
    readonly getPlaylistItemsPage: (
      playlistId: string,
      offset: number,
    ) => Effect.Effect<PlaylistItemsPage, SpotifyApiError>
    readonly likedSongsCount: Effect.Effect<number, SpotifyApiError>
    readonly savedAlbums: Stream.Stream<SavedAlbum, SpotifyApiError>
    readonly followedArtists: Stream.Stream<Artist, SpotifyApiError>
    readonly savedShows: Stream.Stream<SavedShow, SpotifyApiError>
    readonly getShow: (showId: string) => Effect.Effect<Show, SpotifyApiError>
    readonly getShowEpisodePage: (
      showId: string,
      offset: number,
    ) => Effect.Effect<ShowEpisodePage, SpotifyApiError>
    readonly getPlaybackState: Effect.Effect<Option.Option<PlaybackState>, SpotifyApiError>
    readonly getAvailableDevices: Effect.Effect<ReadonlyArray<Device>, SpotifyApiError>
    readonly transferPlayback: (deviceId: string) => Effect.Effect<void, SpotifyApiError>
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

      const send = sendWith(client)

      const getJson = <A>(url: string, responseSchema: Schema.Decoder<A>) =>
        send(HttpClientRequest.get(url)).pipe(
          Effect.flatMap((response) => decodeJson(response, responseSchema)),
        )

      // Spotify answers 204 with no body when no device is active.
      const getPlaybackState = send(
        HttpClientRequest.get(`${spotifyApiBaseUrl}/me/player?${trackAndEpisodeTypes}`),
      ).pipe(
        Effect.flatMap((response) =>
          response.status === 204
            ? Effect.succeedNone
            : decodeJson(response, PlaybackState).pipe(Effect.map(Option.some)),
        ),
      )

      return SpotifyApi.of({
        getCurrentUser: getJson(`${spotifyApiBaseUrl}/me`, CurrentUser),
        currentUserPlaylists: streamPages(
          `${spotifyApiBaseUrl}/me/playlists?limit=${maximumPageSize}`,
          (url) => getJson(url, Paging(SimplifiedPlaylist)),
        ),
        getPlaylist: (playlistId) =>
          getJson(
            `${spotifyApiBaseUrl}/playlists/${encodeURIComponent(playlistId)}?${trackAndEpisodeTypes}`,
            Playlist,
          ),
        getPlaylistItemsPage: (playlistId, offset) =>
          getJson(
            `${spotifyApiBaseUrl}/playlists/${encodeURIComponent(playlistId)}/items?limit=${maximumPageSize}&offset=${offset}&${trackAndEpisodeTypes}`,
            PlaylistItemsPage,
          ),
        likedSongsCount: getJson(
          `${spotifyApiBaseUrl}/me/tracks?limit=1`,
          Schema.Struct({ total: Schema.Number }),
        ).pipe(Effect.map(({ total }) => total)),
        savedAlbums: streamPages(`${spotifyApiBaseUrl}/me/albums?limit=${maximumPageSize}`, (url) =>
          getJson(url, Paging(SavedAlbum)),
        ),
        followedArtists: streamPages(
          `${spotifyApiBaseUrl}/me/following?type=artist&limit=${maximumPageSize}`,
          (url) => getJson(url, FollowedArtistsPage).pipe(Effect.map(({ artists }) => artists)),
        ),
        savedShows: streamPages(`${spotifyApiBaseUrl}/me/shows?limit=${maximumPageSize}`, (url) =>
          getJson(url, Paging(SavedShow)),
        ),
        getShow: (showId) =>
          getJson(`${spotifyApiBaseUrl}/shows/${encodeURIComponent(showId)}`, Show),
        getShowEpisodePage: (showId, offset) =>
          getJson(
            `${spotifyApiBaseUrl}/shows/${encodeURIComponent(showId)}/episodes?limit=${maximumPageSize}&offset=${offset}`,
            ShowEpisodePage,
          ),
        getPlaybackState,
        getAvailableDevices: getJson(
          `${spotifyApiBaseUrl}/me/player/devices`,
          AvailableDevices,
        ).pipe(Effect.map(({ devices }) => devices)),
        transferPlayback: (deviceId) =>
          send(
            HttpClientRequest.put(`${spotifyApiBaseUrl}/me/player`).pipe(
              HttpClientRequest.bodyJsonUnsafe({ device_ids: [deviceId] }),
            ),
          ).pipe(Effect.asVoid),
      })
    }),
  )

  static readonly layer = SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide(FetchHttpClient.layer),
  )

  static readonly layerFake = SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide([spotifyFakeServer, spotifyFakeAccessToken]),
  )

  // The fake with some operations replaced, for tests of states the fixtures
  // do not cover, such as failures and empty results.
  static readonly layerFakeWith = (
    overrides: (spotify: SpotifyApi["Service"]) => Partial<SpotifyApi["Service"]>,
  ) =>
    Layer.effect(
      SpotifyApi,
      Effect.gen(function* () {
        const spotify = yield* SpotifyApi
        return SpotifyApi.of({ ...spotify, ...overrides(spotify) })
      }),
    ).pipe(Layer.provide(SpotifyApi.layerFake))
}

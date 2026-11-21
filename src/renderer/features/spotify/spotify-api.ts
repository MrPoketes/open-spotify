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
import {
  Album,
  AlbumTracksPage,
  type AlbumTrack,
  ArtistAlbumsPage,
  SavedAlbum,
} from "./spotify-album"
import { Artist } from "./spotify-artist"
import { SpotifyAccessToken } from "./spotify-access-token"
import { spotifyApiBaseUrl } from "./spotify-api-url"
import type { Device } from "./spotify-device"
import { spotifyFakeAccessToken, spotifyFakeServer } from "./spotify-fake-server"
import { type TimeRange, listeningHistoryRequests } from "./spotify-listening-history"
import { Paging, streamPages } from "./spotify-paging"
import type { PlayHistory } from "./spotify-play-history"
import { PlaybackState, type RepeatMode } from "./spotify-playback-state"
import type { PlayerQueue } from "./spotify-player-queue"
import { playerCommands, playerReads, playerUrl } from "./spotify-player-requests"
import { Playlist, PlaylistItemsPage, SimplifiedPlaylist } from "./spotify-playlist"
import { SearchResults, type SearchType, searchPageSize } from "./spotify-search"
import { SavedShow, Show, ShowEpisodePage } from "./spotify-show"
import { SavedTracksPage, type Track } from "./spotify-track"
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

// Player commands fail with this when no Spotify Connect device is active.
export class NoActiveDevice extends Schema.TaggedError<NoActiveDevice>()("NoActiveDevice", {}) {}

export type SpotifyApiError =
  | AccessTokenError
  | DesktopBridgeError
  | SpotifyResponseError
  | SpotifyRequestError
  | SpotifyDecodeError
  | NoActiveDevice

// The largest page Spotify allows for playlists, playlist items, album tracks,
// show episodes, and the user's saved and followed collections.
export const maximumPageSize = 50

// Spotify caps a page of an artist's albums at 10.
export const artistAlbumsPageSize = 10

// The include_groups values for the parts of an artist's discography. Spotify
// no longer says which group an album belongs to, so each group is requested
// on its own.
export type AlbumGroup = "album" | "single" | "appears_on"

// Without this, Spotify only promises to return tracks: a playlist that
// contains a podcast episode would fail to decode, and a playing episode
// would show up as a null item.
const trackAndEpisodeTypes = "additional_types=track,episode"

const FollowedArtistsPage = Schema.Struct({ artists: Paging(Artist) })

const SpotifyErrorBody = Schema.Struct({
  error: Schema.Struct({ message: Schema.String, reason: Schema.optionalKey(Schema.String) }),
})

const errorDetails = (response: HttpClientResponse.HttpClientResponse) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(SpotifyErrorBody)),
    Effect.map(({ error }) => error),
    Effect.orElseSucceed((): typeof SpotifyErrorBody.Type.error => ({
      message: `Spotify responded with HTTP ${response.status}`,
    })),
  )

const failForStatus = Effect.fn("SpotifyApi.failForStatus")(function* (
  response: HttpClientResponse.HttpClientResponse,
) {
  // The main process refreshes the token before it expires, so a 401 means
  // the user revoked the app's access and has to log in again.
  if (response.status === 401) {
    return yield* new SessionExpired()
  }
  const { message, reason } = yield* errorDetails(response)
  if (reason === "NO_ACTIVE_DEVICE") {
    return yield* new NoActiveDevice()
  }
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

const searchUrl = (query: string, types: ReadonlyArray<SearchType>, offset: number) =>
  `${spotifyApiBaseUrl}/search?q=${encodeURIComponent(query)}&type=${types.join(",")}&limit=${searchPageSize}&offset=${offset}`

const addToPlaylistRequest = (playlistId: string, uri: string) =>
  HttpClientRequest.post(
    `${spotifyApiBaseUrl}/playlists/${encodeURIComponent(playlistId)}/items`,
  ).pipe(HttpClientRequest.bodyJsonUnsafe({ uris: [uri] }))

const authorizedClient = Effect.gen(function* () {
  const accessToken = yield* SpotifyAccessToken
  return (yield* HttpClient.HttpClient).pipe(
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
})

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
    readonly addToPlaylist: (
      playlistId: string,
      uri: string,
    ) => Effect.Effect<void, SpotifyApiError>
    readonly getAlbum: (albumId: string) => Effect.Effect<Album, SpotifyApiError>
    // The album's tracks from the offset on, for albums longer than the page
    // Spotify embeds in the album.
    readonly albumTracks: (
      albumId: string,
      offset: number,
    ) => Stream.Stream<AlbumTrack, SpotifyApiError>
    readonly getArtist: (artistId: string) => Effect.Effect<Artist, SpotifyApiError>
    readonly getArtistAlbumsPage: (
      artistId: string,
      albumGroup: AlbumGroup,
      offset: number,
    ) => Effect.Effect<ArtistAlbumsPage, SpotifyApiError>
    // The page of each requested kind of result that starts at the offset.
    readonly search: (
      query: string,
      types: ReadonlyArray<SearchType>,
      offset: number,
    ) => Effect.Effect<SearchResults, SpotifyApiError>
    readonly likedSongsCount: Effect.Effect<number, SpotifyApiError>
    readonly getLikedSongsPage: (offset: number) => Effect.Effect<SavedTracksPage, SpotifyApiError>
    readonly savedAlbums: Stream.Stream<SavedAlbum, SpotifyApiError>
    readonly followedArtists: Stream.Stream<Artist, SpotifyApiError>
    readonly savedShows: Stream.Stream<SavedShow, SpotifyApiError>
    readonly getShow: (showId: string) => Effect.Effect<Show, SpotifyApiError>
    readonly getShowEpisodePage: (
      showId: string,
      offset: number,
    ) => Effect.Effect<ShowEpisodePage, SpotifyApiError>
    // Newest first.
    readonly getRecentlyPlayed: Effect.Effect<ReadonlyArray<PlayHistory>, SpotifyApiError>
    readonly getTopArtists: (
      timeRange: TimeRange,
    ) => Effect.Effect<ReadonlyArray<Artist>, SpotifyApiError>
    readonly getTopTracks: (
      timeRange: TimeRange,
    ) => Effect.Effect<ReadonlyArray<Track>, SpotifyApiError>
    readonly getPlaybackState: Effect.Effect<Option.Option<PlaybackState>, SpotifyApiError>
    readonly getAvailableDevices: Effect.Effect<ReadonlyArray<Device>, SpotifyApiError>
    readonly getQueue: Effect.Effect<PlayerQueue, SpotifyApiError>
    readonly transferPlayback: (deviceId: string) => Effect.Effect<void, SpotifyApiError>
    readonly play: Effect.Effect<void, SpotifyApiError>
    readonly pause: Effect.Effect<void, SpotifyApiError>
    readonly skipToNext: Effect.Effect<void, SpotifyApiError>
    readonly skipToPrevious: Effect.Effect<void, SpotifyApiError>
    readonly setShuffle: (isOn: boolean) => Effect.Effect<void, SpotifyApiError>
    readonly setRepeat: (mode: RepeatMode) => Effect.Effect<void, SpotifyApiError>
    readonly addToQueue: (uri: string) => Effect.Effect<void, SpotifyApiError>
  }
>()("open-spotify/SpotifyApi") {
  static readonly layerWithoutHttpClient = Layer.effect(
    SpotifyApi,
    Effect.gen(function* () {
      const send = sendWith(yield* authorizedClient)

      const getJson = <A>(url: string, responseSchema: Schema.Decoder<A>) =>
        send(HttpClientRequest.get(url)).pipe(
          Effect.flatMap((response) => decodeJson(response, responseSchema)),
        )

      // Spotify answers 204 with no body when no device is active.
      const getPlaybackState = send(
        HttpClientRequest.get(`${playerUrl}?${trackAndEpisodeTypes}`),
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
        // Spotify answers with the playlist's new snapshot id, which nothing
        // needs.
        addToPlaylist: (playlistId, uri) =>
          send(addToPlaylistRequest(playlistId, uri)).pipe(Effect.asVoid),
        getAlbum: (albumId) =>
          getJson(`${spotifyApiBaseUrl}/albums/${encodeURIComponent(albumId)}`, Album),
        albumTracks: (albumId, offset) =>
          streamPages(
            `${spotifyApiBaseUrl}/albums/${encodeURIComponent(albumId)}/tracks?limit=${maximumPageSize}&offset=${offset}`,
            (url) => getJson(url, AlbumTracksPage),
          ),
        getArtist: (artistId) =>
          getJson(`${spotifyApiBaseUrl}/artists/${encodeURIComponent(artistId)}`, Artist),
        getArtistAlbumsPage: (artistId, albumGroup, offset) =>
          getJson(
            `${spotifyApiBaseUrl}/artists/${encodeURIComponent(artistId)}/albums?include_groups=${albumGroup}&limit=${artistAlbumsPageSize}&offset=${offset}`,
            ArtistAlbumsPage,
          ),
        search: (query, types, offset) => getJson(searchUrl(query, types, offset), SearchResults),
        likedSongsCount: getJson(
          `${spotifyApiBaseUrl}/me/tracks?limit=1`,
          Schema.Struct({ total: Schema.Number }),
        ).pipe(Effect.map(({ total }) => total)),
        getLikedSongsPage: (offset) =>
          getJson(
            `${spotifyApiBaseUrl}/me/tracks?limit=${maximumPageSize}&offset=${offset}`,
            SavedTracksPage,
          ),
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
        ...listeningHistoryRequests(getJson),
        getPlaybackState,
        ...playerReads(getJson),
        ...playerCommands((request) => send(request).pipe(Effect.asVoid)),
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

import { Context, Effect, Layer, Option, Schema, type Stream } from "effect"
import {
  FetchHttpClient,
  HttpClientRequest,
  type HttpClient,
  type HttpClientError,
  type HttpClientResponse,
} from "effect/http"
import { SessionExpired, type AccessTokenError } from "../../../shared/spotify-auth-replies"
import type { DesktopBridgeError } from "../../lib/desktop-bridge"
import { classifyForbidden, SpotifyAccessDenial } from "./spotify-access-denial"
import { authorizedSpotifyClient } from "./spotify-access-token"
import {
  Album,
  AlbumTracksPage,
  SavedAlbum,
  type AlbumTrack,
  type ArtistAlbumsPage,
} from "./spotify-album"
import { spotifyApiBaseUrl } from "./spotify-api-url"
import { Artist } from "./spotify-artist"
import { artistRequests, type AlbumGroup } from "./spotify-artist-requests"
import type { Device } from "./spotify-device"
import { parseSpotifyErrorBody } from "./spotify-error-body"
import {
  mainProcessFailureForwarder,
  reportClientFailure,
  reportDecodeFailure,
  reportSpotifyFailure,
  SpotifyFailureLogForwarder,
  type SpotifyFailureForwarder,
} from "./spotify-failure-logging"
import { listeningHistoryRequests, type TimeRange } from "./spotify-listening-history"
import { Paging, streamPages } from "./spotify-paging"
import type { PlayHistory } from "./spotify-play-history"
import { PlaybackState, type RepeatMode } from "./spotify-playback-state"
import type { PlayerQueue } from "./spotify-player-queue"
import {
  playerCommands,
  playerReads,
  playerUrl,
  type PlaybackStart,
} from "./spotify-player-requests"
import { Playlist, PlaylistItemsPage, SimplifiedPlaylist } from "./spotify-playlist"
import { searchPageSize, SearchResults, type SearchType } from "./spotify-search"
import { SavedShow, Show, ShowEpisodePage } from "./spotify-show"
import { SavedTracksPage, Track } from "./spotify-track"
import { CurrentUser } from "./spotify-user"

export class SpotifyResponseError extends Schema.TaggedError<SpotifyResponseError>()(
  "SpotifyResponseError",
  { status: Schema.Number, message: Schema.String },
) {}

export class SpotifyRequestError extends Schema.TaggedError<SpotifyRequestError>()(
  "SpotifyRequestError",
  { cause: Schema.Defect() },
) {}

class SpotifyDecodeError extends Schema.TaggedError<SpotifyDecodeError>()("SpotifyDecodeError", {
  url: Schema.String,
  cause: Schema.Defect(),
}) {}

// Development-mode 403 failures that retrying cannot fix: the account is not
// allowlisted in the Spotify Developer Dashboard, or lacks Premium.
export class SpotifyAccessDenied extends Schema.TaggedError<SpotifyAccessDenied>()(
  "SpotifyAccessDenied",
  {
    denial: SpotifyAccessDenial,
    message: Schema.String,
  },
) {}

// Player commands fail with this when no Spotify Connect device is active.
export class NoActiveDevice extends Schema.TaggedError<NoActiveDevice>()("NoActiveDevice", {}) {}

export type SpotifyApiError =
  | AccessTokenError
  | DesktopBridgeError
  | SpotifyAccessDenied
  | SpotifyResponseError
  | SpotifyRequestError
  | SpotifyDecodeError
  | NoActiveDevice

// The largest page Spotify allows for playlists, playlist items, album tracks,
// show episodes, and the user's saved and followed collections.
export const maximumPageSize = 50

// Without this, Spotify only promises to return tracks: a playlist that
// contains a podcast episode would fail to decode, and a playing episode
// would show up as a null item.
const trackAndEpisodeTypes = "additional_types=track,episode"

const FollowedArtistsPage = Schema.Struct({ artists: Paging(Artist) })

const classifyStatusFailure = (status: number, message: string, reason: string | undefined) => {
  // The main process refreshes the token before it expires, so a 401 means
  // the user revoked the app's access and has to log in again.
  if (status === 401) {
    return { error: new SessionExpired(), logSummary: "SessionExpired" }
  }
  if (reason === "NO_ACTIVE_DEVICE") {
    return { error: new NoActiveDevice(), logSummary: "NoActiveDevice" }
  }
  const denial = status === 403 ? classifyForbidden(message, reason) : null
  if (denial !== null) {
    return {
      error: new SpotifyAccessDenied({ denial, message }),
      logSummary: `SpotifyAccessDenied (${denial})`,
    }
  }
  return { error: new SpotifyResponseError({ status, message }), logSummary: `HTTP ${status}` }
}

const failForStatus = Effect.fn("SpotifyApi.failForStatus")(function* (
  response: HttpClientResponse.HttpClientResponse,
  forwardFailure: SpotifyFailureForwarder,
) {
  const { message, reason } = yield* parseSpotifyErrorBody(response)
  const { error, logSummary } = classifyStatusFailure(response.status, message, reason)
  yield* reportSpotifyFailure(forwardFailure, {
    url: response.request.url,
    status: response.status,
    spotifyMessage: message,
    spotifyReason: reason ?? null,
    cause: logSummary,
  })
  return yield* error
})

// The client also fails with the access token's errors, such as when the
// user is not logged in.
const sendWith = (
  client: HttpClient.HttpClient.With<
    HttpClientError.HttpClientError | AccessTokenError | DesktopBridgeError
  >,
  forwardFailure: SpotifyFailureForwarder,
) =>
  Effect.fn("SpotifyApi.send")(function* (
    request: HttpClientRequest.HttpClientRequest,
  ): Effect.fn.Return<HttpClientResponse.HttpClientResponse, SpotifyApiError> {
    const response = yield* client.execute(request).pipe(
      Effect.catchTag("HttpClientError", (cause) =>
        Effect.fail(new SpotifyRequestError({ cause })),
      ),
      Effect.tapError((error) => reportClientFailure(forwardFailure, request.url, error)),
    )
    if (response.status < 200 || response.status >= 300) {
      return yield* failForStatus(response, forwardFailure)
    }
    return response
  })

const decodeJson = <A>(
  response: HttpClientResponse.HttpClientResponse,
  responseSchema: Schema.Decoder<A>,
  forwardFailure: SpotifyFailureForwarder,
) =>
  response.json.pipe(
    Effect.flatMap(Schema.decodeUnknownEffect(responseSchema)),
    Effect.mapError((cause) => new SpotifyDecodeError({ url: response.request.url, cause })),
    Effect.tapError((error) => reportDecodeFailure(forwardFailure, response, error.cause)),
  )

const searchUrl = (query: string, types: ReadonlyArray<SearchType>, offset: number) =>
  `${spotifyApiBaseUrl}/search?q=${encodeURIComponent(query)}&type=${types.join(",")}&limit=${searchPageSize}&offset=${offset}`

const addToPlaylistRequest = (playlistId: string, uri: string) =>
  HttpClientRequest.post(
    `${spotifyApiBaseUrl}/playlists/${encodeURIComponent(playlistId)}/items`,
  ).pipe(HttpClientRequest.bodyJsonUnsafe({ uris: [uri] }))

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
    readonly getTrack: (trackId: string) => Effect.Effect<Track, SpotifyApiError>
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
    // Resumes what was playing.
    readonly play: Effect.Effect<void, SpotifyApiError>
    readonly startPlayback: (start: PlaybackStart) => Effect.Effect<void, SpotifyApiError>
    readonly pause: Effect.Effect<void, SpotifyApiError>
    readonly skipToNext: Effect.Effect<void, SpotifyApiError>
    readonly skipToPrevious: Effect.Effect<void, SpotifyApiError>
    readonly seek: (positionMs: number) => Effect.Effect<void, SpotifyApiError>
    readonly setShuffle: (isOn: boolean) => Effect.Effect<void, SpotifyApiError>
    readonly setRepeat: (mode: RepeatMode) => Effect.Effect<void, SpotifyApiError>
    // From 0 to 100.
    readonly setVolume: (volumePercent: number) => Effect.Effect<void, SpotifyApiError>
    readonly addToQueue: (uri: string) => Effect.Effect<void, SpotifyApiError>
  }
>()("open-spotify/SpotifyApi") {
  static readonly layerWithoutHttpClient = Layer.effect(
    SpotifyApi,
    Effect.gen(function* () {
      const forwardFailure = yield* SpotifyFailureLogForwarder
      const send = sendWith(yield* authorizedSpotifyClient, forwardFailure)

      const getJson = <A>(url: string, responseSchema: Schema.Decoder<A>) =>
        send(HttpClientRequest.get(url)).pipe(
          Effect.flatMap((response) => decodeJson(response, responseSchema, forwardFailure)),
        )

      // Spotify answers 204 with no body when no device is active.
      const getPlaybackState = send(
        HttpClientRequest.get(`${playerUrl}?${trackAndEpisodeTypes}`),
      ).pipe(
        Effect.flatMap((response) =>
          response.status === 204
            ? Effect.succeedNone
            : decodeJson(response, PlaybackState, forwardFailure).pipe(Effect.map(Option.some)),
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
        getTrack: (trackId) =>
          getJson(`${spotifyApiBaseUrl}/tracks/${encodeURIComponent(trackId)}`, Track),
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
        ...artistRequests(getJson),
        ...listeningHistoryRequests(getJson),
        getPlaybackState,
        ...playerReads(getJson),
        ...playerCommands((request) => send(request).pipe(Effect.asVoid)),
      })
    }),
  )

  static readonly layer = SpotifyApi.layerWithoutHttpClient.pipe(
    Layer.provide([FetchHttpClient.layer, mainProcessFailureForwarder]),
  )
}

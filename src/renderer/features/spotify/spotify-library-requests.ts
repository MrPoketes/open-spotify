import { Effect, Schema } from "effect"
import { SavedAlbum } from "./spotify-album"
import { Artist } from "./spotify-artist"
import { spotifyApiBaseUrl } from "./spotify-api-url"
import { Paging, maximumPageSize, streamPages } from "./spotify-paging"
import { SimplifiedPlaylist } from "./spotify-playlist"
import { SavedShow } from "./spotify-show"
import { SavedTracksPage } from "./spotify-track"

const FollowedArtistsPage = Schema.Struct({ artists: Paging(Artist) })

// What the user has saved, followed, or created, fetched with SpotifyApi's getJson.
export const libraryRequests = <E>(
  getJson: <A>(url: string, responseSchema: Schema.Decoder<A>) => Effect.Effect<A, E>,
) => ({
  currentUserPlaylists: streamPages(
    `${spotifyApiBaseUrl}/me/playlists?limit=${maximumPageSize}`,
    (url) => getJson(url, Paging(SimplifiedPlaylist)),
  ),
  likedSongsCount: getJson(
    `${spotifyApiBaseUrl}/me/tracks?limit=1`,
    Schema.Struct({ total: Schema.Number }),
  ).pipe(Effect.map(({ total }) => total)),
  getLikedSongsPage: (offset: number) =>
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
})

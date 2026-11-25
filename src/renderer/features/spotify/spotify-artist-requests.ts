import type { Effect, Schema } from "effect"
import { ArtistAlbumsPage } from "./spotify-album"
import { spotifyApiBaseUrl } from "./spotify-api-url"
import { Artist } from "./spotify-artist"

// Spotify caps a page of an artist's albums at 10.
const artistAlbumsPageSize = 10

// The include_groups values for the parts of an artist's discography. Spotify
// no longer says which group an album belongs to, so each group is requested
// on its own.
export type AlbumGroup = "album" | "single" | "appears_on"

// An artist and their discography, fetched with SpotifyApi's getJson.
export const artistRequests = <E>(
  getJson: <A>(url: string, responseSchema: Schema.Decoder<A>) => Effect.Effect<A, E>,
) => ({
  getArtist: (artistId: string) =>
    getJson(`${spotifyApiBaseUrl}/artists/${encodeURIComponent(artistId)}`, Artist),
  getArtistAlbumsPage: (artistId: string, albumGroup: AlbumGroup, offset: number) =>
    getJson(
      `${spotifyApiBaseUrl}/artists/${encodeURIComponent(artistId)}/albums?include_groups=${albumGroup}&limit=${artistAlbumsPageSize}&offset=${offset}`,
      ArtistAlbumsPage,
    ),
})

import { Effect, Stream } from "effect"
import { songCountText } from "../liked-songs/song-count-text"
import type { SavedAlbum } from "../spotify/spotify-album"
import { SpotifyApi } from "../spotify/spotify-api"
import type { Artist } from "../spotify/spotify-artist"
import type { Image } from "../spotify/spotify-image"
import type { SimplifiedPlaylist } from "../spotify/spotify-playlist"
import type { SavedShow } from "../spotify/spotify-show"

export type LibraryEntryKind = "liked-songs" | "playlist" | "album" | "artist" | "show"

export interface LibraryEntry {
  readonly uri: string
  readonly kind: LibraryEntryKind
  readonly name: string
  readonly details: string
  readonly images: ReadonlyArray<Image>
  // Null for kinds whose page does not exist yet.
  readonly page:
    | { readonly to: "/collection/tracks" }
    | { readonly to: "/playlist/$playlistId"; readonly params: { readonly playlistId: string } }
    | { readonly to: "/show/$showId"; readonly params: { readonly showId: string } }
    | null
}

const likedSongsEntry = (songCount: number): LibraryEntry => ({
  uri: "spotify:collection:tracks",
  kind: "liked-songs",
  name: "Liked Songs",
  details: `Playlist · ${songCountText(songCount)}`,
  images: [],
  page: { to: "/collection/tracks" },
})

const playlistEntry = (playlist: SimplifiedPlaylist): LibraryEntry => ({
  uri: playlist.uri,
  kind: "playlist",
  name: playlist.name,
  details: `Playlist · ${playlist.owner.displayName ?? playlist.owner.id}`,
  images: playlist.images ?? [],
  page: { to: "/playlist/$playlistId", params: { playlistId: playlist.id } },
})

const albumEntry = ({ album }: SavedAlbum): LibraryEntry => ({
  uri: album.uri,
  kind: "album",
  name: album.name,
  details: `Album · ${album.artists.map(({ name }) => name).join(", ")}`,
  images: album.images,
  page: null,
})

const artistEntry = (artist: Artist): LibraryEntry => ({
  uri: artist.uri,
  kind: "artist",
  name: artist.name,
  details: "Artist",
  images: artist.images,
  page: null,
})

const showEntry = ({ show }: SavedShow): LibraryEntry => ({
  uri: show.uri,
  kind: "show",
  name: show.name,
  details: "Show",
  images: show.images,
  page: { to: "/show/$showId", params: { showId: show.id } },
})

export const loadLibraryEntries = Effect.gen(function* () {
  const spotify = yield* SpotifyApi
  const library = yield* Effect.all(
    {
      likedSongsCount: spotify.likedSongsCount,
      playlists: Stream.runCollect(spotify.currentUserPlaylists),
      albums: Stream.runCollect(spotify.savedAlbums),
      artists: Stream.runCollect(spotify.followedArtists),
      shows: Stream.runCollect(spotify.savedShows),
    },
    { concurrency: "unbounded" },
  )
  // An entry for zero liked songs would hide the empty-library message.
  const likedSongs = library.likedSongsCount > 0 ? [likedSongsEntry(library.likedSongsCount)] : []
  return [
    ...likedSongs,
    ...library.playlists.map(playlistEntry),
    ...library.albums.map(albumEntry),
    ...library.artists.map(artistEntry),
    ...library.shows.map(showEntry),
  ]
})

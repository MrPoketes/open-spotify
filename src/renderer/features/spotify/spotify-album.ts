import { Schema } from "effect"
import { SimplifiedArtist } from "./spotify-artist"
import { Image } from "./spotify-image"
import { Paging } from "./spotify-paging"

// Local files have no Spotify id.
export const SimplifiedAlbum = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  name: Schema.String,
  images: Schema.Array(Image),
})

export const SavedAlbum = Schema.Struct({
  album: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    images: Schema.Array(Image),
    artists: Schema.Array(SimplifiedArtist),
    uri: Schema.String,
  }),
})

export type SavedAlbum = typeof SavedAlbum.Type

// What search results list for each album.
export const SearchAlbum = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  images: Schema.Array(Image),
  artists: Schema.Array(SimplifiedArtist),
  uri: Schema.String,
})

export type SearchAlbum = typeof SearchAlbum.Type

// What an artist's discography lists for each release.
export const ArtistAlbum = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  images: Schema.Array(Image),
  // A year, a year and month, or a full date, depending on what Spotify knows.
  releaseDate: Schema.String,
  uri: Schema.String,
}).pipe(Schema.encodeKeys({ releaseDate: "release_date" }))

export type ArtistAlbum = typeof ArtistAlbum.Type

export const ArtistAlbumsPage = Paging(ArtistAlbum)

export type ArtistAlbumsPage = typeof ArtistAlbumsPage.Type

export const AlbumTrack = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  durationMs: Schema.Number,
  discNumber: Schema.Number,
  artists: Schema.Array(SimplifiedArtist),
}).pipe(
  Schema.encodeKeys({
    durationMs: "duration_ms",
    discNumber: "disc_number",
  }),
)

export type AlbumTrack = typeof AlbumTrack.Type

export const AlbumTracksPage = Paging(AlbumTrack)

export const Album = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  images: Schema.Array(Image),
  artists: Schema.Array(SimplifiedArtist),
  uri: Schema.String,
  // A year, a year and month, or a full date, depending on what Spotify knows.
  releaseDate: Schema.String,
  totalTracks: Schema.Number,
  // Spotify embeds only the first page of tracks.
  tracks: AlbumTracksPage,
}).pipe(Schema.encodeKeys({ releaseDate: "release_date", totalTracks: "total_tracks" }))

export type Album = typeof Album.Type

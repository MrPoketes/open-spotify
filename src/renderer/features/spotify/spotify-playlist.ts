import { Schema } from "effect"
import { Episode } from "./spotify-episode"
import { Image } from "./spotify-image"
import { Paging } from "./spotify-paging"
import { Track } from "./spotify-track"

const PlaylistOwner = Schema.Struct({
  id: Schema.String,
  displayName: Schema.NullOr(Schema.String),
}).pipe(Schema.encodeKeys({ displayName: "display_name" }))

export const PlaylistItem = Schema.Struct({
  // Null on some very old playlists.
  addedAt: Schema.NullOr(Schema.String),
  isLocal: Schema.Boolean,
  // Null when the track was removed from Spotify.
  item: Schema.NullOr(Schema.Union([Track, Episode])),
}).pipe(Schema.encodeKeys({ addedAt: "added_at", isLocal: "is_local" }))

export type PlaylistItem = typeof PlaylistItem.Type

const playlistFields = {
  id: Schema.String,
  name: Schema.String,
  description: Schema.NullOr(Schema.String),
  // Spotify sends null instead of an empty array for playlists without a cover.
  images: Schema.NullOr(Schema.Array(Image)),
  owner: PlaylistOwner,
  collaborative: Schema.Boolean,
  uri: Schema.String,
}

export const SimplifiedPlaylist = Schema.Struct({
  ...playlistFields,
  items: Schema.Struct({ total: Schema.Number }),
})

export type SimplifiedPlaylist = typeof SimplifiedPlaylist.Type

export const Playlist = Schema.Struct({
  ...playlistFields,
  // Spotify includes the first page of items only for playlists the user owns
  // or collaborates on.
  items: Schema.optionalKey(Paging(PlaylistItem)),
})

export type Playlist = typeof Playlist.Type

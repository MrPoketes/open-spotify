import { Schema } from "effect"
import { Album } from "./spotify-album"
import { SimplifiedArtist } from "./spotify-artist"
import { Paging } from "./spotify-paging"

export const Track = Schema.Struct({
  type: Schema.Literal("track"),
  // Local files have no Spotify id.
  id: Schema.NullOr(Schema.String),
  name: Schema.String,
  uri: Schema.String,
  durationMs: Schema.Number,
  explicit: Schema.Boolean,
  album: Album,
  artists: Schema.Array(SimplifiedArtist),
}).pipe(Schema.encodeKeys({ durationMs: "duration_ms" }))

export type Track = typeof Track.Type

export const SavedTrack = Schema.Struct({
  addedAt: Schema.DateFromString,
  track: Track,
}).pipe(Schema.encodeKeys({ addedAt: "added_at" }))

export type SavedTrack = typeof SavedTrack.Type

export const SavedTracksPage = Paging(SavedTrack)

export type SavedTracksPage = typeof SavedTracksPage.Type

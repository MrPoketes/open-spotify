import { Schema } from "effect"
import { Album } from "./spotify-album"
import { SimplifiedArtist } from "./spotify-artist"

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

import { Schema } from "effect"
import { Image } from "./spotify-image"

// Local files have no Spotify id.
export const SimplifiedArtist = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  name: Schema.String,
})

// Since February 2026, development-mode responses leave out followers and
// popularity.
export const Artist = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  images: Schema.Array(Image),
  uri: Schema.String,
})

export type Artist = typeof Artist.Type

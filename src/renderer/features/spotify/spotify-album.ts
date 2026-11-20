import { Schema } from "effect"
import { Image } from "./spotify-image"

// Local files have no Spotify id.
export const Album = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  name: Schema.String,
  images: Schema.Array(Image),
})

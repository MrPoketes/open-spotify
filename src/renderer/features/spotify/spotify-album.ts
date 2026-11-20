import { Schema } from "effect"
import { SimplifiedArtist } from "./spotify-artist"
import { Image } from "./spotify-image"

// Local files have no Spotify id.
export const Album = Schema.Struct({
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

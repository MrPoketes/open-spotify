import { Effect, Schema } from "effect"
import { Image } from "./spotify-image"

// Local files have no Spotify id.
export const SimplifiedArtist = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  name: Schema.String,
})

export type SimplifiedArtist = typeof SimplifiedArtist.Type

// Since February 2026, development-mode responses leave out followers and
// popularity. Genres are deprecated too, so a response without them still
// decodes.
export const Artist = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  images: Schema.Array(Image),
  genres: Schema.Array(Schema.String).pipe(Schema.withDecodingDefaultKey(Effect.succeed([]))),
  uri: Schema.String,
})

export type Artist = typeof Artist.Type

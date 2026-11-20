import { Schema } from "effect"

// Local files have no Spotify id.
export const Artist = Schema.Struct({
  id: Schema.NullOr(Schema.String),
  name: Schema.String,
})

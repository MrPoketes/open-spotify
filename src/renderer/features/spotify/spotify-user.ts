import { Schema } from "effect"
import { Image } from "./spotify-image"

export const CurrentUser = Schema.Struct({
  id: Schema.String,
  displayName: Schema.NullOr(Schema.String),
  images: Schema.Array(Image),
  uri: Schema.String,
}).pipe(Schema.encodeKeys({ displayName: "display_name" }))

export type CurrentUser = typeof CurrentUser.Type

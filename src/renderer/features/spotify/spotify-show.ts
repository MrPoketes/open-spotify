import { Schema } from "effect"
import { Image } from "./spotify-image"

// Since February 2026, development-mode responses leave out the publisher.
export const SavedShow = Schema.Struct({
  show: Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    images: Schema.Array(Image),
    uri: Schema.String,
  }),
})

export type SavedShow = typeof SavedShow.Type

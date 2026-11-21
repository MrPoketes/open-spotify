import { Schema } from "effect"

// track is the id of a track to highlight, for links that open a track on its
// album.
export const AlbumSearchParams = Schema.Struct({ track: Schema.optional(Schema.String) })

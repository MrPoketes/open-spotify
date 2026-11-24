import { Schema } from "effect"
import { Image } from "./spotify-image"

const SimplifiedEpisode = Schema.Struct({
  type: Schema.Literal("episode"),
  id: Schema.String,
  name: Schema.String,
  uri: Schema.String,
  images: Schema.Array(Image),
  durationMs: Schema.Number,
  // Plain text: Spotify strips the HTML that `html_description` keeps.
  description: Schema.String,
  releaseDate: Schema.DateFromString,
  releaseDatePrecision: Schema.Literals(["year", "month", "day"]),
})

const episodeKeys = {
  durationMs: "duration_ms",
  releaseDate: "release_date",
  releaseDatePrecision: "release_date_precision",
} as const

export const Episode = SimplifiedEpisode.pipe(Schema.encodeKeys(episodeKeys))

export type Episode = typeof Episode.Type

// The player reports full episode objects, which name the show they belong
// to. A show's episode list leaves the show out.
export const PlayableEpisode = SimplifiedEpisode.pipe(
  Schema.fieldsAssign({ show: Schema.Struct({ id: Schema.String }) }),
  Schema.encodeKeys(episodeKeys),
)

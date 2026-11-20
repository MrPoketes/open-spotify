import { Schema } from "effect"

export const Episode = Schema.Struct({
  type: Schema.Literal("episode"),
  id: Schema.String,
  name: Schema.String,
  uri: Schema.String,
  durationMs: Schema.Number,
  // Plain text: Spotify strips the HTML that `html_description` keeps.
  description: Schema.String,
  releaseDate: Schema.String,
  releaseDatePrecision: Schema.Literals(["year", "month", "day"]),
}).pipe(
  Schema.encodeKeys({
    durationMs: "duration_ms",
    releaseDate: "release_date",
    releaseDatePrecision: "release_date_precision",
  }),
)

export type Episode = typeof Episode.Type

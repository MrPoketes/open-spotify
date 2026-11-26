import { Schema } from "effect"

export const SpotifyFailureLog = Schema.Struct({
  url: Schema.String,
  status: Schema.NullOr(Schema.Number),
  spotifyMessage: Schema.NullOr(Schema.String),
  spotifyReason: Schema.NullOr(Schema.String),
  cause: Schema.String,
})

export type SpotifyFailureLog = typeof SpotifyFailureLog.Type

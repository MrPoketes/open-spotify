import { Schema } from "effect"

export const Episode = Schema.Struct({
  type: Schema.Literal("episode"),
  id: Schema.String,
  name: Schema.String,
  uri: Schema.String,
  durationMs: Schema.Number,
}).pipe(Schema.encodeKeys({ durationMs: "duration_ms" }))

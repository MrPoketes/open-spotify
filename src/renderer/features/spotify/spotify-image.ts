import { Schema } from "effect"

export const Image = Schema.Struct({
  url: Schema.String,
  width: Schema.NullOr(Schema.Number),
  height: Schema.NullOr(Schema.Number),
})

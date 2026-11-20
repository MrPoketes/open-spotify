import { Schema } from "effect"

export const Device = Schema.Struct({
  // Spotify does not guarantee an id, and a device without one cannot be
  // chosen for playback.
  id: Schema.NullOr(Schema.String),
  name: Schema.String,
  type: Schema.String,
  isActive: Schema.Boolean,
  // A restricted device accepts no commands from the Web API.
  isRestricted: Schema.Boolean,
}).pipe(Schema.encodeKeys({ isActive: "is_active", isRestricted: "is_restricted" }))

export type Device = typeof Device.Type

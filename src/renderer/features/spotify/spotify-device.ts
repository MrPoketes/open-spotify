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
  volumePercent: Schema.NullOr(Schema.Number),
  supportsVolume: Schema.Boolean,
}).pipe(
  Schema.encodeKeys({
    isActive: "is_active",
    isRestricted: "is_restricted",
    volumePercent: "volume_percent",
    supportsVolume: "supports_volume",
  }),
)

export type Device = typeof Device.Type

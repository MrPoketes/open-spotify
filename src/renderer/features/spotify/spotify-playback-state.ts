import { Schema } from "effect"
import { Device } from "./spotify-device"
import { Episode } from "./spotify-episode"
import { Track } from "./spotify-track"

export const PlaybackState = Schema.Struct({
  device: Device,
  // Null while an ad plays or when Spotify cannot say what is playing.
  item: Schema.NullOr(Schema.Union([Track, Episode])),
})

export type PlaybackState = typeof PlaybackState.Type

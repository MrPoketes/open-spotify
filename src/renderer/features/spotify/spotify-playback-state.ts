import { Schema } from "effect"
import { Device } from "./spotify-device"
import { PlayableItem } from "./spotify-playable-item"

export const RepeatMode = Schema.Literals(["off", "context", "track"])

export type RepeatMode = typeof RepeatMode.Type

const disallowed = Schema.optionalKey(Schema.Boolean)

// Spotify leaves out an action that is allowed, and only lists the ones the
// current device or context does not allow, such as skipping back at the
// start of a context.
const DisallowedActions = Schema.Struct({
  skippingNext: disallowed,
  skippingPrev: disallowed,
  togglingShuffle: disallowed,
  togglingRepeatContext: disallowed,
  togglingRepeatTrack: disallowed,
  seeking: disallowed,
}).pipe(
  Schema.encodeKeys({
    skippingNext: "skipping_next",
    skippingPrev: "skipping_prev",
    togglingShuffle: "toggling_shuffle",
    togglingRepeatContext: "toggling_repeat_context",
    togglingRepeatTrack: "toggling_repeat_track",
  }),
)

export const PlaybackState = Schema.Struct({
  device: Device,
  isPlaying: Schema.Boolean,
  shuffle: Schema.Boolean,
  repeat: RepeatMode,
  actions: Schema.Struct({ disallows: Schema.optionalKey(DisallowedActions) }),
  // Null when what plays is not a context, such as a list of tracks.
  context: Schema.NullOr(Schema.Struct({ uri: Schema.String })),
  // Null while an ad plays or when Spotify cannot say what is playing.
  item: Schema.NullOr(PlayableItem),
  // How far into the item playback was when Spotify answered. Spotify can
  // leave it null.
  progressMs: Schema.NullOr(Schema.Number),
}).pipe(
  Schema.encodeKeys({
    isPlaying: "is_playing",
    shuffle: "shuffle_state",
    repeat: "repeat_state",
    progressMs: "progress_ms",
  }),
)

export type PlaybackState = typeof PlaybackState.Type

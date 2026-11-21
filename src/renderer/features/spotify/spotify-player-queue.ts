import { Schema } from "effect"
import { PlayableItem } from "./spotify-playable-item"

export const PlayerQueue = Schema.Struct({
  currentlyPlaying: Schema.NullOr(PlayableItem),
  upNext: Schema.Array(PlayableItem),
}).pipe(Schema.encodeKeys({ currentlyPlaying: "currently_playing", upNext: "queue" }))

export type PlayerQueue = typeof PlayerQueue.Type

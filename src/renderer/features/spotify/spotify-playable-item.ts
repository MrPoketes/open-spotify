import { Schema } from "effect"
import { Episode } from "./spotify-episode"
import { Track } from "./spotify-track"

export const PlayableItem = Schema.Union([Track, Episode])

export type PlayableItem = typeof PlayableItem.Type

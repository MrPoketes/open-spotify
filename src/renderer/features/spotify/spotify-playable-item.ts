import { Schema } from "effect"
import { PlayableEpisode } from "./spotify-episode"
import { Track } from "./spotify-track"

export const PlayableItem = Schema.Union([Track, PlayableEpisode])

export type PlayableItem = typeof PlayableItem.Type

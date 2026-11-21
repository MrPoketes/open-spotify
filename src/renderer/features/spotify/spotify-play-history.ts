import { Schema } from "effect"
import { Track } from "./spotify-track"

export const PlayHistory = Schema.Struct({
  track: Track,
  // What the track was played from, such as an album, a playlist, an artist,
  // or the user's Liked Songs. Null when it was played on its own.
  context: Schema.NullOr(Schema.Struct({ uri: Schema.String })),
})

export type PlayHistory = typeof PlayHistory.Type

// Spotify pages play history by time cursors, and the first page is all the
// home page needs.
export const RecentlyPlayedPage = Schema.Struct({ items: Schema.Array(PlayHistory) })

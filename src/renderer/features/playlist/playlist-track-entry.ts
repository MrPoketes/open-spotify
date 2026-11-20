import type { PlaylistItem } from "../spotify/spotify-playlist"
import { trackEntry } from "../track-list/track-entry"
import type { TrackListEntry } from "../track-list/track-row"

export function playlistTrackEntry(
  { addedAt, item }: PlaylistItem,
  position: number,
): TrackListEntry {
  if (item === null) {
    return {
      number: position,
      title: "Unavailable track",
      artists: "",
      album: null,
      artwork: [],
      addedAt,
      durationMs: null,
    }
  }
  if (item.type === "episode") {
    return {
      number: position,
      title: item.name,
      artists: "",
      album: null,
      artwork: [],
      addedAt,
      durationMs: item.durationMs,
    }
  }
  return trackEntry(item, addedAt, position)
}

import type { PlaylistItem } from "../spotify/spotify-playlist"
import type { TrackListEntry } from "../track-list/track-row"

export function playlistTrackEntry({ addedAt, item }: PlaylistItem): TrackListEntry {
  if (item === null) {
    return {
      title: "Unavailable track",
      artists: "",
      album: "",
      artwork: [],
      addedAt,
      durationMs: null,
    }
  }
  if (item.type === "episode") {
    return {
      title: item.name,
      artists: "",
      album: "",
      artwork: [],
      addedAt,
      durationMs: item.durationMs,
    }
  }
  return {
    title: item.name,
    artists: item.artists.map(({ name }) => name).join(", "),
    album: item.album.name,
    artwork: item.album.images,
    addedAt,
    durationMs: item.durationMs,
  }
}

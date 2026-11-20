import type { Track } from "../spotify/spotify-track"
import type { TrackListEntry } from "./track-row"

export function trackEntry(track: Track, addedAt: Date | null, position: number): TrackListEntry {
  return {
    number: position,
    title: track.name,
    artists: track.artists.map(({ name }) => name).join(", "),
    album: { id: track.album.id, name: track.album.name },
    artwork: track.album.images,
    addedAt,
    durationMs: track.durationMs,
  }
}

import { formatArtistNames } from "../spotify/format-artist-names"
import type { Track } from "../spotify/spotify-track"
import type { TrackListEntry } from "./track-row"

export function trackEntry(track: Track, addedAt: Date | null): TrackListEntry {
  return {
    title: track.name,
    artists: formatArtistNames(track.artists),
    album: { id: track.album.id, name: track.album.name },
    artwork: track.album.images,
    addedAt,
    durationMs: track.durationMs,
  }
}

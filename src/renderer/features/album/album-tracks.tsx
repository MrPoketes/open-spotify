import type { AlbumTrack } from "../spotify/spotify-album"
import { TrackList } from "../track-list/track-list"
import type { TrackListEntry } from "../track-list/track-row"

interface Disc {
  readonly discNumber: number
  readonly entries: ReadonlyArray<TrackListEntry>
}

const albumTrackEntry = (track: AlbumTrack): TrackListEntry => ({
  trackId: track.id,
  title: track.name,
  artists: track.artists,
  album: null,
  artwork: [],
  addedAt: null,
  durationMs: track.durationMs,
})

// Spotify lists an album's tracks in order, disc by disc.
const discsOf = (tracks: ReadonlyArray<AlbumTrack>) => {
  const entriesByDisc = new Map<number, Array<TrackListEntry>>()
  for (const track of tracks) {
    const discEntries = entriesByDisc.get(track.discNumber) ?? []
    discEntries.push(albumTrackEntry(track))
    entriesByDisc.set(track.discNumber, discEntries)
  }
  return Array.from(entriesByDisc, ([discNumber, entries]): Disc => ({ discNumber, entries }))
}

interface AlbumTracksProps {
  readonly tracks: ReadonlyArray<AlbumTrack>
  readonly highlightedTrackId: string | undefined
}

export function AlbumTracks({ tracks, highlightedTrackId }: AlbumTracksProps) {
  const discs = discsOf(tracks)
  const hasDiscHeadings = discs.length > 1
  return discs.map(({ discNumber, entries }) => {
    const label = hasDiscHeadings ? `Disc ${discNumber}` : "Tracks"
    const highlightedIndex = entries.findIndex(({ trackId }) => trackId === highlightedTrackId)
    return (
      <div key={discNumber} className="flex flex-col gap-4">
        {hasDiscHeadings ? <h2 className="font-display text-xl font-bold">{label}</h2> : null}
        <TrackList
          label={label}
          layout="album"
          trackCount={entries.length}
          trackAt={(index) => entries[index]}
          highlightedIndex={highlightedIndex === -1 ? undefined : highlightedIndex}
        />
      </div>
    )
  })
}

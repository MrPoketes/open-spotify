import type { AlbumTrack } from "../spotify/spotify-album"
import type { Image } from "../spotify/spotify-image"
import { TrackList } from "../track-list/track-list"
import type { TrackListEntry } from "../track-list/track-row"

interface Disc {
  readonly discNumber: number
  readonly entries: ReadonlyArray<TrackListEntry>
  // Where the disc's first track sits in the whole album.
  readonly firstPosition: number
}

// The rows leave the cover out, but a track added to a folder keeps it.
const albumTrackEntry = (track: AlbumTrack, cover: ReadonlyArray<Image>): TrackListEntry => ({
  trackId: track.id,
  title: track.name,
  artists: track.artists,
  album: null,
  artwork: cover,
  addedAt: null,
  durationMs: track.durationMs,
})

// Spotify lists an album's tracks in order, disc by disc.
const discsOf = (tracks: ReadonlyArray<AlbumTrack>, cover: ReadonlyArray<Image>) => {
  const entriesByDisc = new Map<number, Array<TrackListEntry>>()
  for (const track of tracks) {
    const discEntries = entriesByDisc.get(track.discNumber) ?? []
    discEntries.push(albumTrackEntry(track, cover))
    entriesByDisc.set(track.discNumber, discEntries)
  }
  let firstPosition = 0
  return Array.from(entriesByDisc, ([discNumber, entries]): Disc => {
    const disc = { discNumber, entries, firstPosition }
    firstPosition += entries.length
    return disc
  })
}

interface AlbumTracksProps {
  readonly album: { readonly uri: string; readonly images: ReadonlyArray<Image> }
  readonly tracks: ReadonlyArray<AlbumTrack>
  readonly highlightedTrackId: string | undefined
}

export function AlbumTracks({ album, tracks, highlightedTrackId }: AlbumTracksProps) {
  const discs = discsOf(tracks, album.images)
  const hasDiscHeadings = discs.length > 1
  return discs.map(({ discNumber, entries, firstPosition }) => {
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
          playbackStartAt={(index) => ({
            contextUri: album.uri,
            offset: { position: firstPosition + index },
          })}
          highlightedIndex={highlightedIndex === -1 ? undefined : highlightedIndex}
        />
      </div>
    )
  })
}

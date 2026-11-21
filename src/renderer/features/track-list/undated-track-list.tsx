import type { Track } from "../spotify/spotify-track"
import { trackEntry } from "./track-entry"
import { TrackList } from "./track-list"

interface UndatedTrackListProps {
  readonly label: string
  readonly tracks: ReadonlyArray<Track>
}

export function UndatedTrackList({ label, tracks }: UndatedTrackListProps) {
  const trackAt = (index: number) => {
    const track = tracks[index]
    return track === undefined ? undefined : trackEntry(track, null)
  }
  return <TrackList label={label} layout="undated" trackCount={tracks.length} trackAt={trackAt} />
}

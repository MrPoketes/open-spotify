import type { Ref } from "react"
import type { RowFocusHandle } from "../../ui/use-roving-focus"
import type { Track } from "../spotify/spotify-track"
import { trackEntry } from "./track-entry"
import { TrackList } from "./track-list"

interface UndatedTrackListProps {
  readonly label: string
  readonly tracks: ReadonlyArray<Track>
  readonly rowFocusRef?: Ref<RowFocusHandle>
}

export function UndatedTrackList({ label, tracks, rowFocusRef }: UndatedTrackListProps) {
  const trackAt = (index: number) => {
    const track = tracks[index]
    return track === undefined ? undefined : trackEntry(track, null)
  }
  // These tracks share no context, so they play as a list.
  const uris = tracks.map(({ uri }) => uri)
  return (
    <TrackList
      label={label}
      layout="undated"
      trackCount={tracks.length}
      trackAt={trackAt}
      playbackStartAt={(index) => ({ uris, offset: { position: index } })}
      rowFocusRef={rowFocusRef}
    />
  )
}

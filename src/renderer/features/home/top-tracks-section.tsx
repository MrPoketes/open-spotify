import type { Track } from "../spotify/spotify-track"
import { UndatedTrackList } from "../track-list/undated-track-list"
import { TopItemsSection } from "./top-items-section"
import type { TopItems } from "./use-top-items"

export function TopTracksSection({ topTracks }: { readonly topTracks: TopItems<Track> }) {
  return (
    <TopItemsSection
      kind="tracks"
      topItems={topTracks}
      renderItems={(tracks, title) => <UndatedTrackList label={title} tracks={tracks} />}
    />
  )
}

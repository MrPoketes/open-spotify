import type { Track } from "../spotify/spotify-track"
import { HomeSection } from "./home-section"
import { LoadedContent } from "./loaded-content"
import { UndatedTrackList } from "../track-list/undated-track-list"
import { TimeRangeSwitch } from "./time-range-switch"
import { type TopItems, hasNoTopItems } from "./use-top-items"

const title = "Your top tracks"

export function TopTracksSection({ topTracks }: { readonly topTracks: TopItems<Track> }) {
  if (hasNoTopItems(topTracks)) {
    return null
  }
  const timeRangeSwitch = (
    <TimeRangeSwitch
      legend="Time range for your top tracks"
      timeRange={topTracks.timeRange}
      onChange={topTracks.showTimeRange}
    />
  )
  return (
    <HomeSection title={title} controls={timeRangeSwitch}>
      <LoadedContent
        state={topTracks.state}
        loadingMessage="Loading your top tracks…"
        failureMessage="Your top tracks didn't load."
        onRetry={topTracks.retry}
      >
        {(tracks) =>
          tracks.length === 0 ? (
            <p className="text-muted">No top tracks for this time range yet.</p>
          ) : (
            <UndatedTrackList label={title} tracks={tracks} />
          )
        }
      </LoadedContent>
    </HomeSection>
  )
}

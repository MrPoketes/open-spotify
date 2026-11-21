import type { LoadState } from "../../lib/use-load"
import type { SpotifyApiError } from "../spotify/spotify-api"
import type { PlayHistory } from "../spotify/spotify-play-history"
import { HomeSection } from "./home-section"
import { LoadedContent } from "./loaded-content"
import { UndatedTrackList } from "../track-list/undated-track-list"

const recentTrackCount = 10

// A track on repeat would otherwise fill the list on its own.
const withoutRepeats = (history: ReadonlyArray<PlayHistory>) =>
  history.filter(({ track }, index) => track.uri !== history[index - 1]?.track.uri)

interface RecentlyPlayedSectionProps {
  readonly recentlyPlayed: LoadState<ReadonlyArray<PlayHistory>, SpotifyApiError>
  readonly onRetry: () => void
}

export function RecentlyPlayedSection({ recentlyPlayed, onRetry }: RecentlyPlayedSectionProps) {
  if (recentlyPlayed.status === "loaded" && recentlyPlayed.value.length === 0) {
    return null
  }
  return (
    <HomeSection title="Recently played">
      <LoadedContent
        state={recentlyPlayed}
        loadingMessage="Loading recently played tracks…"
        failureMessage="Recently played tracks didn't load."
        onRetry={onRetry}
      >
        {(history) => (
          <UndatedTrackList
            label="Recently played"
            tracks={withoutRepeats(history)
              .slice(0, recentTrackCount)
              .map(({ track }) => track)}
          />
        )}
      </LoadedContent>
    </HomeSection>
  )
}

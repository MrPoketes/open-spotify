import { CardGrid } from "../../ui/card-grid"
import type { Artist } from "../spotify/spotify-artist"
import { artistCard } from "../artist/artist-card"
import { useWithFolderMenu } from "../folders/use-with-folder-menu"
import { HomeSection } from "./home-section"
import { LoadedContent } from "./loaded-content"
import { TimeRangeSwitch } from "./time-range-switch"
import { type TopItems, hasNoTopItems } from "./use-top-items"

const title = "Your top artists"

export function TopArtistsSection({ topArtists }: { readonly topArtists: TopItems<Artist> }) {
  const withFolderMenu = useWithFolderMenu()
  if (hasNoTopItems(topArtists)) {
    return null
  }
  const timeRangeSwitch = (
    <TimeRangeSwitch
      legend="Time range for your top artists"
      timeRange={topArtists.timeRange}
      onChange={topArtists.showTimeRange}
    />
  )
  return (
    <HomeSection title={title} controls={timeRangeSwitch}>
      <LoadedContent
        state={topArtists.state}
        loadingMessage="Loading your top artists…"
        failureMessage="Your top artists didn't load."
        onRetry={topArtists.retry}
      >
        {(artists) =>
          artists.length === 0 ? (
            <p className="text-muted">No top artists for this time range yet.</p>
          ) : (
            <CardGrid
              label={title}
              cards={artists.map((artist) => withFolderMenu(artistCard(artist), artist.uri))}
            />
          )
        }
      </LoadedContent>
    </HomeSection>
  )
}

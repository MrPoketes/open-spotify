import { Effect } from "effect"
import { useLoad, type LoadState } from "../../lib/use-load"
import { ArtworkWash } from "../../ui/artwork-wash"
import { pageTitleClassName } from "../../ui/page-title-class-name"
import { SpotifyApi, type SpotifyApiError } from "../spotify/spotify-api"
import type { TimeRange } from "../spotify/spotify-listening-history"
import type { PlayHistory } from "../spotify/spotify-play-history"
import type { CurrentUser } from "../spotify/spotify-user"
import { JumpBackInSection } from "./jump-back-in-section"
import { RecentlyPlayedSection } from "./recently-played-section"
import { TopArtistsSection } from "./top-artists-section"
import { TopTracksSection } from "./top-tracks-section"
import { hasNoTopItems, useTopItems } from "./use-top-items"

const loadCurrentUser = Effect.gen(function* () {
  const spotify = yield* SpotifyApi
  return yield* spotify.getCurrentUser
})

const loadRecentlyPlayed = Effect.gen(function* () {
  const spotify = yield* SpotifyApi
  return yield* spotify.getRecentlyPlayed
})

const loadTopArtists = Effect.fn("loadTopArtists")(function* (timeRange: TimeRange) {
  const spotify = yield* SpotifyApi
  return yield* spotify.getTopArtists(timeRange)
})

const loadTopTracks = Effect.fn("loadTopTracks")(function* (timeRange: TimeRange) {
  const spotify = yield* SpotifyApi
  return yield* spotify.getTopTracks(timeRange)
})

// The greeting does without the name until it loads, or if it fails to.
const greeting = (user: LoadState<CurrentUser, SpotifyApiError>) =>
  user.status === "loaded" && user.value.displayName !== null
    ? `Hello, ${user.value.displayName}`
    : "Hello"

// The cover of what played last colors the top of the page.
const lastPlayedArtwork = (
  recentlyPlayed: LoadState<ReadonlyArray<PlayHistory>, SpotifyApiError>,
) => (recentlyPlayed.status === "loaded" ? (recentlyPlayed.value[0]?.track.album.images ?? []) : [])

// Each section loads, fails, and retries on its own, and hides itself when it
// has nothing to show.
export function HomePage() {
  const user = useLoad(loadCurrentUser, "The user's profile failed to load")
  const recentlyPlayed = useLoad(loadRecentlyPlayed, "Recently played tracks failed to load")
  const topArtists = useTopItems(loadTopArtists, "Top artists failed to load")
  const topTracks = useTopItems(loadTopTracks, "Top tracks failed to load")
  const isNewAccount =
    recentlyPlayed.state.status === "loaded" &&
    recentlyPlayed.state.value.length === 0 &&
    hasNoTopItems(topArtists) &&
    hasNoTopItems(topTracks)

  return (
    <div className="@container relative flex flex-col gap-12">
      <ArtworkWash placement="page" sources={lastPlayedArtwork(recentlyPlayed.state)} />
      <div className="flex flex-col gap-3 pt-6">
        <h1 className={pageTitleClassName}>{greeting(user.state)}</h1>
        {isNewAccount ? (
          <p className="max-w-prose text-muted">
            Welcome to Open Spotify. Play some music in Spotify, and what you listen to will show up
            here.
          </p>
        ) : null}
      </div>
      <JumpBackInSection recentlyPlayed={recentlyPlayed.state} />
      <div className="grid gap-12 @5xl:grid-cols-2">
        <RecentlyPlayedSection
          recentlyPlayed={recentlyPlayed.state}
          onRetry={recentlyPlayed.retry}
        />
        <TopTracksSection topTracks={topTracks} />
      </div>
      <TopArtistsSection topArtists={topArtists} />
    </div>
  )
}

import { Effect } from "effect"
import { type LoadState, useLoad } from "../../lib/use-load"
import { SpotifyApi, type SpotifyApiError } from "../spotify/spotify-api"
import type { TimeRange } from "../spotify/spotify-listening-history"
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
    <div className="flex flex-col gap-8">
      <h1 className="font-display text-3xl font-bold">{greeting(user.state)}</h1>
      {isNewAccount ? (
        <p className="text-muted">
          Welcome to Open Spotify. Play some music in Spotify, and what you listen to will show up
          here.
        </p>
      ) : null}
      <JumpBackInSection recentlyPlayed={recentlyPlayed.state} onRetry={recentlyPlayed.retry} />
      <RecentlyPlayedSection recentlyPlayed={recentlyPlayed.state} onRetry={recentlyPlayed.retry} />
      <TopArtistsSection topArtists={topArtists} />
      <TopTracksSection topTracks={topTracks} />
    </div>
  )
}

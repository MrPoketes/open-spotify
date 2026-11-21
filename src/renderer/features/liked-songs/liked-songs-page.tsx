import { Effect } from "effect"
import { useLoad } from "../../lib/use-load"
import { LoadingMessage } from "../../ui/loading-message"
import { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import { LikedSongsHeader } from "./liked-songs-header"
import { LikedSongsTracks } from "./liked-songs-tracks"

// The first page carries the total, so the list has its full height at once.
const loadFirstPage = Effect.gen(function* () {
  const spotify = yield* SpotifyApi
  return yield* spotify.getLikedSongsPage(0)
})

export function LikedSongsPage() {
  const { state, retry } = useLoad(loadFirstPage, "Liked Songs failed to load")

  if (state.status === "loading") {
    return <LoadingMessage>Loading Liked Songs…</LoadingMessage>
  }
  if (state.status === "failed") {
    return (
      <SpotifyLoadFailure error={state.error} message="Liked Songs didn't load." onRetry={retry} />
    )
  }
  if (state.value.total === 0) {
    return (
      <div className="flex flex-col gap-8">
        <LikedSongsHeader songCount={0} totalDuration={null} />
        <p className="text-muted">Songs you like will appear here.</p>
      </div>
    )
  }
  return <LikedSongsTracks firstPage={state.value} />
}

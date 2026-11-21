import { Navigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { useLoad } from "../../lib/use-load"
import { isUnknownSpotifyId } from "../spotify/is-unknown-spotify-id"
import { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"

const loadTrack = Effect.fn("loadTrack")(function* (trackId: string) {
  const spotify = yield* SpotifyApi
  return yield* spotify.getTrack(trackId)
})

function TrackNotFound() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold">Track not found</h1>
      <p className="text-muted">Spotify has no track at this address. It may have been removed.</p>
    </section>
  )
}

// A track has no page of its own, so it opens on its album page, highlighted.
// This page finds the album for links that know only the track, such as a
// folder entry.
export function TrackPage({ trackId }: { readonly trackId: string }) {
  const { state, retry } = useLoad(loadTrack(trackId), "The track failed to load")

  if (state.status === "loading") {
    return <output className="text-sm text-muted">Loading track…</output>
  }
  if (state.status === "failed" && isUnknownSpotifyId(state.error)) {
    return <TrackNotFound />
  }
  if (state.status === "failed") {
    return (
      <SpotifyLoadFailure error={state.error} message="This track didn't load." onRetry={retry} />
    )
  }
  // Only local files have no album id, and they have no Spotify track id to
  // link to either.
  const albumId = state.value.album.id
  if (albumId === null) {
    return <TrackNotFound />
  }
  return <Navigate to="/album/$albumId" params={{ albumId }} search={{ track: trackId }} replace />
}

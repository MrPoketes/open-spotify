import { Effect, Stream } from "effect"
import { useLoad } from "../../lib/use-load"
import { isUnknownSpotifyId } from "../spotify/is-unknown-spotify-id"
import { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import { AlbumHeader } from "./album-header"
import { AlbumTracks } from "./album-tracks"

// Spotify does not report an album's length, and grouping tracks by disc
// needs all of them, so the tracks after the embedded page load up front.
const loadAlbum = Effect.fn("loadAlbum")(function* (albumId: string) {
  const spotify = yield* SpotifyApi
  const album = yield* spotify.getAlbum(albumId)
  const laterTracks =
    album.tracks.next === null
      ? []
      : yield* Stream.runCollect(spotify.albumTracks(albumId, album.tracks.items.length))
  return { album, tracks: [...album.tracks.items, ...laterTracks] }
})

function AlbumNotFound() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold">Album not found</h1>
      <p className="text-muted">Spotify has no album at this address. It may have been removed.</p>
    </section>
  )
}

interface AlbumPageProps {
  readonly albumId: string
  // A track to highlight, for links that open a track on its album.
  readonly highlightedTrackId?: string | undefined
}

export function AlbumPage({ albumId, highlightedTrackId }: AlbumPageProps) {
  const { state, retry } = useLoad(loadAlbum(albumId), "The album failed to load")

  if (state.status === "loading") {
    return <output className="text-sm text-muted">Loading album…</output>
  }
  if (state.status === "failed" && isUnknownSpotifyId(state.error)) {
    return <AlbumNotFound />
  }
  if (state.status === "failed") {
    return (
      <SpotifyLoadFailure error={state.error} message="This album didn't load." onRetry={retry} />
    )
  }
  const { album, tracks } = state.value
  const totalDurationMs = tracks.reduce((total, track) => total + track.durationMs, 0)
  return (
    <div className="flex flex-col gap-8">
      <AlbumHeader album={album} totalDurationMs={totalDurationMs} />
      <AlbumTracks album={album} tracks={tracks} highlightedTrackId={highlightedTrackId} />
    </div>
  )
}

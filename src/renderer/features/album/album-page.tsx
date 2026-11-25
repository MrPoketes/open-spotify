import { Effect, Stream } from "effect"
import { LoadedSpotifyItem } from "../spotify/loaded-spotify-item"
import { SpotifyApi } from "../spotify/spotify-api"
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

interface AlbumPageProps {
  readonly albumId: string
  // A track to highlight, for links that open a track on its album.
  readonly highlightedTrackId?: string | undefined
}

export function AlbumPage({ albumId, highlightedTrackId }: AlbumPageProps) {
  return (
    <LoadedSpotifyItem kind="album" load={loadAlbum(albumId)}>
      {({ album, tracks }) => {
        const totalDurationMs = tracks.reduce((total, track) => total + track.durationMs, 0)
        return (
          <div className="flex flex-col gap-8">
            <AlbumHeader album={album} totalDurationMs={totalDurationMs} />
            <AlbumTracks album={album} tracks={tracks} highlightedTrackId={highlightedTrackId} />
          </div>
        )
      }}
    </LoadedSpotifyItem>
  )
}

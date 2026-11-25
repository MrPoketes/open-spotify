import { Navigate } from "@tanstack/react-router"
import { Effect } from "effect"
import { LoadedSpotifyItem } from "../spotify/loaded-spotify-item"
import { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyItemNotFound } from "../spotify/spotify-item-not-found"

const loadTrack = Effect.fn("loadTrack")(function* (trackId: string) {
  const spotify = yield* SpotifyApi
  return yield* spotify.getTrack(trackId)
})

// A track has no page of its own, so it opens on its album page, highlighted.
// This page finds the album for links that know only the track, such as a
// folder entry.
export function TrackPage({ trackId }: { readonly trackId: string }) {
  return (
    <LoadedSpotifyItem kind="track" load={loadTrack(trackId)}>
      {(track) => {
        // Only local files have no album id, and they have no Spotify track id to
        // link to either.
        const albumId = track.album.id
        if (albumId === null) {
          return <SpotifyItemNotFound kind="track" />
        }
        return (
          <Navigate to="/album/$albumId" params={{ albumId }} search={{ track: trackId }} replace />
        )
      }}
    </LoadedSpotifyItem>
  )
}

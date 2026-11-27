import { Effect } from "effect"
import { useLoad } from "../../lib/use-load"
import { PageHeaderLoading } from "../../ui/page-header"
import { SpotifyApi } from "../spotify/spotify-api"
import { SpotifyLoadFailure } from "../spotify/spotify-load-failure"
import type { Playlist } from "../spotify/spotify-playlist"
import { PlaylistHeader } from "./playlist-header"
import { PlaylistTracks } from "./playlist-tracks"

const loadPlaylist = Effect.fn("loadPlaylist")(function* (playlistId: string) {
  const spotify = yield* SpotifyApi
  return yield* spotify.getPlaylist(playlistId)
})

// Spotify withholds the items of playlists the user only follows, so the
// official app is the only place to see them. The playlist still plays.
function ItemsWithheld({ playlistId }: { readonly playlistId: string }) {
  return (
    <section className="flex flex-col items-start gap-2">
      <p>Spotify only shares the tracks of playlists you own or collaborate on.</p>
      <a
        href={`https://open.spotify.com/playlist/${encodeURIComponent(playlistId)}`}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-semibold text-accent underline"
      >
        Open in Spotify
      </a>
    </section>
  )
}

function PlaylistContent({ playlist }: { readonly playlist: Playlist }) {
  if (playlist.items === undefined || playlist.items === null) {
    return (
      <div className="flex flex-col gap-8">
        <PlaylistHeader playlist={playlist} totalDuration={null} />
        <ItemsWithheld playlistId={playlist.id} />
      </div>
    )
  }
  if (playlist.items.total === 0) {
    return (
      <div className="flex flex-col gap-8">
        <PlaylistHeader playlist={playlist} totalDuration={null} />
        <p className="text-muted">
          This playlist is empty. Tracks added to it in Spotify show here.
        </p>
      </div>
    )
  }
  return <PlaylistTracks playlist={playlist} firstPage={playlist.items} />
}

export function PlaylistPage({ playlistId }: { readonly playlistId: string }) {
  const { state, retry } = useLoad(loadPlaylist(playlistId), "The playlist failed to load")

  if (state.status === "loading") {
    return <PageHeaderLoading message="Loading playlist…" />
  }
  if (state.status === "failed") {
    return (
      <SpotifyLoadFailure
        error={state.error}
        message="This playlist didn't load."
        onRetry={retry}
      />
    )
  }
  return <PlaylistContent playlist={state.value} />
}

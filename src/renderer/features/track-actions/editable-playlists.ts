import { Effect } from "effect"
import { createContext, use } from "react"
import type { RetryableLoad } from "../../lib/use-load"
import type { LibraryPlaylistsLoad } from "../library/library-playlists"
import { SpotifyApi, type SpotifyApiError } from "../spotify/spotify-api"
import type { SimplifiedPlaylist } from "../spotify/spotify-playlist"

// Spotify lets a user add tracks only to the playlists they own or
// collaborate on.
export const loadEditablePlaylists = Effect.fn("loadEditablePlaylists")(function* (
  loadPlaylists: LibraryPlaylistsLoad,
) {
  const spotify = yield* SpotifyApi
  const [currentUser, playlists] = yield* Effect.all([spotify.getCurrentUser, loadPlaylists], {
    concurrency: "unbounded",
  })
  return playlists.filter(
    (playlist) => playlist.owner.id === currentUser.id || playlist.collaborative,
  )
})

export type EditablePlaylists = RetryableLoad<ReadonlyArray<SimplifiedPlaylist>, SpotifyApiError>

// The app shell loads the playlists. A track list rendered without it, as in
// a test of a single page, sees them loading forever.
export const EditablePlaylistsContext = createContext<EditablePlaylists>({
  state: { status: "loading" },
  retry: () => undefined,
})

export const useEditablePlaylists = () => use(EditablePlaylistsContext)

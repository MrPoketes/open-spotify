import { Duration, Effect, Exit, Stream } from "effect"
import { createContext, use } from "react"
import { SpotifyApi, type SpotifyApiError } from "../spotify/spotify-api"
import type { SimplifiedPlaylist } from "../spotify/spotify-playlist"

export type LibraryPlaylistsLoad = Effect.Effect<
  ReadonlyArray<SimplifiedPlaylist>,
  SpotifyApiError,
  SpotifyApi
>

const loadLibraryPlaylists: LibraryPlaylistsLoad = Effect.gen(function* () {
  const spotify = yield* SpotifyApi
  return yield* Stream.runCollect(spotify.currentUserPlaylists)
})

// Makes a load that every reader shares. A failed load is not kept, so a
// retry from any reader loads again.
export const makeSharedLibraryPlaylistsLoad = loadLibraryPlaylists.pipe(
  Effect.cachedWithTTL((exit) => (Exit.isSuccess(exit) ? Duration.infinity : Duration.zero)),
)

// The app shell provides a shared load. Without it, as in a test of a single
// page, each reader loads on its own.
export const LibraryPlaylistsContext = createContext<LibraryPlaylistsLoad>(loadLibraryPlaylists)

export const useLibraryPlaylists = () => use(LibraryPlaylistsContext)

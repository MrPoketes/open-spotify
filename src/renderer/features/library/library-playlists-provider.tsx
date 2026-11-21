import { type ReactNode, use, useState } from "react"
import { RendererRuntimeContext } from "../../lib/renderer-runtime"
import { LibraryPlaylistsContext, makeSharedLibraryPlaylistsLoad } from "./library-playlists"

// The sidebar and the track menu both need every playlist in the library. A
// user can have hundreds, each page of 50 is a request, and every user of a
// development-mode Client ID shares one rate limit, so they share one load.
// It lasts as long as the app shell, which mounts again after every login,
// so one user never sees the playlists of the user before them.
export function LibraryPlaylistsProvider({ children }: { readonly children: ReactNode }) {
  const runtime = use(RendererRuntimeContext)
  // Making the shared load sends no request; the first reader's load does.
  const [libraryPlaylists] = useState(() => runtime.runSync(makeSharedLibraryPlaylistsLoad))
  return <LibraryPlaylistsContext value={libraryPlaylists}>{children}</LibraryPlaylistsContext>
}

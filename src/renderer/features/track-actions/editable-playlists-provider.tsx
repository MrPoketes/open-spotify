import type { ReactNode } from "react"
import { useLoad } from "../../lib/use-load"
import { useLibraryPlaylists } from "../library/library-playlists"
import { EditablePlaylistsContext, loadEditablePlaylists } from "./editable-playlists"

// Loads the playlists once for every track menu, instead of once per row.
export function EditablePlaylistsProvider({ children }: { readonly children: ReactNode }) {
  const editablePlaylists = useLoad(
    loadEditablePlaylists(useLibraryPlaylists()),
    "The editable playlists failed to load",
  )
  return <EditablePlaylistsContext value={editablePlaylists}>{children}</EditablePlaylistsContext>
}

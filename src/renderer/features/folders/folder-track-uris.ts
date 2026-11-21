import type { Folder } from "../../../shared/folders"
import { parseSpotifyUri } from "./folder-entry-description"

// Spotify plays a list of tracks but has no way to queue a playlist, album,
// artist, or show after them, so only the folder's own tracks play. Nested
// folders are not expanded either: the folder plays what it shows.
export const folderTrackUris = (folder: Folder) =>
  folder.entries.flatMap((entry) =>
    entry._tag === "SpotifyItem" && parseSpotifyUri(entry.uri).kind === "track" ? [entry.uri] : [],
  )

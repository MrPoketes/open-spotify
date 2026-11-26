import { Folder as FolderIcon, type LucideIcon } from "lucide-react"
import type { FolderEntry } from "../../../shared/folders"
import type { ArtworkSource } from "../../ui/artwork"
import { formatCount } from "../../ui/format-count"
import { spotifyItemKinds, type SpotifyItemKind } from "../spotify/spotify-item-kinds"

type FolderEntryPage =
  | { readonly to: "/folder/$folderId"; readonly params: { readonly folderId: string } }
  | { readonly to: "/playlist/$playlistId"; readonly params: { readonly playlistId: string } }
  | { readonly to: "/artist/$artistId"; readonly params: { readonly artistId: string } }
  | { readonly to: "/album/$albumId"; readonly params: { readonly albumId: string } }
  | { readonly to: "/show/$showId"; readonly params: { readonly showId: string } }
  | { readonly to: "/track/$trackId"; readonly params: { readonly trackId: string } }

const spotifyItemPages: Record<SpotifyItemKind, (id: string) => FolderEntryPage> = {
  playlist: (playlistId) => ({ to: "/playlist/$playlistId", params: { playlistId } }),
  artist: (artistId) => ({ to: "/artist/$artistId", params: { artistId } }),
  album: (albumId) => ({ to: "/album/$albumId", params: { albumId } }),
  show: (showId) => ({ to: "/show/$showId", params: { showId } }),
  track: (trackId) => ({ to: "/track/$trackId", params: { trackId } }),
}

export const parseSpotifyUri = (uri: string) => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the folder tree's Schema only accepts URIs shaped spotify:<kind>:<id>, so the parts always have these types
  const [, kind, id] = uri.split(":") as [string, SpotifyItemKind, string]
  return { kind, id }
}

interface FolderEntryDescription {
  readonly key: string
  readonly name: string
  readonly details: string
  readonly artwork: ReadonlyArray<ArtworkSource>
  readonly icon: LucideIcon
  readonly isArtist: boolean
  readonly page: FolderEntryPage
}

export const describeFolderEntry = (entry: FolderEntry): FolderEntryDescription => {
  if (entry._tag === "Folder") {
    return {
      key: entry.id,
      name: entry.name,
      details: `Folder · ${formatCount(entry.entries.length, "item", "items")}`,
      artwork: [],
      icon: FolderIcon,
      isArtist: false,
      page: { to: "/folder/$folderId", params: { folderId: entry.id } },
    }
  }
  const { kind, id } = parseSpotifyUri(entry.uri)
  return {
    key: entry.uri,
    name: entry.name,
    details: spotifyItemKinds[kind].label,
    // The folder tree caches one image per item, without its width.
    artwork: entry.imageUrl === null ? [] : [{ url: entry.imageUrl, width: null }],
    icon: spotifyItemKinds[kind].icon,
    isArtist: kind === "artist",
    page: spotifyItemPages[kind](id),
  }
}

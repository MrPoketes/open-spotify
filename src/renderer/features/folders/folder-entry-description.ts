import {
  Disc3,
  Folder as FolderIcon,
  ListMusic,
  type LucideIcon,
  MicVocal,
  Music,
  Radio,
} from "lucide-react"
import type { FolderEntry } from "../../../shared/folders"
import { formatCount } from "../../ui/format-count"

type SpotifyItemKind = "playlist" | "artist" | "album" | "show" | "track"

type FolderEntryPage =
  | { readonly to: "/folder/$folderId"; readonly params: { readonly folderId: string } }
  | { readonly to: "/playlist/$playlistId"; readonly params: { readonly playlistId: string } }
  | { readonly to: "/artist/$artistId"; readonly params: { readonly artistId: string } }
  | { readonly to: "/album/$albumId"; readonly params: { readonly albumId: string } }
  | { readonly to: "/show/$showId"; readonly params: { readonly showId: string } }
  | { readonly to: "/track/$trackId"; readonly params: { readonly trackId: string } }

const spotifyItemKinds: Record<
  SpotifyItemKind,
  {
    readonly label: string
    readonly icon: LucideIcon
    readonly page: (id: string) => FolderEntryPage
  }
> = {
  playlist: {
    label: "Playlist",
    icon: ListMusic,
    page: (playlistId) => ({ to: "/playlist/$playlistId", params: { playlistId } }),
  },
  artist: {
    label: "Artist",
    icon: MicVocal,
    page: (artistId) => ({ to: "/artist/$artistId", params: { artistId } }),
  },
  album: {
    label: "Album",
    icon: Disc3,
    page: (albumId) => ({ to: "/album/$albumId", params: { albumId } }),
  },
  show: {
    label: "Show",
    icon: Radio,
    page: (showId) => ({ to: "/show/$showId", params: { showId } }),
  },
  track: {
    label: "Track",
    icon: Music,
    page: (trackId) => ({ to: "/track/$trackId", params: { trackId } }),
  },
}

const parseSpotifyUri = (uri: string) => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the folder tree's Schema only accepts URIs shaped spotify:<kind>:<id>, so the parts always have these types
  const [, kind, id] = uri.split(":") as [string, SpotifyItemKind, string]
  return { kind, id }
}

export interface FolderEntryDescription {
  readonly key: string
  readonly name: string
  readonly details: string
  readonly imageUrl: string | null
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
      imageUrl: null,
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
    imageUrl: entry.imageUrl,
    icon: spotifyItemKinds[kind].icon,
    isArtist: kind === "artist",
    page: spotifyItemKinds[kind].page(id),
  }
}

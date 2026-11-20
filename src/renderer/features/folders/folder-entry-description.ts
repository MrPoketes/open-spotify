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
import { formatItemCount } from "./format-item-count"

type SpotifyItemKind = "playlist" | "artist" | "album" | "show" | "track"

const spotifyItemKinds: Record<
  SpotifyItemKind,
  { readonly label: string; readonly icon: LucideIcon }
> = {
  playlist: { label: "Playlist", icon: ListMusic },
  artist: { label: "Artist", icon: MicVocal },
  album: { label: "Album", icon: Disc3 },
  show: { label: "Show", icon: Radio },
  track: { label: "Track", icon: Music },
}

const parseSpotifyUri = (uri: string) => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the folder tree's Schema only accepts URIs shaped spotify:<kind>:<id>, so the parts always have these types
  const [, kind, id] = uri.split(":") as [string, SpotifyItemKind, string]
  return { kind, id }
}

type FolderEntryPage =
  | { readonly to: "/folder/$folderId"; readonly params: { readonly folderId: string } }
  | { readonly to: "/show/$showId"; readonly params: { readonly showId: string } }

export interface FolderEntryDescription {
  readonly key: string
  readonly name: string
  readonly details: string
  readonly imageUrl: string | null
  readonly icon: LucideIcon
  readonly isArtist: boolean
  // Null for kinds whose page does not exist yet.
  readonly page: FolderEntryPage | null
}

export const describeFolderEntry = (entry: FolderEntry): FolderEntryDescription => {
  if (entry._tag === "Folder") {
    return {
      key: entry.id,
      name: entry.name,
      details: `Folder · ${formatItemCount(entry.entries.length)}`,
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
    page: kind === "show" ? { to: "/show/$showId", params: { showId: id } } : null,
  }
}

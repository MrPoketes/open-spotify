import { Disc3, ListMusic, MicVocal, Music, Radio, type LucideIcon } from "lucide-react"

export type SpotifyItemKind = "playlist" | "artist" | "album" | "show" | "track"

export const spotifyItemKinds: Record<
  SpotifyItemKind,
  { readonly label: string; readonly icon: LucideIcon }
> = {
  playlist: { label: "Playlist", icon: ListMusic },
  artist: { label: "Artist", icon: MicVocal },
  album: { label: "Album", icon: Disc3 },
  show: { label: "Show", icon: Radio },
  track: { label: "Track", icon: Music },
}

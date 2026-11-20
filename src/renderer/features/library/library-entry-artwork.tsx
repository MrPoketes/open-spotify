import { Disc3, Heart, ListMusic, type LucideIcon, MicVocal, Radio } from "lucide-react"
import type { LibraryEntryKind } from "../../../shared/library-layout"
import { Artwork } from "../../ui/artwork"
import type { Image } from "../spotify/spotify-image"

const placeholderIcons: Record<LibraryEntryKind, LucideIcon> = {
  "liked-songs": Heart,
  playlist: ListMusic,
  album: Disc3,
  artist: MicVocal,
  show: Radio,
}

interface LibraryEntryArtworkProps {
  readonly kind: LibraryEntryKind
  readonly images: ReadonlyArray<Image>
}

export function LibraryEntryArtwork({ kind, images }: LibraryEntryArtworkProps) {
  return (
    <Artwork
      sources={images}
      size={40}
      className={kind === "artist" ? "rounded-full" : "rounded-small"}
      placeholderIcon={placeholderIcons[kind]}
      placeholderColors={
        kind === "liked-songs" ? "bg-accent text-on-accent" : "bg-surface-raised text-muted"
      }
    />
  )
}
